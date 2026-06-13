import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityEvent } from './activityService.js';
import { createPaginationResult, getPageAndLimit, getSkip } from '../utils/pagination.js';
import { ROLES } from '../utils/constants.js';
import { normalizeRole } from '../utils/permissions.js';

export const IDEA_STAGES = ['CAPTURED', 'EXPLORING', 'PLANNING', 'VALIDATING', 'EXPERIMENTING', 'FINALIZED', 'CONVERTED', 'ARCHIVED'];
export const IDEA_SECTION_TYPES = ['NOTE', 'RESEARCH', 'REQUIREMENTS', 'STRATEGY', 'RISKS', 'ROADMAP'];
export const IDEA_EXPERIMENT_STATUSES = ['PLANNED', 'RUNNING', 'VALIDATED', 'INVALIDATED', 'INCONCLUSIVE'];
export const IDEA_REQUIREMENT_TYPES = ['REQUIREMENT', 'ASSUMPTION', 'RISK', 'TASK', 'ROADMAP_ITEM'];
export const IDEA_GOAL_STATUSES = ['ACTIVE', 'MET', 'PAUSED', 'DROPPED'];
export const IDEA_LINK_TARGET_TYPES = ['URL', 'PROJECT', 'TASK', 'DOC'];

const userSelect = { id: true, name: true, email: true, avatar: true };
const manageRoles = new Set([ROLES.ADMIN, ROLES.MANAGER]);
const editRoles = new Set([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]);

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20);
  if (typeof tags === 'string') return tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
  return [];
}

function normalizeConfidence(value, fallback = 25) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeEditorText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(normalizeEditorText).filter(Boolean).join('\n').trim();
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    return Object.values(value).map(normalizeEditorText).filter(Boolean).join('\n').trim();
  }
  return String(value);
}

function roleForIdea(idea, userId) {
  if (!idea) return null;
  if (idea.ownerId === userId) return ROLES.ADMIN;
  const member = idea.members?.find((item) => item.userId === userId);
  return normalizeRole(member?.role);
}

function assertIdeaPermission(idea, userId, permission = 'read') {
  const role = roleForIdea(idea, userId);
  if (!role) throw new AppError('Idea workspace not found', 404);
  if (permission === 'manage' && !manageRoles.has(role)) throw new AppError('Insufficient idea permission', 403);
  if (permission === 'edit' && !editRoles.has(role)) throw new AppError('Insufficient idea permission', 403);
  return role;
}

function assertWritableIdea(idea, userId, permission = 'edit') {
  const role = assertIdeaPermission(idea, userId, permission);
  if (idea.stage === 'CONVERTED' && !manageRoles.has(role)) {
    throw new AppError('Converted ideas are read-only for non-managers', 403);
  }
  return role;
}

async function getIdeaAccess(ideaId, userId) {
  const idea = await prisma.ideaWorkspace.findUnique({
    where: { id: ideaId },
    include: { members: true },
  });
  if (!idea) throw new AppError('Idea workspace not found', 404);
  assertIdeaPermission(idea, userId);
  return idea;
}

function ideaInclude() {
  return {
    owner: { select: userSelect },
    convertedProject: { select: { id: true, name: true, key: true } },
    members: { include: { user: { select: userSelect } }, orderBy: { createdAt: 'asc' } },
    sections: { orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }], include: { updatedBy: { select: userSelect } } },
    goals: { orderBy: { updatedAt: 'desc' } },
    requirements: { orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] },
    experiments: { orderBy: { updatedAt: 'desc' }, include: { owner: { select: userSelect } } },
    links: { orderBy: { updatedAt: 'desc' } },
    _count: { select: { comments: true, versions: true, experiments: true, requirements: true, goals: true } },
  };
}

function withRole(idea, userId) {
  return {
    ...idea,
    currentUserRole: roleForIdea(idea, userId),
    currentUserCanManage: manageRoles.has(roleForIdea(idea, userId)),
    currentUserCanEdit: editRoles.has(roleForIdea(idea, userId)),
  };
}

