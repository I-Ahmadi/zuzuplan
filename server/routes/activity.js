import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import * as activityController from '../controllers/activityController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', activityController.list);

export default router;
