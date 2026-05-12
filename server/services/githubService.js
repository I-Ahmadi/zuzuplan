import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { ISSUE_TYPE, PROJECT_PERMISSIONS, TASK_PRIORITY, TASK_STATUS } from '../utils/constants.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';
import { createActivityEvent } from './activityService.js';
import { createInboxItem } from './inboxService.js';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_SECRET = process.env.JWT_SECRET || 'zuzuplan-dev-state-secret';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', STATE_SECRET).update(value).digest('base64url');
}

function encodeState(payload) {
  const body = base64url(JSON.stringify({ ...payload, issuedAt: Date.now() }));
  return `${body}.${sign(body)}`;
}

function decodeState(state) {
  const [body, signature] = String(state || '').split('.');
  const expected = sign(body || '');
  if (!body || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AppError('Invalid GitHub OAuth state', 400);
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (Date.now() - payload.issuedAt > 10 * 60 * 1000) throw new AppError('GitHub OAuth state expired', 400);
  return payload;
}

async function requireIntegrationPermission(projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) throw new AppError('Project not found', 404);
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, PROJECT_PERMISSIONS.INTEGRATION_MANAGE)) {
    throw new AppError('Integration management permission required', 403);
  }
  return project;
}

export function getGitHubOAuthUrl(projectId, userId) {
  if (!process.env.GITHUB_CLIENT_ID) {
    throw new AppError('GitHub OAuth is not configured', 501);
  }
  if (!projectId) throw new AppError('Project ID is required', 400);
  const state = encodeState({ projectId, userId });
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: 'repo read:org workflow',
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params}`;
}

async function exchangeCode(code) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error || !data.access_token) {
    throw new AppError(data.error_description || 'GitHub OAuth token exchange failed', 400);
  }
  return data;
}

async function fetchGitHubJson(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': process.env.GITHUB_APP_NAME || 'zuzuplan',
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchGitHubPages(path, token, maxPages = 3) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const data = await fetchGitHubJson(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(data) || !data.length) break;
    items.push(...data);
    if (data.length < 100) break;
  }
  return items;
}

export async function completeGitHubOAuth(code, state) {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new AppError('GitHub OAuth is not configured', 501);
  }
  const payload = decodeState(state);
  await requireIntegrationPermission(payload.projectId, payload.userId);
  const token = await exchangeCode(code);
  const githubUser = await fetchGitHubJson('/user', token.access_token);
  const integration = await prisma.integration.create({
    data: {
      projectId: payload.projectId,
      provider: 'GITHUB',
      name: 'GitHub OAuth',
      status: 'CONNECTED',
      createdById: payload.userId,
      config: {
        authType: 'oauth',
        scope: token.scope,
        tokenType: token.token_type,
        accessToken: token.access_token,
        githubUser: githubUser ? { id: githubUser.id, login: githubUser.login, url: githubUser.html_url } : null,
        connectedAt: new Date().toISOString(),
      },
    },
  });
  await createActivityEvent({
    projectId: payload.projectId,
    actorId: payload.userId,
    type: 'github.oauth_connected',
    entityType: 'integration',
    entityId: integration.id,
    title: 'GitHub OAuth connected',
    description: 'A GitHub OAuth connection was added.',
    severity: 'SUCCESS',
  });
  return integration;
}

export function verifyGitHubSignature(rawBody, signatureHeader) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return { configured: false, valid: true };
  if (!signatureHeader?.startsWith('sha256=')) return { configured: true, valid: false };
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  if (Buffer.byteLength(signatureHeader) !== Buffer.byteLength(expected)) {
    return { configured: true, valid: false };
  }
  return {
    configured: true,
    valid: crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected)),
  };
}

function repositoryName(payload) {
  return payload.repository?.full_name || payload.repository?.name || '';
}

function normalizeGitHubRepository(repository) {
  if (!repository) return '';
  const trimmed = String(repository).trim().replace(/\.git$/i, '');
  const match = trimmed.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);
  if (match) return `${match[1]}/${match[2]}`;
  return trimmed.replace(/^\/+|\/+$/g, '');
}

async function findIntegrationForRepository(repository) {
  const normalizedRepository = normalizeGitHubRepository(repository);
  if (!normalizedRepository) return null;
  return prisma.integration.findFirst({
    where: {
      provider: 'GITHUB',
      status: { not: 'DISABLED' },
      OR: [
        { repository: normalizedRepository },
        { repository: `https://github.com/${normalizedRepository}` },
        { config: { path: ['repositories'], array_contains: normalizedRepository } },
      ],
    },
    include: { project: { select: { id: true, key: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

async function findLinkedIssue(projectId, projectKey, pullRequest) {
  const branch = pullRequest.head?.ref || '';
  const title = pullRequest.title || '';
  const body = pullRequest.body || '';
  const haystack = `${branch} ${title} ${body}`;
  const keyMatch = haystack.match(new RegExp(`${projectKey}-([a-zA-Z0-9]+)`, 'i'));
  const suffix = keyMatch?.[1]?.toLowerCase();

  const candidates = await prisma.task.findMany({
    where: {
      projectId,
      OR: [
        { branchName: branch },
        { title: { contains: branch, mode: 'insensitive' } },
        ...(suffix ? [{ id: { endsWith: suffix, mode: 'insensitive' } }] : []),
      ],
    },
    take: 5,
    orderBy: { updatedAt: 'desc' },
  });

  return candidates[0] || null;
}

async function findLinkedIssueByText(projectId, projectKey, text) {
  const keyMatch = String(text || '').match(new RegExp(`${projectKey}-([a-zA-Z0-9]+)`, 'i'));
  const suffix = keyMatch?.[1]?.toLowerCase();
  if (!suffix) return null;
  return prisma.task.findFirst({
    where: { projectId, id: { endsWith: suffix, mode: 'insensitive' } },
    orderBy: { updatedAt: 'desc' },
  });
}

function githubIssueMarker(repository, number) {
  return `GitHub issue: ${repository}#${number}`;
}

function inferIssueType(issue) {
  const labels = (issue.labels || []).map((label) => String(label.name || '').toLowerCase());
  if (labels.some((label) => label.includes('bug'))) return ISSUE_TYPE.BUG;
  if (labels.some((label) => label.includes('debt') || label.includes('refactor'))) return ISSUE_TYPE.TECH_DEBT;
  if (labels.some((label) => label.includes('chore'))) return ISSUE_TYPE.CHORE;
  if (labels.some((label) => label.includes('spike') || label.includes('research'))) return ISSUE_TYPE.SPIKE;
  if (labels.some((label) => label.includes('incident'))) return ISSUE_TYPE.INCIDENT;
  return ISSUE_TYPE.FEATURE;
}

function inferPriority(issue) {
  const labels = (issue.labels || []).map((label) => String(label.name || '').toLowerCase());
  if (labels.some((label) => label.includes('urgent') || label.includes('p0'))) return TASK_PRIORITY.URGENT;
  if (labels.some((label) => label.includes('high') || label.includes('p1'))) return TASK_PRIORITY.HIGH;
  if (labels.some((label) => label.includes('low') || label.includes('p3'))) return TASK_PRIORITY.LOW;
  return TASK_PRIORITY.MEDIUM;
}

async function getIntegrationSyncContext(projectId, integrationId, userId) {
  await requireIntegrationPermission(projectId, userId);
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, projectId, provider: 'GITHUB' },
    include: { project: { select: { id: true, key: true } } },
  });
  if (!integration) throw new AppError('GitHub integration not found', 404);
  if (!integration.repository) throw new AppError('Repository is required before syncing GitHub', 400);

  let token = integration.config?.accessToken;
  if (!token) {
    const oauthIntegrations = await prisma.integration.findMany({
      where: {
        projectId,
        provider: 'GITHUB',
        status: 'CONNECTED',
      },
      orderBy: { updatedAt: 'desc' },
    });
    const oauthIntegration = oauthIntegrations.find((item) => item.config?.accessToken);
    token = oauthIntegration?.config?.accessToken;
  }
  if (!token) throw new AppError('Connect GitHub OAuth before syncing this repository', 400);
  return { integration, token };
}