export async function listIdeas(userId, filters = {}) {
  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  if (filters.stage) where.stage = filters.stage;
  if (filters.tag) where.tags = { has: filters.tag };
  if (filters.search) {
    const search = String(filters.search).trim();
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { problem: { contains: search, mode: 'insensitive' } },
          { opportunity: { contains: search, mode: 'insensitive' } },
          { sections: { some: { plainText: { contains: search, mode: 'insensitive' } } } },
          { requirements: { some: { title: { contains: search, mode: 'insensitive' } } } },
          { experiments: { some: { title: { contains: search, mode: 'insensitive' } } } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.ideaWorkspace.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: userSelect },
        convertedProject: { select: { id: true, name: true, key: true } },
        _count: { select: { comments: true, sections: true, requirements: true, experiments: true, goals: true } },
      },
    }),
    prisma.ideaWorkspace.count({ where }),
  ]);

  return createPaginationResult(items.map((idea) => withRole({ ...idea, members: [] }, userId)), total, page, limit);
}

export async function createIdea(userId, data) {
  const title = String(data.title || '').trim();
  if (!title) throw new AppError('Idea title is required', 400);

  const idea = await prisma.ideaWorkspace.create({
    data: {
      title,
      summary: data.summary || null,
      problem: data.problem || null,
      opportunity: data.opportunity || null,
      stage: data.stage && IDEA_STAGES.includes(data.stage) ? data.stage : 'CAPTURED',
      confidence: normalizeConfidence(data.confidence),
      tags: normalizeTags(data.tags),
      ownerId: userId,
      members: { create: { userId, role: ROLES.ADMIN } },
      sections: {
        create: [
          { type: 'NOTE', title: 'Raw notes', order: 1, plainText: '', updatedById: userId },
          { type: 'RESEARCH', title: 'Research', order: 2, plainText: '', updatedById: userId },
          { type: 'ROADMAP', title: 'Roadmap sketch', order: 3, plainText: '', updatedById: userId },
        ],
      },
    },
    include: ideaInclude(),
  });

  await createActivityEvent({
    actorId: userId,
    type: 'idea.created',
    entityType: 'IDEA',
    entityId: idea.id,
    title: `Created idea: ${idea.title}`,
  });

  return withRole(idea, userId);
}

export async function getIdeaById(ideaId, userId) {
  const access = await getIdeaAccess(ideaId, userId);
  const idea = await prisma.ideaWorkspace.findUnique({ where: { id: access.id }, include: ideaInclude() });
  return withRole(idea, userId);
}

export async function updateIdea(ideaId, userId, data) {
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');

  const updateData = {};
  if (data.title != null) updateData.title = String(data.title).trim();
  if (data.summary !== undefined) updateData.summary = data.summary || null;
  if (data.problem !== undefined) updateData.problem = data.problem || null;
  if (data.opportunity !== undefined) updateData.opportunity = data.opportunity || null;
  if (data.stage != null) {
    if (!IDEA_STAGES.includes(data.stage)) throw new AppError('Invalid idea stage', 400);
    updateData.stage = data.stage;
  }
  if (data.confidence !== undefined) updateData.confidence = normalizeConfidence(data.confidence, idea.confidence);
  if (data.tags !== undefined) updateData.tags = normalizeTags(data.tags);

  if (updateData.title === '') throw new AppError('Idea title is required', 400);

  await prisma.ideaWorkspace.update({ where: { id: ideaId }, data: updateData });
  return getIdeaById(ideaId, userId);
}

export async function deleteIdea(ideaId, userId) {
  const idea = await getIdeaAccess(ideaId, userId);
  assertIdeaPermission(idea, userId, 'manage');
  await prisma.ideaWorkspace.delete({ where: { id: ideaId } });
}

export async function archiveIdea(ideaId, userId) {
  return updateIdea(ideaId, userId, { stage: 'ARCHIVED' });
}

export async function finalizeIdea(ideaId, userId) {
  return updateIdea(ideaId, userId, { stage: 'FINALIZED' });
}

export async function listSections(ideaId, userId) {
  await getIdeaAccess(ideaId, userId);
  return prisma.ideaSection.findMany({ where: { ideaId }, orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }], include: { updatedBy: { select: userSelect } } });
}

export async function createSection(ideaId, userId, data) {
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const contentJson = data.contentJson || null;
  return prisma.ideaSection.create({
    data: {
      ideaId,
      type: IDEA_SECTION_TYPES.includes(data.type) ? data.type : 'NOTE',
      title: String(data.title || 'Untitled section').trim(),
      contentJson,
      plainText: data.plainText || normalizeEditorText(contentJson),
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
      updatedById: userId,
    },
    include: { updatedBy: { select: userSelect } },
  });
}

