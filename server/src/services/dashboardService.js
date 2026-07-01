import { prisma } from '../config/database.js';
import { TASK_STATUS } from '../utils/constants.js';

const DAY_MS = 1000 * 60 * 60 * 24;
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const USER_SUMMARY_SELECT = { id: true, name: true, email: true, avatar: true };
const DASHBOARD_TASK_SELECT = {
  id: true,
  title: true,
  projectId: true,
  assigneeId: true,
  createdById: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: USER_SUMMARY_SELECT },
  createdBy: { select: USER_SUMMARY_SELECT },
  project: { select: { id: true, name: true, key: true } },
};

function clampLimit(value, fallback = 6, max = 20) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function accessibleProjectWhere(userId) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

function dueDays(task) {
  if (!task.dueDate) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
}

function isOpen(task) {
  return task.status !== TASK_STATUS.DONE;
}

function sortActionable(a, b) {
  const aDue = dueDays(a) ?? 999;
  const bDue = dueDays(b) ?? 999;
  if (aDue !== bDue) return aDue - bDue;
  return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
}

function compactTask(task) {
  return {
    ...task,
    space: task.project,
  };
}

function dayRange() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueSoonEnd = new Date(today);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 8);
  return { today, tomorrow, dueSoonEnd };
}

export async function getForYouDashboard(userId, options = {}) {
  const limit = clampLimit(options.limit);
  const projects = await prisma.project.findMany({
    where: accessibleProjectWhere(userId),
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      key: true,
      progress: true,
      updatedAt: true,
      _count: { select: { tasks: true } },
    },
  });

  const projectIds = projects.map((project) => project.id);
  if (!projectIds.length) {
    return {
      metrics: { assigned: 0, attention: 0, dueSoon: 0, spaces: 0, overdue: 0 },
      attention: [],
      assigned: [],
      createdByMe: [],
      recent: [],
      upcoming: [],
      spaces: [],
      primarySpace: null,
    };
  }

  const { today, tomorrow, dueSoonEnd } = dayRange();
  const openWhere = { projectId: { in: projectIds }, status: { not: TASK_STATUS.DONE } };
  const attentionWhere = {
    ...openWhere,
    OR: [
      { assigneeId: userId, priority: { in: ['HIGH', 'URGENT'] } },
      { dueDate: { lt: tomorrow } },
      { assigneeId: userId, dueDate: { gte: today, lt: dueSoonEnd } },
    ],
  };
  const upcomingWhere = { ...openWhere, dueDate: { gte: today, lt: dueSoonEnd } };
  const overdueWhere = { ...openWhere, dueDate: { lt: today } };

  const [assigned, createdByMe, upcoming, attention, recent, assignedCount, attentionCount, upcomingCount, overdueCount, doneByProject] = await Promise.all([
    prisma.task.findMany({
      where: { ...openWhere, assigneeId: userId },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: Math.max(limit, 6),
      select: DASHBOARD_TASK_SELECT,
    }),
    prisma.task.findMany({
      where: { ...openWhere, createdById: userId },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: Math.max(limit, 6),
      select: DASHBOARD_TASK_SELECT,
    }),
    prisma.task.findMany({
      where: upcomingWhere,
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
      take: Math.max(limit, 6),
      select: DASHBOARD_TASK_SELECT,
    }),
    prisma.task.findMany({
      where: attentionWhere,
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { updatedAt: 'desc' }],
      take: Math.max(limit, 6),
      select: DASHBOARD_TASK_SELECT,
    }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: DASHBOARD_TASK_SELECT,
    }),
    prisma.task.count({ where: { ...openWhere, assigneeId: userId } }),
    prisma.task.count({ where: attentionWhere }),
    prisma.task.count({ where: upcomingWhere }),
    prisma.task.count({ where: overdueWhere }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projects.slice(0, 4).map((project) => project.id) }, status: TASK_STATUS.DONE },
      _count: { _all: true },
    }),
  ]);

  const doneCountByProject = new Map(doneByProject.map((row) => [row.projectId, row._count._all]));

  return {
    metrics: {
      assigned: assignedCount,
      attention: attentionCount,
      dueSoon: upcomingCount,
      spaces: projects.length,
      overdue: overdueCount,
    },
    attention: attention.map(compactTask).sort(sortActionable).slice(0, limit),
    assigned: assigned.map(compactTask).sort(sortActionable).slice(0, 3),
    createdByMe: createdByMe.map(compactTask).sort(sortActionable).slice(0, 3),
    recent: recent.map(compactTask).slice(0, limit),
    upcoming: upcoming.map(compactTask).sort(sortActionable).slice(0, 4),
    spaces: projects.slice(0, 4).map((space) => {
      const total = space._count?.tasks || 0;
      const done = doneCountByProject.get(space.id) || 0;
      return {
        ...space,
        total,
        done,
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    }),
    primarySpace: projects[0] || null,
  };
}