function githubStatusToPrState(pr) {
  if (pr.merged_at) return { status: 'MERGED', reviewState: 'MERGED' };
  if (pr.draft) return { status: 'DRAFT', reviewState: 'REQUESTED' };
  if (pr.state === 'closed') return { status: 'CLOSED', reviewState: 'REQUESTED' };
  return { status: 'OPEN', reviewState: 'REQUESTED' };
}

function prState(action, pr) {
  if (pr.merged || action === 'closed' && pr.merged_at) return { status: 'MERGED', reviewState: 'MERGED', issueStatus: TASK_STATUS.MERGED };
  if (pr.draft) return { status: 'DRAFT', reviewState: 'REQUESTED', issueStatus: TASK_STATUS.IN_REVIEW };
  if (action === 'closed') return { status: 'CLOSED', reviewState: 'REQUESTED', issueStatus: null };
  return { status: 'OPEN', reviewState: 'REQUESTED', issueStatus: TASK_STATUS.IN_REVIEW };
}

function checkStatus(payload) {
  const conclusion = payload.check_run?.conclusion || payload.check_suite?.conclusion || payload.workflow_run?.conclusion;
  const status = payload.check_run?.status || payload.check_suite?.status || payload.workflow_run?.status;
  if (conclusion === 'success') return 'SUCCESS';
  if (conclusion && conclusion !== 'success') return 'FAILED';
  if (status === 'completed') return 'UNKNOWN';
  if (status) return 'PENDING';
  return 'UNKNOWN';
}