export async function updateSection(ideaId, sectionId, userId, data) {
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const section = await prisma.ideaSection.findFirst({ where: { id: sectionId, ideaId } });
  if (!section) throw new AppError('Idea section not found', 404);

  const updateData = { updatedById: userId };
  if (data.type != null) updateData.type = IDEA_SECTION_TYPES.includes(data.type) ? data.type : section.type;
  if (data.title != null) updateData.title = String(data.title).trim();
  if (data.contentJson !== undefined) {
    updateData.contentJson = data.contentJson || null;
    updateData.plainText = data.plainText || normalizeEditorText(data.contentJson);
  } else if (data.plainText !== undefined) {
    updateData.plainText = data.plainText || '';
  }
  if (data.order !== undefined && Number.isFinite(Number(data.order))) updateData.order = Number(data.order);
  if (updateData.title === '') throw new AppError('Section title is required', 400);

  return prisma.ideaSection.update({
    where: { id: sectionId },
    data: updateData,
    include: { updatedBy: { select: userSelect } },
  });
}

async function snapshotIdea(ideaId) {
  return prisma.ideaWorkspace.findUnique({
    where: { id: ideaId },
    include: {
      owner: { select: userSelect },
      members: { include: { user: { select: userSelect } } },
      sections: { orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }] },
      goals: true,
      requirements: true,
      experiments: true,
      links: true,
    },
  });
}

export async function createVersion(ideaId, userId, data = {}) {
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const snapshot = await snapshotIdea(ideaId);
  return prisma.ideaVersion.create({
    data: {
      ideaId,
      label: String(data.label || `${idea.title} snapshot`).trim(),
      snapshotJson: snapshot,
      createdById: userId,
    },
    include: { createdBy: { select: userSelect } },
  });
}

export async function listVersions(ideaId, userId) {
  await getIdeaAccess(ideaId, userId);
  return prisma.ideaVersion.findMany({
    where: { ideaId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: userSelect } },
  });
}

export async function restoreVersionPreview(ideaId, versionId, userId) {
  await getIdeaAccess(ideaId, userId);
  const version = await prisma.ideaVersion.findFirst({
    where: { id: versionId, ideaId },
    include: { createdBy: { select: userSelect } },
  });
  if (!version) throw new AppError('Idea version not found', 404);
  return { version, snapshot: version.snapshotJson };
}

function collectionConfig(kind) {
  return {
    goals: { model: prisma.ideaGoal, title: 'Goal', defaults: { status: 'ACTIVE' }, allowed: { status: IDEA_GOAL_STATUSES } },
    requirements: { model: prisma.ideaRequirement, title: 'Requirement', defaults: { type: 'REQUIREMENT', priority: 'MEDIUM' }, allowed: { type: IDEA_REQUIREMENT_TYPES, priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] } },
    experiments: { model: prisma.ideaExperiment, title: 'Experiment', defaults: { status: 'PLANNED' }, allowed: { status: IDEA_EXPERIMENT_STATUSES } },
    links: { model: prisma.ideaLink, title: 'Link', defaults: { targetType: 'URL' }, allowed: { targetType: IDEA_LINK_TARGET_TYPES } },
  }[kind];
}

function sanitizeCollectionData(kind, data, existing = {}) {
  const config = collectionConfig(kind);
  const allowed = config.allowed || {};
  const payload = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    payload[key] = value === '' ? null : value;
  });
  Object.entries(allowed).forEach(([key, values]) => {
    if (payload[key] != null && !values.includes(payload[key])) payload[key] = existing[key] || config.defaults[key];
  });
  if (payload.title != null) payload.title = String(payload.title).trim();
  if (payload.title === '') throw new AppError(`${config.title} title is required`, 400);
  if (kind === 'experiments' && payload.dueDate !== undefined) payload.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  return payload;
}

export async function listCollection(kind, ideaId, userId) {
  const config = collectionConfig(kind);
  if (!config) throw new AppError('Invalid idea collection', 400);
  await getIdeaAccess(ideaId, userId);
  return config.model.findMany({ where: { ideaId }, orderBy: { updatedAt: 'desc' }, include: kind === 'experiments' ? { owner: { select: userSelect } } : undefined });
}

