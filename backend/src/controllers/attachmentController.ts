import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import attachmentService from '../services/attachmentService';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: unknown, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter,
});

export const getAttachments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const taskId = (req.params as any).taskId;
    const attachments = await attachmentService.getAttachments(taskId, req.user.id);

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' },
      });
    }

    const taskId = (req.params as any).taskId;
    const fileUrl = `/uploads/${file.filename}`;

    const attachment = await attachmentService.createAttachment(taskId, req.user.id, {
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
    });

    res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    await attachmentService.deleteAttachment(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

