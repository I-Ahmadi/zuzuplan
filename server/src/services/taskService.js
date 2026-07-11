import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { calculateProgress } from './projectService.js';
import { ISSUE_TYPE, PROJECT_PERMISSIONS, SPRINT_STATUS, TASK_PRIORITY, TASK_STATUS, normalizeTaskStatus, taskStatusFilterValues } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';
import { createActivityEvent } from './activityService.js';

function requireProjectPermission(project, userId, permission) {
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
  return role;
}

function canUpdateTask(task, userId) {
  const role = getProjectRole(task.project, userId);
  if (hasProjectPermission(role, PROJECT_PERMISSIONS.TASK_UPDATE_ANY)) return true;
  if (!hasProjectPermission(role, PROJECT_PERMISSIONS.TASK_UPDATE_OWN)) return false;
  return task.createdById === userId || task.assigneeId === userId;
}

function assertAssignable(project, assigneeId) {
  if (!assigneeId) return;
  const isProjectOwner = project.ownerId === assigneeId;
  const isProjectMember = project.members.some((member) => member.userId === assigneeId);
  if (!isProjectOwner && !isProjectMember) {
    throw new AppError('Assignee must be a project member', 400);
  }
}

async function assertSprint(projectId, sprintId) {
  if (!sprintId) return;
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });
  if (!sprint) throw new AppError('Sprint must belong to this project', 400);
}

function normalizeTaskPayload(task) {
  if (!task) return task;
  return { ...task, status: normalizeTaskStatus(task.status) };
}

function makeCountMap(values) {
  return values.reduce((counts, value) => ({ ...counts, [value]: 0 }), {});
}

const USER_SUMMARY_SELECT = { id: true, name: true, email: true, avatar: true };
const PROJECT_SUMMARY_SELECT = { id: true, name: true, key: true };
const SPRINT_SUMMARY_SELECT = { id: true, name: true, status: true };

const TASK_ROW_SELECT = {
  id: true,
  title: true,
  projectId: true,
  sprintId: true,
  assigneeId: true,
  createdById: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  backlogOrder: true,
  sprintOrder: true,
  assignee: { select: USER_SUMMARY_SELECT },
  createdBy: { select: USER_SUMMARY_SELECT },
  sprint: { select: SPRINT_SUMMARY_SELECT },
};

const TASK_LOOKUP_SELECT = {
  id: true,
  title: true,
  projectId: true,
  status: true,
  priority: true,
  project: { select: PROJECT_SUMMARY_SELECT },
};

const BOARD_TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  sprintId: true,
  assigneeId: true,
  assignee: { select: USER_SUMMARY_SELECT },
  sprint: { select: SPRINT_SUMMARY_SELECT },
};

const TIMELINE_TASK_SELECT = {
  id: true,
  title: true,
  sprintId: true,
  status: true,
  priority: true,
  dueDate: true,
};

const TASK_MUTATION_SELECT = {
  id: true,
};

const TASK_DETAIL_SELECT = {
  id: true,
  title: true,
  description: true,
  projectId: true,
  assigneeId: true,
  sprintId: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  project: { select: PROJECT_SUMMARY_SELECT },
  sprint: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
  assignee: { select: USER_SUMMARY_SELECT },
  createdBy: { select: USER_SUMMARY_SELECT },
};

const LIST_TASK_SELECT = {
  id: true,
  title: true,
  sprintId: true,
  assigneeId: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: USER_SUMMARY_SELECT },
  createdBy: { select: USER_SUMMARY_SELECT },
  sprint: { select: SPRINT_SUMMARY_SELECT },
};

function taskSelectForFields(fields) {
  if (fields === 'lookup') return TASK_LOOKUP_SELECT;
  if (fields === 'board') return BOARD_TASK_SELECT;
  if (fields === 'timeline') return TIMELINE_TASK_SELECT;
  return TASK_ROW_SELECT;
}