async function notifyAssignee(task, activity, title, description, priority = 'NORMAL', type = 'github') {
  if (!task?.assigneeId) return;
  await createInboxItem({
    userId: task.assigneeId,
    projectId: task.projectId,
    taskId: task.id,
    activityEventId: activity.id,
    type,
    title,
    description,
    priority,
    actionUrl: `/spaces/${task.projectId}/issues/${task.id}`,
    source: 'github',
  });
}

export async function handlePullRequestEvent(payload) {
  const repository = repositoryName(payload);
  const integration = await findIntegrationForRepository(repository);
  if (!integration) return { ignored: true, reason: 'No matching GitHub integration repository' };

  const pr = payload.pull_request;
  const linkedIssue = await findLinkedIssue(integration.projectId, integration.project.key, pr);
  const state = prState(payload.action, pr);
  const item = await prisma.pullRequest.upsert({
    where: {
      projectId_provider_repository_number: {
        projectId: integration.projectId,
        provider: 'GITHUB',
        repository,
        number: pr.number,
      },
    },
    create: {
      projectId: integration.projectId,
      taskId: linkedIssue?.id || null,
      integrationId: integration.id,
      provider: 'GITHUB',
      repository,
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      branch: pr.head?.ref || null,
      targetBranch: pr.base?.ref || null,
      author: pr.user?.login || null,
      openedAt: pr.created_at ? new Date(pr.created_at) : new Date(),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      status: state.status,
      reviewState: state.reviewState,
    },
    update: {
      taskId: linkedIssue?.id || undefined,
      title: pr.title,
      url: pr.html_url,
      branch: pr.head?.ref || null,
      targetBranch: pr.base?.ref || null,
      author: pr.user?.login || null,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      status: state.status,
      reviewState: state.reviewState,
    },
  });

  let task = linkedIssue;
  if (task && state.issueStatus) {
    task = await prisma.task.update({ where: { id: task.id }, data: { status: state.issueStatus, mergedAt: state.issueStatus === TASK_STATUS.MERGED ? new Date() : undefined } });
  }

  const activity = await createActivityEvent({
    projectId: integration.projectId,
    taskId: task?.id || null,
    type: payload.action === 'opened' ? 'github.pr_opened' : 'github.pr_updated',
    entityType: 'pull_request',
    entityId: item.id,
    title: `PR #${pr.number}: ${pr.title}`,
    description: `${repository} pull request ${payload.action}`,
    severity: state.status === 'MERGED' ? 'SUCCESS' : 'INFO',
    metadata: { repository, action: payload.action, status: state.status, branch: pr.head?.ref },
  });
  await notifyAssignee(task, activity, `PR ${state.status.toLowerCase()}: ${task?.title || pr.title}`, `${repository}#${pr.number} ${payload.action}.`, 'NORMAL', 'pull_request');
  return { processed: true, pullRequest: item.id, taskId: task?.id || null };
}

