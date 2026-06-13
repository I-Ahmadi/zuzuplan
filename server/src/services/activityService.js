import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';

function projectAccessWhere(userId) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

export async function createActivityEvent(data, tx = prisma) {
  return tx.activityEvent.create({
    data: {
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      actorId: data.actorId || null,
      targetUserId: data.targetUserId || null,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      title: data.title,
      description: data.description || null,
      severity: data.severity || 'INFO',
      metadata: data.metadata || undefined,
    },
  });
}

export async function listActivityEvents(userId, filters = {}) {
  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = {
    OR: [
      { project: projectAccessWhere(userId) },
      { targetUserId: userId },
      { actorId: userId },
    ],
  };

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.taskId) where.taskId = filters.taskId;
  if (filters.type) where.type = filters.type;
  if (filters.entityType) where.entityType = filters.entityType;

  const [items, total] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, key: true } },
        task: { select: { id: true, title: true, type: true, priority: true, status: true } },
        actor: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),
    prisma.activityEvent.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}
