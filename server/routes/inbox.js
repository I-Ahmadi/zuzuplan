import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as inboxController from '../controllers/inboxController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', inboxController.list);
router.post('/mark-read', inboxController.markAllRead);
router.put('/:id', [body('status').optional().isIn(['UNREAD', 'READ', 'ARCHIVED'])], validate, inboxController.update);

export default router;
