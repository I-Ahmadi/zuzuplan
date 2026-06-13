import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';
import { notifyCommentUpdate } from '../utils/realtime.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { ensureTaskAccess } from './taskService.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';
import { createActivityEvent } from './activityService.js';
import { createInboxItem } from './inboxService.js';

function requireProjectPermission(project, userId, permission) {
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
  return role;
}

export async function createComment(taskId, userId, content) {
  const task = await ensureTaskAccess(taskId, userId);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.COMMENT_CREATE);
  const comment = await prisma.comment.create({
    data: { taskId, userId, content },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  const activity = await createActivityEvent({
    projectId: task.projectId,
    taskId,
    actorId: userId,
    targetUserId: task.assigneeId || task.createdById,
    type: 'comment.created',
    entityType: 'comment',
    entityId: comment.id,
    title: 'Comment added',
    description: content.slice(0, 240),
    metadata: { issueTitle: task.title },
  });
  const recipients = new Set([task.assigneeId, task.createdById].filter((id) => id && id !== userId));
  await Promise.all(Array.from(recipients).map((recipientId) => createInboxItem({
    userId: recipientId,
    projectId: task.projectId,
    taskId,
    activityEventId: activity.id,
    type: 'comment',
    title: `Comment: ${task.title}`,
    description: content.slice(0, 240),
    priority: 'NORMAL',
    actionUrl: `/spaces/${task.projectId}/issues/${taskId}`,
    source: 'comment',
  })));
  try {
    notifyCommentUpdate(task.projectId, taskId, comment.id, comment);
  } catch (_) {}
  return comment;
}

export async function getComments(taskId, userId, options = {}) {
  await ensureTaskAccess(taskId, userId);
  const { page, limit } = getPageAndLimit(options);
  const skip = getSkip(page, limit);

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    }),
    prisma.comment.count({ where: { taskId } }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function updateComment(commentId, userId, content) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { include: { project: true } } },
  });
  if (!comment) throw new AppError('Comment not found', 404);
  const task = await ensureTaskAccess(comment.taskId, userId);
  const canEditOwn =
    comment.userId === userId &&
    hasProjectPermission(getProjectRole(task.project, userId), PROJECT_PERMISSIONS.COMMENT_UPDATE_OWN);
  if (!canEditOwn) throw new AppError('Only comment authors with edit permission can edit', 403);

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  try {
    notifyCommentUpdate(comment.task.projectId, comment.taskId, commentId, updated);
  } catch (_) {}
  return updated;
}

export async function deleteComment(commentId, userId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { include: { project: { include: { members: true } } } } },
  });
  if (!comment) throw new AppError('Comment not found', 404);
  const isAuthor = comment.userId === userId;
  const role = getProjectRole(comment.task.project, userId);
  const canDeleteOwn = isAuthor && hasProjectPermission(role, PROJECT_PERMISSIONS.COMMENT_DELETE_OWN);
  const canDeleteAny = hasProjectPermission(role, PROJECT_PERMISSIONS.COMMENT_DELETE_ANY);
  if (!canDeleteOwn && !canDeleteAny) throw new AppError('Forbidden', 403);

  await prisma.comment.delete({ where: { id: commentId } });
}
