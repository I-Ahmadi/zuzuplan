import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import { prisma } from '../config/database.js';
import * as taskController from '../controllers/taskController.js';
import { ISSUE_TYPE, TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';

const router = express.Router({ mergeParams: true });
const STATUS_VALUES = [...Object.values(TASK_STATUS), 'TODO', 'CANCELLED'];

router.use(authenticate);
router.use(requireProjectAccess());

async function requireTaskInProject(req, res, next) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (task.projectId !== req.params.projectId) {
      throw new AppError('Task does not belong to this project', 404);
    }

    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', taskController.list);
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('assigneeId').optional(),
    body('dueDate').optional().isISO8601(),
    body('type').optional().isIn(Object.values(ISSUE_TYPE)),
    body('estimate').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
    body('branchName').optional({ nullable: true }).trim(),
    body('blockedReason').optional({ nullable: true }).trim(),
    body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
    body('status').optional().isIn(STATUS_VALUES),
    body('sprintId').optional({ nullable: true, checkFalsy: true }),
  ],
  validate,
  taskController.create
);

router.get('/:id', requireTaskInProject, taskController.getById);
router.put(
  '/:id',
  requireTaskInProject,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('assigneeId').optional(),
    body('dueDate').optional().isISO8601(),
    body('type').optional().isIn(Object.values(ISSUE_TYPE)),
    body('estimate').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
    body('branchName').optional({ nullable: true }).trim(),
    body('blockedReason').optional({ nullable: true }).trim(),
    body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
    body('status').optional().isIn(STATUS_VALUES),
    body('sprintId').optional({ nullable: true, checkFalsy: true }),
  ],
  validate,
  taskController.update
);
router.delete('/:id', requireTaskInProject, taskController.remove);

router.post(
  '/:id/subtasks',
  requireTaskInProject,
  [body('title').trim().notEmpty()],
  validate,
  taskController.addSubtask
);
router.put(
  '/:id/subtasks/:subtaskId',
  requireTaskInProject,
  [body('title').optional().trim().notEmpty(), body('completed').optional().isBoolean()],
  validate,
  taskController.updateSubtask
);
router.delete('/:id/subtasks/:subtaskId', requireTaskInProject, taskController.deleteSubtask);

router.post(
  '/:id/links',
  requireTaskInProject,
  [body('targetTaskId').notEmpty(), body('type').optional().trim()],
  validate,
  taskController.addTaskLink
);
router.delete('/:id/links/:linkId', requireTaskInProject, taskController.deleteTaskLink);

export default router;