function buildTaskWhere(project, filters = {}) {
  const where = { projectId: project.id };

  if (filters.status) where.status = { in: taskStatusFilterValues(filters.status) };
  if (filters.type) where.type = filters.type;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.sprintId === 'backlog') {
    where.sprintId = null;
  } else if (filters.sprintId) {
    where.sprintId = filters.sprintId;
  }
  if (filters.search) {
    const search = String(filters.search).trim();
    const projectKeyPrefix = `${project.key}-`.toUpperCase();
    const normalizedSearch = search.toUpperCase();
    let taskKeySuffix = '';
    if (normalizedSearch.startsWith(projectKeyPrefix)) {
      taskKeySuffix = search.slice(projectKeyPrefix.length);
    } else if (/^[A-Z0-9]{2,}$/i.test(search)) {
      taskKeySuffix = search;
    }
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sprint: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
    if (taskKeySuffix) {
      where.OR.push({ id: { endsWith: taskKeySuffix.toLowerCase() } });
    }
  }
  if (filters.excludeCompletedSprints && filters.sprintId !== 'backlog') {
    const completedSprintFilter = { OR: [{ sprintId: null }, { sprint: { is: { status: { not: SPRINT_STATUS.COMPLETED } } } }] };
    if (where.OR?.length) {
      where.AND = [{ OR: where.OR }, completedSprintFilter];
      delete where.OR;
    } else {
      where.OR = completedSprintFilter.OR;
    }
  }

  return where;
}

const TIMELINE_STATUS_CATEGORIES = {
  todo: TASK_STATUS.TODO,
  progress: TASK_STATUS.IN_PROGRESS,
  review: TASK_STATUS.IN_REVIEW,
  done: TASK_STATUS.DONE,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function getDefaultTimelineRange(zoom = 'months') {
  const today = new Date();
  if (zoom === 'weeks') {
    const start = startOfWeek(addDays(today, -28));
    return { from: start, to: addDays(start, 84) };
  }
  if (zoom === 'quarters') {
    const start = startOfQuarter(addMonths(today, -6));
    return { from: start, to: addMonths(start, 18) };
  }
  const start = startOfMonth(addMonths(today, -2));
  return { from: start, to: addMonths(start, 5) };
}

function getTimelineRange(filters) {
  const fallback = getDefaultTimelineRange(filters.zoom);
  const from = filters.from ? startOfDay(new Date(filters.from)) : fallback.from;
  const to = filters.to ? startOfDay(new Date(filters.to)) : fallback.to;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    throw new AppError('Timeline range is invalid', 400);
  }
  if (to.getTime() - from.getTime() > 548 * MS_PER_DAY) {
    throw new AppError('Timeline range cannot exceed 18 months', 400);
  }
  return { from, to };
}

function timelineOverlapFilter(from, to) {
  return {
    OR: [
      { dueDate: { gte: from, lt: to } },
      { sprint: { is: { OR: [
        { startDate: { gte: from, lt: to } },
        { endDate: { gte: from, lt: to } },
        { AND: [{ startDate: { lt: from } }, { endDate: { gte: to } }] },
      ] } } },
    ],
  };
}

function sprintOverlapFilter(from, to) {
  return {
    OR: [
      { startDate: { gte: from, lt: to } },
      { endDate: { gte: from, lt: to } },
      { AND: [{ startDate: { lt: from } }, { endDate: { gte: to } }] },
    ],
  };
}

export async function ensureTaskAccess(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } },
  });
  if (!task) throw new AppError('Task not found', 404);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_READ);
  return normalizeTaskPayload(task);
}

export async function getTaskById(taskId, userId) {
  await ensureTaskAccess(taskId, userId);
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: TASK_DETAIL_SELECT,
  });
  if (!task) throw new AppError('Task not found', 404);
  return normalizeTaskPayload(task);
}

