import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.list);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

export default router;