export async function createCollectionItem(kind, ideaId, userId, data) {
  const config = collectionConfig(kind);
  if (!config) throw new AppError('Invalid idea collection', 400);
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const payload = sanitizeCollectionData(kind, { ...config.defaults, ...data });
  if (!payload.title) throw new AppError(`${config.title} title is required`, 400);
  return config.model.create({
    data: { ...payload, ideaId },
    include: kind === 'experiments' ? { owner: { select: userSelect } } : undefined,
  });
}

export async function updateCollectionItem(kind, ideaId, itemId, userId, data) {
  const config = collectionConfig(kind);
  if (!config) throw new AppError('Invalid idea collection', 400);
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const item = await config.model.findFirst({ where: { id: itemId, ideaId } });
  if (!item) throw new AppError(`${config.title} not found`, 404);
  const payload = sanitizeCollectionData(kind, data, item);
  return config.model.update({
    where: { id: itemId },
    data: payload,
    include: kind === 'experiments' ? { owner: { select: userSelect } } : undefined,
  });
}

export async function deleteCollectionItem(kind, ideaId, itemId, userId) {
  const config = collectionConfig(kind);
  if (!config) throw new AppError('Invalid idea collection', 400);
  const idea = await getIdeaAccess(ideaId, userId);
  assertWritableIdea(idea, userId, 'edit');
  const item = await config.model.findFirst({ where: { id: itemId, ideaId } });
  if (!item) throw new AppError(`${config.title} not found`, 404);
  await config.model.delete({ where: { id: itemId } });
}

export async function listComments(ideaId, userId) {
  await getIdeaAccess(ideaId, userId);
  return prisma.ideaComment.findMany({
    where: { ideaId, parentId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: userSelect },
      section: { select: { id: true, title: true, type: true } },
      replies: { orderBy: { createdAt: 'asc' }, include: { user: { select: userSelect } } },
    },
  });
}

export async function createComment(ideaId, userId, data) {
  await getIdeaAccess(ideaId, userId);
  const content = String(data.content || '').trim();
  if (!content) throw new AppError('Comment content is required', 400);
  if (data.sectionId) {
    const section = await prisma.ideaSection.findFirst({ where: { id: data.sectionId, ideaId } });
    if (!section) throw new AppError('Idea section not found', 404);
  }
  if (data.parentId) {
    const parent = await prisma.ideaComment.findFirst({ where: { id: data.parentId, ideaId } });
    if (!parent) throw new AppError('Parent comment not found', 404);
  }
  return prisma.ideaComment.create({
    data: {
      ideaId,
      sectionId: data.sectionId || null,
      parentId: data.parentId || null,
      userId,
      content,
    },
    include: { user: { select: userSelect }, section: { select: { id: true, title: true, type: true } } },
  });
}

export async function updateComment(ideaId, commentId, userId, data) {
  const idea = await getIdeaAccess(ideaId, userId);
  const comment = await prisma.ideaComment.findFirst({ where: { id: commentId, ideaId } });
  if (!comment) throw new AppError('Comment not found', 404);
  const role = roleForIdea(idea, userId);
  if (comment.userId !== userId && !manageRoles.has(role)) throw new AppError('Insufficient comment permission', 403);
  const updateData = {};
  if (data.content != null) updateData.content = String(data.content).trim();
  if (data.resolved !== undefined) updateData.resolvedAt = data.resolved ? new Date() : null;
  if (updateData.content === '') throw new AppError('Comment content is required', 400);
  return prisma.ideaComment.update({ where: { id: commentId }, data: updateData, include: { user: { select: userSelect } } });
}

