import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';

export async function createInboxItem(data, tx = prisma) {
  if (!data.userId) return null;
  return tx.inboxItem.create({
    data: {
      userId: data.userId,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      activityEventId: data.activityEventId || null,
      type: data.type,
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'NORMAL',
      actionUrl: data.actionUrl || null,
      source: data.source || null,
    },
  });
}

export async function listInboxItems(userId, filters = {}) {
  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = { userId };

  if (filters.status && filters.status !== 'all') {
    where.status = String(filters.status).toUpperCase();
  } else if (!filters.includeArchived) {
    where.status = { not: 'ARCHIVED' };
  }
  if (filters.type && filters.type !== 'all') where.type = filters.type;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { task: { title: { contains: filters.search, mode: 'insensitive' } } },
      { project: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [items, total, unread] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, key: true } },
        task: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            createdBy: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        activityEvent: true,
      },
    }),
    prisma.inboxItem.count({ where }),
    prisma.inboxItem.count({ where: { userId, status: 'UNREAD' } }),
  ]);

  const result = createPaginationResult(items, total, page, limit);
  return { ...result, unread };
}

export async function updateInboxItem(userId, itemId, data) {
  const item = await prisma.inboxItem.findFirst({ where: { id: itemId, userId } });
  if (!item) return null;

  const status = data.status ? String(data.status).toUpperCase() : item.status;
  return prisma.inboxItem.update({
    where: { id: itemId },
    data: {
      status,
      readAt: status === 'READ' ? new Date() : item.readAt,
      archivedAt: status === 'ARCHIVED' ? new Date() : item.archivedAt,
      snoozedUntil: data.snoozedUntil ? new Date(data.snoozedUntil) : item.snoozedUntil,
    },
  });
}

export async function markAllRead(userId) {
  await prisma.inboxItem.updateMany({
    where: { userId, status: 'UNREAD' },
    data: { status: 'READ', readAt: new Date() },
  });
}