export async function createTask(projectId, userId, data) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_CREATE);
  if (data.assigneeId) {
    requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_ASSIGN);
    assertAssignable(project, data.assigneeId);
  }
  await assertSprint(projectId, data.sprintId);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      projectId,
      createdById: userId,
      sprintId: data.sprintId || null,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      type: data.type || ISSUE_TYPE.FEATURE,
      estimate: data.estimate === undefined || data.estimate === '' ? null : Number(data.estimate),
      branchName: data.branchName || null,
      blockedReason: data.blockedReason || null,
      priority: data.priority || TASK_PRIORITY.MEDIUM,
      status: normalizeTaskStatus(data.status),
      backlogOrder: Date.now(),
      sprintOrder: data.sprintId ? Date.now() : 0,
    },
    select: TASK_MUTATION_SELECT,
  });

  await createActivityEvent({
    projectId,
    taskId: task.id,
    actorId: userId,
    targetUserId: data.assigneeId || null,
    type: 'task.created',
    entityType: 'task',
    entityId: task.id,
    title: 'Task created',
    description: data.title,
    severity: 'SUCCESS',
    metadata: {
      type: data.type || ISSUE_TYPE.FEATURE,
      status: normalizeTaskStatus(data.status),
      priority: data.priority || TASK_PRIORITY.MEDIUM,
    },
  });

  await calculateProgress(projectId);
  return task;
}

export async function getTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = buildTaskWhere(project, filters);
  const select = taskSelectForFields(filters.fields);

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sprintOrder: 'asc' }, { backlogOrder: 'asc' }, { updatedAt: 'desc' }],
      select,
    }),
    prisma.task.count({ where }),
  ]);

  return createPaginationResult(items.map(normalizeTaskPayload), total, page, limit);
}

export async function getBacklogTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const where = buildTaskWhere(project, {
    ...filters,
    excludeCompletedSprints: true,
  });

  const items = await prisma.task.findMany({
    where,
    orderBy: [{ sprintOrder: 'asc' }, { backlogOrder: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      estimate: true,
      dueDate: true,
      sprintId: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  return items.map(normalizeTaskPayload);
}

export async function getListTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = buildTaskWhere(project, {
    ...filters,
    excludeCompletedSprints: true,
  });

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sprintOrder: 'asc' }, { backlogOrder: 'asc' }, { updatedAt: 'desc' }],
      select: LIST_TASK_SELECT,
    }),
    prisma.task.count({ where }),
  ]);

  return createPaginationResult(items.map(normalizeTaskPayload), total, page, limit);
}

export async function getBoardTasks(projectId, userId, filters = {}) {
  const { page, limit } = getPageAndLimit(filters);
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId, status: SPRINT_STATUS.ACTIVE },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });

  if (!activeSprint) {
    return createPaginationResult([], 0, page, limit);
  }

  return getTasks(projectId, userId, {
    ...filters,
    fields: 'board',
    sprintId: activeSprint.id,
    excludeCompletedSprints: true,
  });
}

