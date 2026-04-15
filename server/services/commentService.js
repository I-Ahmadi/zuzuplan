import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';
import { logActivity } from './activityLogService.js';
import { notifyCommentUpdate } from '../utils/realtime.js';
import { ACTIVITY_ACTIONS, ROLES } from '../utils/constants.js';
import { ensureTaskAccess } from './taskService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createComment(taskId, userId, content) {
  const task = await ensureTaskAccess(taskId, userId);
  const comment = await prisma.comment.create({
    data: { taskId, userId, content },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.COMMENT_ADDED,
    details: 'Comment added',
  });
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
  if (comment.userId !== userId) throw new AppError('Only author can edit', 403);

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
  const isOwner = comment.task.project.ownerId === userId;
  const member = comment.task.project.members.find((m) => m.userId === userId);
  const isAdmin = member && member.role === ROLES.ADMIN;
  if (!isAuthor && !isOwner && !isAdmin) throw new AppError('Forbidden', 403);

  await prisma.comment.delete({ where: { id: commentId } });
}
