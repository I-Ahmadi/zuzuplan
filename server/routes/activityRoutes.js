import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as activityController from '../controllers/activityController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', activityController.list);

export default router;
