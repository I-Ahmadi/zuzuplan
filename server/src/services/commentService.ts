import { Comment, Project, ProjectMember } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getSkip, createPaginationResult } from '../utils/pagination';
import { logActivity } from './activityLogService';
import { ACTIVITY_ACTIONS, ROLES } from '../utils/constants';
import { notifyCommentUpdate } from '../utils/realtime';
import * as taskService from './taskService';

export async function createComment(
  taskId: string,
  userId: string,
  content: string
) {
  const task = await taskService.getTaskById(taskId, userId);

  const comment = await Comment.create({
    taskId,
    userId,
    content,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate('userId', 'id name email avatar')
    .lean();

  // Log activity
  await logActivity({
    projectId: (task as any).projectId.toString(),
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.COMMENT_ADDED,
    details: JSON.stringify({ commentId: comment._id.toString() }),
  });

  // Send real-time update
  await notifyCommentUpdate(
    (task as any).projectId.toString(),
    taskId,
    comment._id.toString(),
    populatedComment
  );

  return populatedComment;
}

export async function getComments(
  taskId: string,
  userId: string,
  filters: {
    page?: number;
    limit?: number;
  }
) {
  await taskService.getTaskById(taskId, userId); // Verify access

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = getSkip(page, limit);

  const [comments, total] = await Promise.all([
    Comment.find({ taskId })
      .populate('userId', 'id name email avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments({ taskId }),
  ]);

  return createPaginationResult(comments, total, page, limit);
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string
) {
  const comment = await Comment.findById(commentId)
    .populate('taskId', 'id projectId')
    .lean();

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if ((comment.userId as any).toString() !== userId) {
    throw new AppError('Unauthorized to update this comment', 403);
  }

  const updated = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true }
  )
    .populate('userId', 'id name email avatar')
    .lean();

  // Send real-time update
  await notifyCommentUpdate(
    (comment.taskId as any).projectId.toString(),
    (comment.taskId as any)._id.toString(),
    commentId,
    updated
  );

  return updated;
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await Comment.findById(commentId)
    .populate('taskId', 'id projectId')
    .lean();

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Check permissions - user can delete their own comment or project admin
  if ((comment.userId as any).toString() !== userId) {
    // Check if user is project admin
    const project = await Project.findById((comment.taskId as any).projectId).lean();
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const isOwner = project.ownerId.toString() === userId;
    const membership = await ProjectMember.findOne({
      projectId: project._id,
      userId,
      role: ROLES.ADMIN,
    });

    if (!isOwner && !membership) {
      throw new AppError('Unauthorized to delete this comment', 403);
    }
  }

  await Comment.findByIdAndDelete(commentId);
}
