import { Router } from 'express';
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess } from '../middleware/authorization';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Verify project access for all routes
router.use(requireProjectAccess());

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/subtasks', addSubtask);
router.put('/:id/subtasks/:subtaskId', updateSubtask);
router.delete('/:id/subtasks/:subtaskId', deleteSubtask);

export default router;