export async function getTimelineTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const { limit } = getPageAndLimit(filters);
  const { from, to } = getTimelineRange(filters);
  const page = 1;
  const taskWhere = {
    projectId,
    AND: [timelineOverlapFilter(from, to)],
  };

  const status = TIMELINE_STATUS_CATEGORIES[filters.statusCategory];
  if (status) taskWhere.status = { in: taskStatusFilterValues(status) };

  if (filters.assigneeId === 'me') {
    taskWhere.assigneeId = userId;
  } else if (filters.assigneeId === 'unassigned') {
    taskWhere.assigneeId = null;
  } else if (filters.assigneeId) {
    taskWhere.assigneeId = filters.assigneeId;
  }

  const search = String(filters.search || '').trim();
  if (search) {
    const projectKeyPrefix = `${project.key}-`.toUpperCase();
    const normalizedSearch = search.toUpperCase();
    let taskKeySuffix = '';
    if (normalizedSearch.startsWith(projectKeyPrefix)) {
      taskKeySuffix = search.slice(projectKeyPrefix.length);
    } else if (/^[A-Z0-9]{2,}$/i.test(search)) {
      taskKeySuffix = search;
    }

    const searchFilters = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sprint: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
    if (taskKeySuffix) {
      searchFilters.push({ id: { endsWith: taskKeySuffix.toLowerCase() } });
    }
    taskWhere.AND.push({ OR: searchFilters });
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      take: limit,
      orderBy: [{ sprintOrder: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }],
      select: TIMELINE_TASK_SELECT,
    }),
    prisma.task.count({ where: taskWhere }),
  ]);

  const tasks = items.map(normalizeTaskPayload);
  const matchingSprintIds = [...new Set(tasks.map((task) => task.sprintId).filter(Boolean))];
  const tasksBySprint = tasks.reduce((groups, task) => {
    if (!task.sprintId) return groups;
    if (!groups[task.sprintId]) groups[task.sprintId] = [];
    groups[task.sprintId].push(task);
    return groups;
  }, {});

  const sprintRangeFilter = sprintOverlapFilter(from, to);
  const sprintWhere = {
    projectId,
    OR: matchingSprintIds.length
      ? [...sprintRangeFilter.OR, { id: { in: matchingSprintIds } }]
      : sprintRangeFilter.OR,
  };
  const hasTaskFilter = Boolean(search || filters.statusCategory || filters.assigneeId);
  if (hasTaskFilter) {
    const sprintFilters = [];
    if (matchingSprintIds.length) sprintFilters.push({ id: { in: matchingSprintIds } });
    if (search) {
      sprintFilters.push(
        { name: { contains: search, mode: 'insensitive' } },
        { goal: { contains: search, mode: 'insensitive' } }
      );
    }
    sprintWhere.AND = [{ OR: sprintFilters.length ? sprintFilters : [{ id: { in: [] } }] }];
  }

  const sprints = await prisma.sprint.findMany({
    where: sprintWhere,
    select: {
      id: true,
      name: true,
      goal: true,
      status: true,
      startDate: true,
      endDate: true,
    },
    orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }, { createdAt: 'asc' }],
  });

  return createPaginationResult({
    tasks,
    scheduledTasks: tasks.filter((task) => task.dueDate),
    sprints: sprints.map((sprint) => ({
      ...sprint,
      taskCount: tasksBySprint[sprint.id]?.length || 0,
    })),
    tasksBySprint,
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      zoom: filters.zoom || 'months',
    },
  }, total, page, limit);
}

export async function getTaskSummary(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      status: true,
      priority: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      dueDate: true,
    },
  });

  const statusCounts = makeCountMap(Object.values(TASK_STATUS));
  const priorityCounts = makeCountMap(Object.values(TASK_PRIORITY));
  const typeCounts = makeCountMap(Object.values(ISSUE_TYPE));
  const normalizedTasks = tasks.map(normalizeTaskPayload);
  const now = new Date();
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - 7);
  const dueSoonEnd = new Date(now);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);
  let completedRecent = 0;
  let createdRecent = 0;
  let updatedRecent = 0;
  let dueSoon = 0;

  for (const task of normalizedTasks) {
    const isCompleted = task.status === TASK_STATUS.DONE;
    const createdAt = task.createdAt ? new Date(task.createdAt) : null;
    const updatedAt = task.updatedAt ? new Date(task.updatedAt) : null;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;

    if (!Object.hasOwn(statusCounts, task.status)) statusCounts[task.status] = 0;
    statusCounts[task.status] += 1;
    if (Object.hasOwn(priorityCounts, task.priority)) priorityCounts[task.priority] += 1;
    if (Object.hasOwn(typeCounts, task.type)) typeCounts[task.type] += 1;
    if (isCompleted && updatedAt && updatedAt >= recentStart) completedRecent += 1;
    if (createdAt && createdAt >= recentStart) createdRecent += 1;
    if (updatedAt && updatedAt >= recentStart) updatedRecent += 1;
    if (dueDate && dueDate >= now && dueDate <= dueSoonEnd && !isCompleted) dueSoon += 1;
  }

  return {
    total: normalizedTasks.length,
    recent: {
      completed: completedRecent,
      created: createdRecent,
      updated: updatedRecent,
      dueSoon,
    },
    statusCounts,
    priorityCounts,
    typeCounts,
  };
}

