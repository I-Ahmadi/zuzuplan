import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/me/preferences', userController.getPreferences);
router.put('/me/preferences', userController.updatePreferences);
router.put(
  '/me',
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 6 }),
  ],
  validate,
  userController.updateMe
);
router.put(
  '/me/avatar',
  [body('avatarUrl').notEmpty()],
  validate,
  userController.updateAvatar
);
router.get('/:id', userController.getUserById);

export default router;