export async function handlePullRequestReviewEvent(payload) {
  const repository = repositoryName(payload);
  const integration = await findIntegrationForRepository(repository);
  if (!integration) return { ignored: true, reason: 'No matching GitHub integration repository' };
  const reviewState = payload.review?.state === 'approved' ? 'APPROVED' : payload.review?.state === 'changes_requested' ? 'CHANGES_REQUESTED' : 'REQUESTED';
  const pr = await prisma.pullRequest.findUnique({
    where: { projectId_provider_repository_number: { projectId: integration.projectId, provider: 'GITHUB', repository, number: payload.pull_request.number } },
    include: { task: true },
  });
  if (!pr) return { ignored: true, reason: 'Pull request not tracked yet' };
  const updated = await prisma.pullRequest.update({ where: { id: pr.id }, data: { reviewState } });
  let task = pr.task;
  if (task && reviewState === 'APPROVED') {
    task = await prisma.task.update({ where: { id: task.id }, data: { status: TASK_STATUS.READY_TO_MERGE } });
  }
  const activity = await createActivityEvent({
    projectId: integration.projectId,
    taskId: task?.id || null,
    type: 'github.pr_review',
    entityType: 'pull_request',
    entityId: pr.id,
    title: `Review ${reviewState.toLowerCase().replaceAll('_', ' ')}`,
    description: `${repository}#${pr.number}`,
    severity: reviewState === 'APPROVED' ? 'SUCCESS' : reviewState === 'CHANGES_REQUESTED' ? 'WARNING' : 'INFO',
    metadata: { reviewState },
  });
  await notifyAssignee(task, activity, `PR review: ${reviewState}`, `${repository}#${pr.number} review state changed.`, reviewState === 'CHANGES_REQUESTED' ? 'HIGH' : 'NORMAL', 'pull_request_review');
  return { processed: true, pullRequest: updated.id, taskId: task?.id || null };
}

export async function handleCheckEvent(event, payload) {
  const repository = repositoryName(payload);
  const integration = await findIntegrationForRepository(repository);
  if (!integration) return { ignored: true, reason: 'No matching GitHub integration repository' };
  const branch = payload.check_run?.check_suite?.head_branch || payload.check_suite?.head_branch || payload.workflow_run?.head_branch;
  const prs = payload.check_run?.pull_requests || payload.check_suite?.pull_requests || payload.workflow_run?.pull_requests || [];
  const number = prs[0]?.number;
  const status = checkStatus(payload);
  const pr = number ? await prisma.pullRequest.findUnique({
    where: { projectId_provider_repository_number: { projectId: integration.projectId, provider: 'GITHUB', repository, number } },
    include: { task: true },
  }) : await prisma.pullRequest.findFirst({ where: { projectId: integration.projectId, repository, branch }, include: { task: true }, orderBy: { updatedAt: 'desc' } });
  if (!pr) return { ignored: true, reason: 'No matching pull request for check event' };
  const updated = await prisma.pullRequest.update({ where: { id: pr.id }, data: { ciStatus: status } });
  const activity = await createActivityEvent({
    projectId: integration.projectId,
    taskId: pr.taskId,
    type: 'github.check_status',
    entityType: 'pull_request',
    entityId: pr.id,
    title: `CI ${status.toLowerCase()}`,
    description: `${repository}#${pr.number}`,
    severity: status === 'FAILED' ? 'CRITICAL' : status === 'SUCCESS' ? 'SUCCESS' : 'INFO',
    metadata: { event, ciStatus: status },
  });
  await notifyAssignee(pr.task, activity, `CI ${status.toLowerCase()}: ${pr.task?.title || pr.title}`, `${repository}#${pr.number} checks are ${status}.`, status === 'FAILED' ? 'URGENT' : 'NORMAL', 'ci_status');
  return { processed: true, pullRequest: updated.id, ciStatus: status };
}

