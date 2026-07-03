import { prisma } from '../config/database.js';
import { TASK_STATUS } from '../utils/constants.js';
import { createPaginationResult, getPageAndLimit } from '../utils/pagination.js';

const DAY_MS = 1000 * 60 * 60 * 24;
const STALE_DAYS = 7;
const REVIEW_STALE_DAYS = 2;
const STATUSES = [
  { value: 'TODO', label: 'To Do', tone: 'bg-slate-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', tone: 'bg-lime-500' },
  { value: 'IN_REVIEW', label: 'In Review', tone: 'bg-violet-500' },
  { value: 'DONE', label: 'Done', tone: 'bg-blue-500' },
];
const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', tone: 'bg-red-500', badge: 'border-red-500/30 bg-red-500/10 text-red-500' },
  { value: 'HIGH', label: 'High', tone: 'bg-red-400', badge: 'border-red-500/30 bg-red-500/10 text-red-500' },
  { value: 'MEDIUM', label: 'Medium', tone: 'bg-orange-500', badge: 'border-orange-500/30 bg-orange-500/10 text-orange-500' },
  { value: 'LOW', label: 'Low', tone: 'bg-muted-foreground', badge: 'border-border bg-muted/35 text-muted-foreground' },
];

function accessibleProjectWhere(userId) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1';
}

function ageInDays(value) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS));
}

function dateDaysFromToday(value) {
  if (!value) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(value);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
}

function inRange(value, days) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= Number(days) * DAY_MS;
}

function isOpenTask(task) {
  return task.status !== TASK_STATUS.DONE;
}

function isOverdue(task) {
  const days = dateDaysFromToday(task.dueDate);
  return isOpenTask(task) && days !== null && days < 0;
}

function isDueSoon(task) {
  const days = dateDaysFromToday(task.dueDate);
  return isOpenTask(task) && days !== null && days >= 0 && days <= 7;
}

function isStale(task) {
  if (!isOpenTask(task)) return false;
  const staleLimit = task.status === TASK_STATUS.IN_REVIEW ? REVIEW_STALE_DAYS : STALE_DAYS;
  return ageInDays(task.updatedAt || task.createdAt) >= staleLimit;
}

function compactTask(task) {
  return {
    ...task,
    project: task.project,
  };
}

function buildBreakdown(items, definitions, key = 'status') {
  const total = items.length || 1;
  return definitions.map((definition) => {
    const count = items.filter((item) => item[key] === definition.value).length;
    return { ...definition, count, percent: Math.round((count / total) * 100) };
  });
}

function buildDeliveryAnalytics(tasks, sprints, rangeDays) {
  const open = tasks.filter(isOpenTask);
  const completed = tasks.filter((task) => task.status === TASK_STATUS.DONE);
  const activeSprintIds = new Set(sprints.filter((sprint) => sprint.status === 'ACTIVE').map((sprint) => sprint.id));
  const activeSprintTasks = tasks.filter((task) => task.sprintId && activeSprintIds.has(task.sprintId));
  const activeCompleted = activeSprintTasks.filter((task) => task.status === TASK_STATUS.DONE).length;

  return {
    open: open.length,
    completed: completed.length,
    inReview: tasks.filter((task) => task.status === TASK_STATUS.IN_REVIEW).length,
    stale: tasks.filter(isStale).length,
    dueSoon: tasks.filter(isDueSoon).length,
    overdue: tasks.filter(isOverdue).length,
    cycleCompletionRate: activeSprintTasks.length ? Math.round((activeCompleted / activeSprintTasks.length) * 100) : 0,
    createdRecent: tasks.filter((task) => inRange(task.createdAt, rangeDays)).length,
    updatedRecent: tasks.filter((task) => inRange(task.updatedAt, rangeDays)).length,
    completedRecent: completed.filter((task) => inRange(task.updatedAt, rangeDays)).length,
  };
}

function normalizeMember(member) {
  const user = member.user || member.assignee || member.createdBy || member;
  return user?.id ? user : null;
}

function buildAssignees(tasks, members) {
  const users = new Map();
  members.forEach((member) => {
    const user = normalizeMember(member);
    if (user) users.set(user.id, user);
  });
  tasks.forEach((task) => {
    if (task.assignee?.id) users.set(task.assignee.id, task.assignee);
    if (task.createdBy?.id) users.set(task.createdBy.id, task.createdBy);
  });
  return Array.from(users.values()).sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
}

function buildAssigneeWorkload(tasks, members) {
  const users = buildAssignees(tasks, members);
  const rows = users.map((user) => {
    const assigned = tasks.filter((task) => task.assigneeId === user.id || task.assignee?.id === user.id);
    const open = assigned.filter(isOpenTask);
    return {
      user,
      open: open.length,
      inReview: assigned.filter((task) => task.status === TASK_STATUS.IN_REVIEW).length,
      overdue: assigned.filter(isOverdue).length,
      dueSoon: assigned.filter(isDueSoon).length,
    };
  });

  const unassigned = tasks.filter((task) => isOpenTask(task) && !task.assigneeId && !task.assignee?.id);
  if (unassigned.length) {
    rows.push({
      user: { id: 'unassigned', name: 'Unassigned', email: 'Needs owner' },
      open: unassigned.length,
      inReview: unassigned.filter((task) => task.status === TASK_STATUS.IN_REVIEW).length,
      overdue: unassigned.filter(isOverdue).length,
      dueSoon: unassigned.filter(isDueSoon).length,
      unassigned: true,
    });
  }

  return rows.sort((a, b) => b.open - a.open).slice(0, 8);
}

