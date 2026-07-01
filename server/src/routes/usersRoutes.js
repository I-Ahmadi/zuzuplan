import express from 'express';
import multer from 'multer';
import path from 'path';
import { UPLOAD_DIR } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as userController from '../controllers/userController.js';
import { AppError } from '../middleware/errorHandler.js';
import * as userValidators from '../validators/userValidators.js';

const router = express.Router();
const AVATAR_MAX_FILE_SIZE = parseInt(process.env.AVATAR_MAX_FILE_SIZE, 10) || 2 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const avatarStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `avatar-${unique}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter(req, file, cb) {
    if (AVATAR_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError('Avatar must be a JPG, PNG, GIF, or WebP image', 400));
  },
  limits: { fileSize: AVATAR_MAX_FILE_SIZE },
});

router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/me/sessions', userController.getSessions);
router.delete('/me/sessions/others', userValidators.revokeOtherSessions, validate, userController.revokeOtherSessions);
router.post('/me/resend-verification', userController.resendVerification);
router.get('/me/preferences', userValidators.getPreferences, validate, userController.getPreferences);
router.put('/me/preferences', userValidators.updatePreferences, validate, userController.updatePreferences);
router.put('/me', userValidators.updateMe, validate, userController.updateMe);
router.put('/me/avatar', userValidators.updateAvatar, validate, userController.updateAvatar);
router.post('/me/avatar/upload', avatarUpload.single('avatar'), userController.uploadAvatar);
router.get('/:id', userValidators.userId, validate, userController.getUserById);

export default router;
