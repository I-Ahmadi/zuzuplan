import { Attachment, Project, ProjectMember } from '../models';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from './activityLogService';
import { ACTIVITY_ACTIONS, ROLES } from '../utils/constants';
import * as taskService from './taskService';

export async function createAttachment(
  taskId: string,
  userId: string,
  fileData: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }
) {
  const task = await taskService.getTaskById(taskId, userId);

  const attachment = await Attachment.create({
    taskId,
    uploadedBy: userId,
    fileName: fileData.fileName,
    fileUrl: fileData.fileUrl,
    fileType: fileData.fileType,
    fileSize: fileData.fileSize,
  });

  const populatedAttachment = await Attachment.findById(attachment._id)
    .populate('uploadedBy', 'id name email')
    .lean();

  // Log activity
  await logActivity({
    projectId: (task as any).projectId.toString(),
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.ATTACHMENT_ADDED,
    details: JSON.stringify({
      attachmentId: attachment._id.toString(),
      fileName: attachment.fileName,
    }),
  });

  return populatedAttachment;
}

export async function getAttachments(taskId: string, userId: string) {
  await taskService.getTaskById(taskId, userId); // Verify access

  const attachments = await Attachment.find({ taskId })
    .populate('uploadedBy', 'id name email')
    .sort({ createdAt: -1 })
    .lean();

  return attachments;
}

export async function deleteAttachment(attachmentId: string, userId: string) {
  const attachment = await Attachment.findById(attachmentId)
    .populate('taskId', 'id projectId')
    .lean();

  if (!attachment) {
    throw new AppError('Attachment not found', 404);
  }

  // Check permissions - user can delete their own attachment or project admin
  if ((attachment.uploadedBy as any).toString() !== userId) {
    const project = await Project.findById((attachment.taskId as any).projectId).lean();
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
      throw new AppError('Unauthorized to delete this attachment', 403);
    }
  }

  await Attachment.findByIdAndDelete(attachmentId);
}
