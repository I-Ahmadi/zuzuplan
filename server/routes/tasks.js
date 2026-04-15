import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as taskController from '../controllers/taskController.js';
import { TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', taskController.list);
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('assigneeId').optional(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
    body('status').optional().isIn(Object.values(TASK_STATUS)),
    body('labelIds').optional().isArray(),
  ],
  validate,
  taskController.create
);

router.get('/:id', taskController.getById);
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('assigneeId').optional(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
    body('status').optional().isIn(Object.values(TASK_STATUS)),
    body('labelIds').optional().isArray(),
  ],
  validate,
  taskController.update
);
router.delete('/:id', taskController.remove);

router.post(
  '/:id/subtasks',
  [body('title').trim().notEmpty()],
  validate,
  taskController.addSubtask
);
router.put(
  '/:id/subtasks/:subtaskId',
  [body('title').optional().trim().notEmpty(), body('completed').optional().isBoolean()],
  validate,
  taskController.updateSubtask
);
router.delete('/:id/subtasks/:subtaskId', taskController.deleteSubtask);

export default router;
