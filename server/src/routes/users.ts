import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateAvatar,
  getUserById,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.put('/me/avatar', updateAvatar);
router.get('/:id', getUserById);

export default router;

