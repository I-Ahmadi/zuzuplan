import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { ensureTaskAccess } from './taskService.js';
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

const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatar: true } },
};

export async function createComment(taskId, userId, content) {
  const task = await ensureTaskAccess(taskId, userId);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.COMMENT_CREATE);
  const comment = await prisma.comment.create({
    data: { taskId, userId, content },
    select: COMMENT_SELECT,
  });
  await createActivityEvent({
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
      select: COMMENT_SELECT,
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
    select: COMMENT_SELECT,
  });
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
