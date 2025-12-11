import { Router } from 'express';
import {
  getNotificationsList,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getNotificationsList);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;

