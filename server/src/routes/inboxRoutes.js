import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as inboxController from '../controllers/inboxController.js';
import * as inboxValidators from '../validators/inboxValidators.js';

const router = express.Router();

router.use(authenticate);
router.get('/', inboxValidators.listInbox, validate, inboxController.list);
router.post('/mark-read', inboxController.markAllRead);
router.put('/:id', inboxValidators.updateInboxItem, validate, inboxController.update);

export default router;