export async function deleteComment(ideaId, commentId, userId) {
  const idea = await getIdeaAccess(ideaId, userId);
  const comment = await prisma.ideaComment.findFirst({ where: { id: commentId, ideaId } });
  if (!comment) throw new AppError('Comment not found', 404);
  const role = roleForIdea(idea, userId);
  if (comment.userId !== userId && !manageRoles.has(role)) throw new AppError('Insufficient comment permission', 403);
  await prisma.ideaComment.delete({ where: { id: commentId } });
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function makeProjectKey(title) {
  const key = String(title || 'IDEA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return key || 'IDEA';
}

async function ensureProjectKey(ownerId, title, tx = prisma) {
  const base = makeProjectKey(title);
  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? '' : String(index + 1);
    const key = `${base.slice(0, 10 - suffix.length)}${suffix}`;
    const existing = await tx.project.findUnique({ where: { ownerId_key: { ownerId, key } } });
    if (!existing) return key;
  }
  return `${base.slice(0, 6)}${Date.now().toString().slice(-4)}`;
}

function createDocContent(idea) {
  const sections = (idea.sections || []).map((section) => `## ${section.title}\n${section.plainText || ''}`).join('\n\n');
  const goals = (idea.goals || []).map((goal) => `- ${goal.title}${goal.target ? `: ${goal.target}` : ''}`).join('\n');
  const requirements = (idea.requirements || []).map((item) => `- [${item.priority}] ${item.title}${item.description ? ` - ${item.description}` : ''}`).join('\n');
  return [
    `# ${idea.title}`,
    idea.summary || '',
    idea.problem ? `## Problem\n${idea.problem}` : '',
    idea.opportunity ? `## Opportunity\n${idea.opportunity}` : '',
    goals ? `## Goals\n${goals}` : '',
    requirements ? `## Requirements\n${requirements}` : '',
    sections ? `## Workspace Notes\n${sections}` : '',
  ].filter(Boolean).join('\n\n');
}

export async function buildConversionPlan(ideaId, userId, overrides = {}) {
  const idea = await getIdeaById(ideaId, userId);
  assertIdeaPermission(idea, userId, 'manage');
  const key = overrides.project?.key || await ensureProjectKey(idea.ownerId, idea.title);
  const requirements = idea.requirements || [];
  const experiments = idea.experiments || [];
  const project = {
    name: overrides.project?.name || idea.title,
    key,
    description: overrides.project?.description || idea.summary || idea.problem || 'Converted from an idea workspace.',
    startDate: overrides.project?.startDate || new Date().toISOString(),
    endDate: overrides.project?.endDate || dateAfter(42).toISOString(),
  };
  const milestones = overrides.milestones || [
    { name: 'Validation closeout', goal: 'Resolve open assumptions and confirm execution scope.', startDate: project.startDate, endDate: dateAfter(14).toISOString() },
    { name: 'MVP execution', goal: 'Build, review, and prepare the first implementation launch.', startDate: dateAfter(15).toISOString(), endDate: project.endDate },
  ];
  const requirementTasks = requirements.slice(0, 40).map((item) => ({
    title: item.title,
    description: item.description || item.acceptanceNotes || '',
    priority: item.priority || 'MEDIUM',
    type: item.type === 'RISK' || item.type === 'ASSUMPTION' ? 'SPIKE' : 'FEATURE',
    status: 'BACKLOG',
    assigneeId: null,
    sprintName: milestones[1]?.name || milestones[0]?.name,
  }));
  const experimentTasks = experiments.filter((item) => !['VALIDATED', 'INVALIDATED'].includes(item.status)).slice(0, 20).map((item) => ({
    title: `Validate: ${item.title}`,
    description: [item.hypothesis, item.method, item.evidence].filter(Boolean).join('\n\n'),
    priority: 'MEDIUM',
    type: 'SPIKE',
    status: 'BACKLOG',
    assigneeId: item.ownerId || null,
    sprintName: milestones[0]?.name,
  }));
  const fallbackTasks = [
    { title: 'Finalize implementation requirements', description: 'Review idea goals, requirements, and open questions before execution starts.', priority: 'HIGH', type: 'CHORE', status: 'BACKLOG', assigneeId: null, sprintName: milestones[0]?.name },
    { title: 'Create delivery plan', description: 'Break the approved idea into implementation work and ownership.', priority: 'HIGH', type: 'FEATURE', status: 'BACKLOG', assigneeId: null, sprintName: milestones[1]?.name || milestones[0]?.name },
  ];
  const docs = overrides.docs || [
    { title: `${idea.title} - Idea Brief`, content: createDocContent(idea), pinned: true },
    { title: `${idea.title} - Execution Plan`, content: `# Execution Plan\n\n## Milestones\n${milestones.map((item) => `- ${item.name}: ${item.goal}`).join('\n')}\n\n## Initial Work\n${[...requirementTasks, ...experimentTasks, ...fallbackTasks].map((item) => `- ${item.title}`).join('\n')}`, pinned: false },
  ];

  return {
    ideaId: idea.id,
    readiness: {
      goals: idea.goals.length,
      requirements: idea.requirements.length,
      openExperiments: experiments.filter((item) => !['VALIDATED', 'INVALIDATED'].includes(item.status)).length,
      comments: idea._count?.comments || 0,
    },
    project,
    milestones,
    tasks: overrides.tasks || (requirementTasks.length || experimentTasks.length ? [...requirementTasks, ...experimentTasks] : fallbackTasks),
    docs,
    members: idea.members.map((member) => ({ userId: member.userId, role: member.role, user: member.user })),
  };
}

export async function convertIdea(ideaId, userId, data = {}) {
  const access = await getIdeaAccess(ideaId, userId);
  assertIdeaPermission(access, userId, 'manage');
  if (access.stage !== 'FINALIZED') throw new AppError('Only finalized ideas can be converted', 400);
  if (access.convertedProjectId) throw new AppError('Idea has already been converted', 409);

  const plan = await buildConversionPlan(ideaId, userId, data.plan || data);

  const result = await prisma.$transaction(async (tx) => {
    const projectKey = await ensureProjectKey(access.ownerId, plan.project.name, tx);
    const project = await tx.project.create({
      data: {
        name: plan.project.name,
        key: (plan.project.key || projectKey).slice(0, 10),
        description: plan.project.description || null,
        ownerId: access.ownerId,
        status: 'active',
        visibility: 'private',
        startDate: plan.project.startDate ? new Date(plan.project.startDate) : null,
        endDate: plan.project.endDate ? new Date(plan.project.endDate) : null,
      },
    });

    const uniqueMembers = new Map();
    uniqueMembers.set(access.ownerId, ROLES.ADMIN);
    for (const member of plan.members || []) {
      uniqueMembers.set(member.userId, normalizeRole(member.role) || ROLES.EMPLOYEE);
    }
    await tx.projectMember.createMany({
      data: [...uniqueMembers.entries()].map(([memberUserId, role]) => ({ projectId: project.id, userId: memberUserId, role })),
      skipDuplicates: true,
    });

    const sprintByName = new Map();
    for (const milestone of plan.milestones || []) {
      const sprint = await tx.sprint.create({
        data: {
          projectId: project.id,
          name: milestone.name,
          goal: milestone.goal || null,
          status: 'PLANNED',
          startDate: milestone.startDate ? new Date(milestone.startDate) : null,
          endDate: milestone.endDate ? new Date(milestone.endDate) : null,
        },
      });
      sprintByName.set(milestone.name, sprint);
    }

    for (const task of plan.tasks || []) {
      const sprint = task.sprintName ? sprintByName.get(task.sprintName) : null;
      const assigneeId = task.assigneeId && uniqueMembers.has(task.assigneeId) ? task.assigneeId : null;
      await tx.task.create({
        data: {
          projectId: project.id,
          sprintId: sprint?.id || null,
          title: task.title,
          description: task.description || null,
          priority: task.priority || 'MEDIUM',
          type: task.type || 'FEATURE',
          status: task.status || 'BACKLOG',
          assigneeId,
          createdById: userId,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
        },
      });
    }

    for (const doc of plan.docs || []) {
      await tx.projectDoc.create({
        data: {
          projectId: project.id,
          title: doc.title,
          content: doc.content || '',
          pinned: Boolean(doc.pinned),
          createdById: userId,
        },
      });
    }

    await tx.ideaWorkspace.update({
      where: { id: ideaId },
      data: { stage: 'CONVERTED', convertedProjectId: project.id },
    });

    await tx.ideaConversion.create({
      data: {
        ideaId,
        projectId: project.id,
        conversionPlanJson: plan,
        createdById: userId,
      },
    });

    await createActivityEvent({
      projectId: project.id,
      actorId: userId,
      type: 'idea.converted',
      entityType: 'IDEA',
      entityId: ideaId,
      title: `Converted idea into project: ${project.name}`,
      metadata: { ideaId },
    }, tx);

    return project;
  });

  return {
    project: result,
    idea: await getIdeaById(ideaId, userId),
  };
}

export async function aiSuggestion(ideaId, userId, action) {
  const idea = await getIdeaById(ideaId, userId);
  const configured = Boolean(process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY);
  if (!configured) {
    return {
      configured: false,
      action,
      message: 'AI is not configured for this environment.',
      suggestions: [],
    };
  }
  return {
    configured: true,
    action,
    message: 'AI adapter is ready, but no provider implementation has been enabled yet.',
    suggestions: [
      {
        title: `Summarize ${idea.title}`,
        content: idea.summary || idea.problem || 'Add an AI provider adapter to generate live suggestions.',
      },
    ],
  };
}
