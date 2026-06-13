import path from 'path';
import fs from 'fs';
import * as attachmentService from '../services/attachmentService.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function list(req, res, next) {
  try {
    const attachments = await attachmentService.getAttachments(req.params.taskId, req.user.id);
    res.json({ success: true, data: attachments });
  } catch (err) {
    next(err);
  }
}

export async function upload(req, res, next) {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const attachment = await attachmentService.createAttachment(
      req.params.taskId,
      req.user.id,
      {
        fileName: req.file.originalname,
        fileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      }
    );
    res.status(201).json({ success: true, data: attachment });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });
    await attachmentService.deleteAttachment(req.params.id, req.user.id);
    if (attachment?.fileUrl) {
      const filePath = path.join(process.cwd(), attachment.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
    }
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
}
