import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as sprintController from '../controllers/sprintController.js';
import * as sprintValidators from '../validators/sprintValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(sprintValidators.projectId, validate);

router.get('/', sprintController.list);
router.post('/', sprintValidators.createSprint, validate, sprintController.create);
router.put('/:sprintId', sprintValidators.updateSprint, validate, sprintController.update);
router.post('/:sprintId/start', sprintValidators.startSprint, validate, sprintController.start);
router.post('/:sprintId/complete', sprintValidators.completeSprint, validate, sprintController.complete);
router.delete('/:sprintId', sprintValidators.deleteSprint, validate, sprintController.remove);
router.post('/:sprintId/tasks', sprintValidators.addTasks, validate, sprintController.addTasks);
router.delete('/:sprintId/tasks/:taskId', sprintValidators.taskInSprint, validate, sprintController.removeTask);
router.put('/:sprintId/tasks/reorder', sprintValidators.reorderTasks, validate, sprintController.reorder);

export default router;