export async function handleDeploymentEvent(payload) {
  const repository = repositoryName(payload);
  const integration = await findIntegrationForRepository(repository);
  if (!integration) return { ignored: true, reason: 'No matching GitHub integration repository' };
  const deploymentPayload = payload.deployment_status || payload.deployment;
  const environment = deploymentPayload?.environment || payload.deployment?.environment || 'staging';
  const rawState = deploymentPayload?.state || 'pending';
  const status = rawState === 'success' ? 'SUCCESS' : rawState === 'failure' || rawState === 'error' ? 'FAILED' : rawState === 'in_progress' ? 'RUNNING' : 'PENDING';
  const branch = payload.deployment?.ref || payload.workflow_run?.head_branch;
  const pr = await prisma.pullRequest.findFirst({ where: { projectId: integration.projectId, repository, branch }, include: { task: true }, orderBy: { updatedAt: 'desc' } });
  const deployment = await prisma.deployment.create({
    data: {
      projectId: integration.projectId,
      taskId: pr?.taskId || null,
      pullRequestId: pr?.id || null,
      integrationId: integration.id,
      environment,
      status,
      url: deploymentPayload?.target_url || deploymentPayload?.environment_url || null,
      deployedBy: payload.sender?.login || null,
      deployedAt: status === 'SUCCESS' ? new Date() : null,
      version: payload.deployment?.sha || null,
    },
  });
  let task = pr?.task || null;
  if (task && status === 'SUCCESS') {
    task = await prisma.task.update({ where: { id: task.id }, data: { status: TASK_STATUS.DEPLOYED, deployedAt: new Date() } });
  }
  const activity = await createActivityEvent({
    projectId: integration.projectId,
    taskId: task?.id || null,
    type: 'github.deployment',
    entityType: 'deployment',
    entityId: deployment.id,
    title: `${environment} deployment ${status.toLowerCase()}`,
    description: repository,
    severity: status === 'FAILED' ? 'CRITICAL' : status === 'SUCCESS' ? 'SUCCESS' : 'INFO',
    metadata: { repository, environment, status },
  });
  await notifyAssignee(task, activity, `Deployment ${status.toLowerCase()}: ${task?.title || repository}`, `${environment} deployment is ${status}.`, status === 'FAILED' ? 'URGENT' : 'NORMAL', 'deployment');
  return { processed: true, deployment: deployment.id, taskId: task?.id || null };
}

export async function handleInstallationEvent(payload) {
  const installationId = payload.installation?.id ? String(payload.installation.id) : null;
  const repositories = (payload.repositories || payload.repositories_added || [])
    .map((repo) => repo.full_name)
    .filter(Boolean);
  if (!installationId && !repositories.length) return { ignored: true, reason: 'No installation metadata' };

  const integrations = await prisma.integration.findMany({
    where: {
      provider: 'GITHUB',
      OR: [
        ...(installationId ? [{ externalId: installationId }] : []),
        ...(repositories.length ? [{ repository: { in: repositories } }] : []),
      ],
    },
  });

  await Promise.all(integrations.map((integration) => prisma.integration.update({
    where: { id: integration.id },
    data: {
      externalId: installationId || integration.externalId,
      config: {
        ...(integration.config || {}),
        authType: 'github_app',
        installationId: installationId || integration.config?.installationId,
        repositories: Array.from(new Set([...(integration.config?.repositories || []), ...repositories])),
        installationAction: payload.action,
        installationUpdatedAt: new Date().toISOString(),
      },
    },
  })));

  return { processed: true, updatedIntegrations: integrations.length, repositories };
}

