import { Router } from 'express';
import {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
  getProjectStats,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess, requireProjectAdmin } from '../middleware/authorization';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', requireProjectAccess(), getProject);
router.put('/:id', requireProjectAdmin(), updateProject);
router.delete('/:id', requireProjectAdmin(), deleteProject);
router.get('/:id/members', requireProjectAccess(), getMembers);
router.post('/:id/members', requireProjectAdmin(), addMember);
router.put('/:id/members/:userId', requireProjectAdmin(), updateMemberRole);
router.delete('/:id/members/:userId', requireProjectAdmin(), removeMember);
router.get('/:id/stats', requireProjectAccess(), getProjectStats);

export default router;

