import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as sprintController from '../controllers/sprintController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

const sprintFields = [
  body('name').optional().trim().notEmpty(),
  body('goal').optional().trim(),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

router.get('/', sprintController.list);
router.post('/', sprintFields, validate, sprintController.create);
router.put('/:sprintId', sprintFields, validate, sprintController.update);
router.post('/:sprintId/start', sprintFields, validate, sprintController.start);
router.post('/:sprintId/complete', [body('moveOpenToBacklog').optional().isBoolean()], validate, sprintController.complete);
router.delete('/:sprintId', sprintController.remove);
router.post('/:sprintId/tasks', [body('taskIds').isArray({ min: 1 })], validate, sprintController.addTasks);
router.delete('/:sprintId/tasks/:taskId', sprintController.removeTask);
router.put('/:sprintId/tasks/reorder', [body('orderedTaskIds').isArray()], validate, sprintController.reorder);

export default router;