export async function syncGitHubRepository(projectId, integrationId, userId) {
  const { integration, token } = await getIntegrationSyncContext(projectId, integrationId, userId);
  const repository = normalizeGitHubRepository(integration.repository);
  if (repository !== integration.repository) {
    await prisma.integration.update({ where: { id: integration.id }, data: { repository } });
  }
  const encodedRepository = repository.split('/').map(encodeURIComponent).join('/');

  const [githubIssues, githubPulls, githubReleases, githubDeployments] = await Promise.all([
    fetchGitHubPages(`/repos/${encodedRepository}/issues?state=open`, token, 2),
    fetchGitHubPages(`/repos/${encodedRepository}/pulls?state=all&sort=updated&direction=desc`, token, 2),
    fetchGitHubPages(`/repos/${encodedRepository}/releases`, token, 1),
    fetchGitHubPages(`/repos/${encodedRepository}/deployments`, token, 1),
  ]);

  const issues = githubIssues.filter((issue) => !issue.pull_request);
  let createdIssues = 0;
  let updatedIssues = 0;
  let importedPullRequests = 0;
  let linkedPullRequests = 0;
  let importedReleases = 0;
  let importedDeployments = 0;

  const issueMap = new Map();

  for (const issue of issues) {
    const marker = githubIssueMarker(repository, issue.number);
    const existing = await prisma.task.findFirst({
      where: {
        projectId,
        OR: [
          { description: { contains: marker, mode: 'insensitive' } },
          { description: { contains: issue.html_url, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
    const descriptionParts = [
      issue.body || '',
      '',
      `---`,
      `${marker}`,
      `Source: ${issue.html_url}`,
      issue.user?.login ? `GitHub author: ${issue.user.login}` : null,
    ].filter(Boolean);

    if (existing) {
      const updated = await prisma.task.update({
        where: { id: existing.id },
        data: {
          title: issue.title,
          description: descriptionParts.join('\n'),
          type: inferIssueType(issue),
          priority: inferPriority(issue),
        },
      });
      issueMap.set(issue.number, updated);
      updatedIssues += 1;
    } else {
      const created = await prisma.task.create({
        data: {
          title: issue.title,
          description: descriptionParts.join('\n'),
          projectId,
          createdById: userId,
          type: inferIssueType(issue),
          priority: inferPriority(issue),
          status: TASK_STATUS.BACKLOG,
          backlogOrder: Date.now() + createdIssues,
        },
      });
      issueMap.set(issue.number, created);
      createdIssues += 1;
    }
  }

  for (const pr of githubPulls) {
    const linkedFromIssueNumber = issueMap.get(pr.number);
    const linkedFromText = await findLinkedIssueByText(projectId, integration.project.key, `${pr.head?.ref || ''} ${pr.title || ''} ${pr.body || ''}`);
    const linkedIssue = linkedFromIssueNumber || linkedFromText;
    const state = githubStatusToPrState(pr);
    const item = await prisma.pullRequest.upsert({
      where: {
        projectId_provider_repository_number: {
          projectId,
          provider: 'GITHUB',
          repository,
          number: pr.number,
        },
      },
      create: {
        projectId,
        taskId: linkedIssue?.id || null,
        integrationId: integration.id,
        provider: 'GITHUB',
        repository,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        branch: pr.head?.ref || null,
        targetBranch: pr.base?.ref || null,
        author: pr.user?.login || null,
        openedAt: pr.created_at ? new Date(pr.created_at) : null,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        status: state.status,
        reviewState: state.reviewState,
      },
      update: {
        taskId: linkedIssue?.id || undefined,
        integrationId: integration.id,
        title: pr.title,
        url: pr.html_url,
        branch: pr.head?.ref || null,
        targetBranch: pr.base?.ref || null,
        author: pr.user?.login || null,
        openedAt: pr.created_at ? new Date(pr.created_at) : null,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        status: state.status,
        reviewState: state.reviewState,
      },
    });
    importedPullRequests += 1;
    if (item.taskId) linkedPullRequests += 1;
  }

  for (const release of githubReleases) {
    const version = release.tag_name || release.name;
    const existing = await prisma.release.findFirst({
      where: {
        projectId,
        OR: [
          ...(version ? [{ version }] : []),
          { summary: { contains: release.html_url, mode: 'insensitive' } },
        ],
      },
    });
    const summary = [release.body || '', release.html_url ? `Source: ${release.html_url}` : null].filter(Boolean).join('\n\n');
    const status = release.draft ? 'PLANNED' : release.prerelease ? 'SHIPPING' : 'SHIPPED';
    if (existing) {
      await prisma.release.update({
        where: { id: existing.id },
        data: {
          title: release.name || release.tag_name || existing.title,
          version: version || existing.version,
          status,
          summary: summary || existing.summary,
          shippedAt: release.published_at ? new Date(release.published_at) : existing.shippedAt,
        },
      });
    } else {
      await prisma.release.create({
        data: {
          projectId,
          title: release.name || release.tag_name || `GitHub release ${release.id}`,
          version: version || null,
          status,
          summary: summary || null,
          createdById: userId,
          shippedAt: release.published_at ? new Date(release.published_at) : null,
        },
      });
      importedReleases += 1;
    }
  }

  for (const deployment of githubDeployments) {
    const existing = await prisma.deployment.findFirst({
      where: {
        projectId,
        integrationId: integration.id,
        version: deployment.sha || null,
        environment: deployment.environment || 'staging',
      },
    });
    if (existing) continue;
    const pr = await prisma.pullRequest.findFirst({
      where: { projectId, repository, branch: deployment.ref },
      orderBy: { updatedAt: 'desc' },
    });
    await prisma.deployment.create({
      data: {
        projectId,
        taskId: pr?.taskId || null,
        pullRequestId: pr?.id || null,
        integrationId: integration.id,
        environment: deployment.environment || 'staging',
        status: 'PENDING',
        version: deployment.sha || null,
        url: deployment.url || null,
        deployedBy: deployment.creator?.login || null,
        deployedAt: deployment.created_at ? new Date(deployment.created_at) : null,
      },
    });
    importedDeployments += 1;
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      status: 'CONNECTED',
      config: {
        ...(integration.config || {}),
        lastSyncAt: new Date().toISOString(),
        lastSyncSummary: { createdIssues, updatedIssues, importedPullRequests, linkedPullRequests, importedReleases, importedDeployments },
      },
    },
  });

  await createActivityEvent({
    projectId,
    actorId: userId,
    type: 'github.repository_synced',
    entityType: 'integration',
    entityId: integration.id,
    title: 'GitHub repository synced',
    description: `${repository}: ${createdIssues} issues created, ${updatedIssues} issues updated, ${importedPullRequests} pull requests, ${importedReleases} releases, ${importedDeployments} deployments imported.`,
    severity: 'SUCCESS',
    metadata: { repository, createdIssues, updatedIssues, importedPullRequests, linkedPullRequests, importedReleases, importedDeployments },
  });

  return { repository, createdIssues, updatedIssues, importedPullRequests, linkedPullRequests, importedReleases, importedDeployments };
}

export async function handleGitHubWebhook(event, payload) {
  if (event === 'ping') return { processed: true, event };
  if (event === 'installation' || event === 'installation_repositories') return handleInstallationEvent(payload);
  if (event === 'pull_request') return handlePullRequestEvent(payload);
  if (event === 'pull_request_review') return handlePullRequestReviewEvent(payload);
  if (['check_run', 'check_suite', 'workflow_run'].includes(event)) return handleCheckEvent(event, payload);
  if (['deployment', 'deployment_status'].includes(event)) return handleDeploymentEvent(payload);
  return { ignored: true, reason: `Unhandled GitHub event ${event}` };
}
