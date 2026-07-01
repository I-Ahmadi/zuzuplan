import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';
import { createActivityEvent } from './activityService.js';

const TASK_SUMMARY_SELECT = { id: true, title: true, type: true, status: true, priority: true };
const PULL_REQUEST_SELECT = {
  id: true,
  projectId: true,
  taskId: true,
  provider: true,
  repository: true,
  number: true,
  title: true,
  url: true,
  branch: true,
  targetBranch: true,
  status: true,
  reviewState: true,
  ciStatus: true,
  author: true,
  openedAt: true,
  mergedAt: true,
  createdAt: true,
  updatedAt: true,
  task: { select: TASK_SUMMARY_SELECT },
};
const DEPLOYMENT_SELECT = {
  id: true,
  projectId: true,
  taskId: true,
  pullRequestId: true,
  environment: true,
  status: true,
  version: true,
  url: true,
  deployedBy: true,
  deployedAt: true,
  createdAt: true,
  updatedAt: true,
  task: { select: TASK_SUMMARY_SELECT },
  pullRequest: { select: { id: true, title: true, repository: true, number: true } },
};

async function getProject(projectId, userId, permission = PROJECT_PERMISSIONS.DELIVERY_READ) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) throw new AppError('Project not found', 404);
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) throw new AppError('Insufficient project permission', 403);
  return project;
}

function pagination(filters) {
  const { page, limit } = getPageAndLimit(filters);
  return { page, limit, skip: getSkip(page, limit) };
}

async function list(model, projectId, userId, filters, select, searchFields = []) {
  await getProject(projectId, userId);
  const { page, limit, skip } = pagination(filters);
  const where = { projectId };
  if (filters.status) where.status = filters.status;
  if (filters.environment) where.environment = filters.environment;
  if (filters.reviewState) where.reviewState = filters.reviewState;
  if (filters.ciStatus) where.ciStatus = filters.ciStatus;
  if (filters.search && searchFields.length) {
    where.OR = searchFields.map((field) => ({ [field]: { contains: filters.search, mode: 'insensitive' } }));
  }
  const delegate = prisma[model];
  const [items, total] = await Promise.all([
    delegate.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, select }),
    delegate.count({ where }),
  ]);
  return createPaginationResult(items, total, page, limit);
}

export async function listPullRequests(projectId, userId, filters = {}) {
  return list('pullRequest', projectId, userId, filters, PULL_REQUEST_SELECT, ['title', 'repository', 'branch', 'author']);
}

export async function createPullRequest(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.DELIVERY_WRITE);
  const pr = await prisma.pullRequest.create({
    data: {
      projectId,
      taskId: data.taskId || null,
      provider: data.provider || 'MANUAL',
      repository: data.repository,
      number: Number(data.number),
      title: data.title,
      url: data.url || null,
      branch: data.branch || null,
      targetBranch: data.targetBranch || null,
      status: data.status || 'OPEN',
      reviewState: data.reviewState || 'REQUESTED',
      ciStatus: data.ciStatus || 'UNKNOWN',
      author: data.author || null,
      openedAt: data.openedAt ? new Date(data.openedAt) : new Date(),
      mergedAt: data.mergedAt ? new Date(data.mergedAt) : null,
    },
    select: PULL_REQUEST_SELECT,
  });
  await createActivityEvent({
    projectId,
    taskId: pr.taskId,
    actorId: userId,
    type: 'pull_request.created',
    entityType: 'pull_request',
    entityId: pr.id,
    title: 'Pull request linked',
    description: pr.title,
    metadata: { repository: pr.repository, number: pr.number, status: pr.status },
  });
  return pr;
}

export async function updatePullRequest(projectId, id, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.DELIVERY_WRITE);
  const current = await prisma.pullRequest.findFirst({ where: { id, projectId } });
  if (!current) throw new AppError('Pull request not found', 404);
  const pr = await prisma.pullRequest.update({
    where: { id },
    data: {
      taskId: data.taskId !== undefined ? data.taskId || null : undefined,
      status: data.status,
      reviewState: data.reviewState,
      ciStatus: data.ciStatus,
      mergedAt: data.status === 'MERGED' && !current.mergedAt ? new Date() : data.mergedAt ? new Date(data.mergedAt) : undefined,
    },
    select: PULL_REQUEST_SELECT,
  });
  await createActivityEvent({
    projectId,
    taskId: pr.taskId,
    actorId: userId,
    type: 'pull_request.updated',
    entityType: 'pull_request',
    entityId: pr.id,
    title: 'Pull request updated',
    description: `${pr.repository}#${pr.number} is ${pr.status}`,
    metadata: { reviewState: pr.reviewState, ciStatus: pr.ciStatus },
  });
  return pr;
}

export async function listDeployments(projectId, userId, filters = {}) {
  return list('deployment', projectId, userId, filters, DEPLOYMENT_SELECT, ['version', 'url', 'deployedBy']);
}

export async function createDeployment(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.DELIVERY_WRITE);
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      taskId: data.taskId || null,
      pullRequestId: data.pullRequestId || null,
      environment: data.environment || 'staging',
      status: data.status || 'PENDING',
      version: data.version || null,
      url: data.url || null,
      deployedBy: data.deployedBy || null,
      deployedAt: data.deployedAt ? new Date(data.deployedAt) : null,
    },
    select: DEPLOYMENT_SELECT,
  });
  await createActivityEvent({
    projectId,
    taskId: deployment.taskId,
    actorId: userId,
    type: 'deployment.created',
    entityType: 'deployment',
    entityId: deployment.id,
    title: 'Deployment recorded',
    description: `${deployment.environment} deployment is ${deployment.status}`,
    severity: deployment.status === 'FAILED' ? 'CRITICAL' : deployment.status === 'SUCCESS' ? 'SUCCESS' : 'INFO',
    metadata: { environment: deployment.environment, status: deployment.status, version: deployment.version },
  });
  return deployment;
}

export async function updateDeployment(projectId, id, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.DELIVERY_WRITE);
  const deployment = await prisma.deployment.findFirst({ where: { id, projectId } });
  if (!deployment) throw new AppError('Deployment not found', 404);
  return prisma.deployment.update({
    where: { id },
    data: {
      status: data.status,
      environment: data.environment,
      version: data.version,
      url: data.url,
      deployedBy: data.deployedBy,
      deployedAt: data.deployedAt ? new Date(data.deployedAt) : undefined,
    },
    select: DEPLOYMENT_SELECT,
  });
}