export async function getTaskWorkload(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      assigneeId: true,
      status: true,
      dueDate: true,
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  const now = new Date();
  const workloadMap = new Map();

  for (const task of tasks.map(normalizeTaskPayload)) {
    const isCompleted = task.status === TASK_STATUS.DONE;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = Boolean(dueDate && dueDate < now && !isCompleted);
    const workloadKey = task.assigneeId || 'unassigned';
    const existing = workloadMap.get(workloadKey) || {
      user: task.assignee || null,
      total: 0,
      open: 0,
      overdue: 0,
    };

    existing.total += 1;
    if (!isCompleted) existing.open += 1;
    if (isOverdue) existing.overdue += 1;
    workloadMap.set(workloadKey, existing);
  }

  const workload = Array.from(workloadMap.values()).sort((a, b) => {
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    if (b.open !== a.open) return b.open - a.open;
    return b.total - a.total;
  });

  return {
    total: tasks.length,
    workload,
  };
}

export async function updateTask(taskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  if (data.assigneeId !== undefined) {
    requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_ASSIGN);
    assertAssignable(task.project, data.assigneeId);
  }
  if (data.sprintId !== undefined) {
    requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
    await assertSprint(task.projectId, data.sprintId);
  }
  const updateData = {};
  if (data.title != null) updateData.title = data.title;
  if (data.description != null) updateData.description = data.description;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.type != null) updateData.type = data.type;
  if (data.estimate !== undefined) updateData.estimate = data.estimate === '' || data.estimate == null ? null : Number(data.estimate);
  if (data.branchName !== undefined) updateData.branchName = data.branchName || null;
  if (data.blockedReason !== undefined) updateData.blockedReason = data.blockedReason || null;
  if (data.priority != null) updateData.priority = data.priority;
  if (data.status != null) {
    updateData.status = normalizeTaskStatus(data.status);
    if (updateData.status === TASK_STATUS.IN_PROGRESS) updateData.readyAt = new Date();
    if (updateData.status === TASK_STATUS.DONE) {
      updateData.mergedAt = new Date();
      updateData.deployedAt = new Date();
    }
  }
  if (data.sprintId !== undefined) {
    updateData.sprintId = data.sprintId || null;
    updateData.sprintOrder = data.sprintId ? Date.now() : 0;
    updateData.backlogOrder = data.sprintId ? task.backlogOrder : Date.now();
  }
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    select: TASK_MUTATION_SELECT,
  });

  const changed = Object.keys(updateData);
  if (changed.length) {
    const nextStatus = updateData.status || task.status;
    const statusChanged = Boolean(updateData.status && updateData.status !== task.status);
    await createActivityEvent({
      projectId: task.projectId,
      taskId,
      actorId: userId,
      targetUserId: updateData.assigneeId !== undefined ? updateData.assigneeId : task.assigneeId,
      type: statusChanged ? 'task.status_changed' : 'task.updated',
      entityType: 'task',
      entityId: taskId,
      title: statusChanged ? `Status changed to ${nextStatus}` : 'Task updated',
      description: updateData.title || task.title,
      severity: 'INFO',
      metadata: { changed, fromStatus: task.status, toStatus: nextStatus },
    });
  }

  await calculateProgress(task.projectId);
  return updated;
}

export async function deleteTask(taskId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_DELETE);
  await prisma.task.delete({ where: { id: taskId } });
  await calculateProgress(task.projectId);
}

