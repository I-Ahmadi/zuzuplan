import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { notifyActivityUpdate } from '../utils/realtime.js';

export async function logActivity({ projectId, taskId, userId, action, details }) {
  const activity = await prisma.activityLog.create({
    data: {
      projectId,
      taskId: taskId || null,
      userId,
      action,
      details: details || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: taskId ? { select: { id: true, title: true } } : false,
    },
  });
  try {
    notifyActivityUpdate(projectId, activity);
  } catch (_) {}
  return activity;
}

export async function getActivityLog(projectId, options = {}) {
  const { page, limit } = getPageAndLimit(options);
  const skip = getSkip(page, limit);

  const where = { projectId };
  if (options.taskId) where.taskId = options.taskId;
  if (options.userId) where.userId = options.userId;

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}
