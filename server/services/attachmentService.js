import { prisma } from '../config/database.js';
import { ROLES } from '../utils/constants.js';
import { ensureTaskAccess } from './taskService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createAttachment(taskId, userId, fileData) {
  await ensureTaskAccess(taskId, userId);
  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      uploadedBy: userId,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return attachment;
}

export async function getAttachments(taskId, userId) {
  await ensureTaskAccess(taskId, userId);
  return prisma.attachment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function deleteAttachment(attachmentId, userId) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { project: { include: { members: true } } } } },
  });
  if (!attachment) throw new AppError('Attachment not found', 404);
  const isUploader = attachment.uploadedBy === userId;
  const isOwner = attachment.task.project.ownerId === userId;
  const member = attachment.task.project.members.find((m) => m.userId === userId);
  const isAdmin = member && member.role === ROLES.ADMIN;
  if (!isUploader && !isOwner && !isAdmin) throw new AppError('Forbidden', 403);

  await prisma.attachment.delete({ where: { id: attachmentId } });
}
