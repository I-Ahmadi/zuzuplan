import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as activityController from '../controllers/activityController.js';
import * as activityValidators from '../validators/activityValidators.js';

const router = express.Router();

router.use(authenticate);
router.get('/', activityValidators.listActivity, validate, activityController.list);

export default router;
