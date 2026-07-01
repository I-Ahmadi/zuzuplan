import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as taskController from '../controllers/taskController.js';
import * as taskValidators from '../validators/taskValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(taskValidators.projectId, validate);

router.get('/', taskValidators.listTasks, validate, taskController.board);

export default router;
