import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import { prisma } from '../config/database.js';
import * as taskController from '../controllers/taskController.js';
import * as taskValidators from '../validators/taskValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(taskValidators.projectId, validate);

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

router.get('/', taskValidators.listTasks, validate, taskController.list);
router.post('/', taskValidators.createTask, validate, taskController.create);
router.get('/:id', taskValidators.taskId, validate, requireTaskInProject, taskController.getById);
router.put('/:id', taskValidators.updateTask, validate, requireTaskInProject, taskController.update);
router.delete('/:id', taskValidators.taskId, validate, requireTaskInProject, taskController.remove);
router.post('/:id/subtasks', taskValidators.createSubtask, validate, requireTaskInProject, taskController.addSubtask);
router.put('/:id/subtasks/:subtaskId', taskValidators.updateSubtask, validate, requireTaskInProject, taskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', taskValidators.subtaskId, validate, requireTaskInProject, taskController.deleteSubtask);
router.post('/:id/links', taskValidators.createTaskLink, validate, requireTaskInProject, taskController.addTaskLink);
router.delete('/:id/links/:linkId', taskValidators.linkId, validate, requireTaskInProject, taskController.deleteTaskLink);

export default router;