function getAttentionReasons(task) {
  const reasons = [];
  if (isOverdue(task)) reasons.push('Overdue');
  if (task.priority === 'URGENT') reasons.push('Urgent');
  if (task.priority === 'HIGH') reasons.push('High priority');
  if (!task.assigneeId && !task.assignee?.id && isOpenTask(task)) reasons.push('No assignee');
  if (task.status === TASK_STATUS.IN_REVIEW) reasons.push('In review');
  if (isStale(task)) reasons.push(task.status === TASK_STATUS.IN_REVIEW ? 'Review stale' : 'Stale');
  return reasons;
}

function getAttentionTasks(tasks) {
  return tasks
    .map((task) => ({ ...task, attentionReasons: getAttentionReasons(task) }))
    .filter((task) => task.attentionReasons.length)
    .sort((a, b) => {
      const score = (task) =>
        (isOverdue(task) ? 50 : 0) +
        (task.priority === 'URGENT' ? 40 : 0) +
        (task.priority === 'HIGH' ? 25 : 0) +
        (!task.assigneeId ? 15 : 0) +
        (isStale(task) ? 10 : 0);
      return score(b) - score(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
}

function activeCycleHealth(sprints, tasks) {
  const active = sprints.filter((sprint) => sprint.status === 'ACTIVE');
  const activeIds = new Set(active.map((sprint) => sprint.id));
  const activeTasks = tasks.filter((task) => task.sprintId && activeIds.has(task.sprintId));
  const completed = activeTasks.filter((task) => task.status === TASK_STATUS.DONE).length;
  const open = activeTasks.filter(isOpenTask).length;
  const dueSoon = activeTasks.filter(isDueSoon).length;
  const percent = activeTasks.length ? Math.round((completed / activeTasks.length) * 100) : 0;
  return { active, activeTaskCount: activeTasks.length, completed, open, dueSoon, percent };
}

function buildTaskWhere(projectIds, filters) {
  const where = { projectId: { in: projectIds } };
  const projectId = filters.projectId;
  if (projectId && projectId !== 'all') where.projectId = projectIds.includes(projectId) ? projectId : '__no_access__';
  if (filters.assigneeId === 'unassigned') {
    where.assigneeId = null;
  } else if (filters.assigneeId && filters.assigneeId !== 'all') {
    where.assigneeId = filters.assigneeId;
  }
  if (filters.status && filters.status !== 'all') where.status = filters.status;
  if (filters.priority && filters.priority !== 'all') where.priority = filters.priority;
  if (!boolValue(filters.includeCompleted, true)) where.status = { not: TASK_STATUS.DONE };
  if (filters.search) {
    const search = String(filters.search).trim();
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { project: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { project: { is: { key: { contains: search, mode: 'insensitive' } } } },
      { assignee: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { assignee: { is: { email: { contains: search, mode: 'insensitive' } } } },
      { createdBy: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  return where;
}

export async function getDeliveryHealthAnalytics(userId, filters = {}) {
  const { page, limit } = getPageAndLimit(filters);
  const includeExport = boolValue(filters.includeExport, false);
  const rangeDays = filters.rangeDays || '30';
  const projects = await prisma.project.findMany({
    where: accessibleProjectWhere(userId),
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, name: true, key: true, progress: true, _count: { select: { tasks: true } } },
  });
  const projectIds = projects.map((project) => project.id);

  if (!projectIds.length) {
    return {
      projects: [],
      assignees: [],
      summary: buildDeliveryAnalytics([], [], rangeDays),
      statusBreakdown: buildBreakdown([], STATUSES),
      priorityBreakdown: buildBreakdown([], PRIORITIES, 'priority'),
      workload: [],
      cycleHealth: activeCycleHealth([], []),
      attentionTasks: [],
      staleTasks: [],
      pagination: createPaginationResult([], 0, page, limit).pagination,
      totals: { projects: 0, tasks: 0, filtered: 0 },
      exportTasks: includeExport ? [] : undefined,
    };
  }

  const where = buildTaskWhere(projectIds, filters);
  const [rawTasks, sprints, members] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        projectId: true,
        assigneeId: true,
        createdById: true,
        sprintId: true,
        priority: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, key: true } },
      },
    }),
    prisma.sprint.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        projectId: true,
        startDate: true,
        endDate: true,
        goal: true,
        project: { select: { id: true, name: true, key: true } },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    }),
  ]);

  const tasks = rawTasks.map(compactTask);
  const sprintRows = sprints.map((sprint) => ({ ...sprint, project: sprint.project }));
  const attentionTasks = getAttentionTasks(tasks);
  const paged = createPaginationResult(attentionTasks.slice((page - 1) * limit, page * limit), attentionTasks.length, page, limit);

  return {
    projects,
    assignees: buildAssignees(tasks, members),
    summary: buildDeliveryAnalytics(tasks, sprintRows, rangeDays),
    statusBreakdown: buildBreakdown(tasks, STATUSES),
    priorityBreakdown: buildBreakdown(tasks, PRIORITIES, 'priority'),
    workload: buildAssigneeWorkload(tasks, members),
    cycleHealth: activeCycleHealth(sprintRows, tasks),
    attentionTasks: paged.data,
    staleTasks: tasks.filter(isStale).slice(0, 6),
    pagination: paged.pagination,
    totals: { projects: projects.length, tasks: rawTasks.length, filtered: tasks.length },
    exportTasks: includeExport ? attentionTasks : undefined,
  };
}
