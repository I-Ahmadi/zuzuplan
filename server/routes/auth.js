import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { message: 'Too many login attempts', statusCode: 429 } },
});

const forgotResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: { message: 'Too many attempts', statusCode: 429 } },
});

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
];

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', forgotResetLimiter, authController.forgotPassword);
router.post('/reset-password', forgotResetLimiter, authController.resetPassword);

export default router;
