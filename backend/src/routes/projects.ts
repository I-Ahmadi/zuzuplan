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
import { requireProjectAccess } from '../middleware/authorization';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', requireProjectAccess(), getProject);
router.put('/:id', requireProjectAccess('Admin'), updateProject);
router.delete('/:id', requireProjectAccess('Owner'), deleteProject);
router.get('/:id/members', requireProjectAccess(), getMembers);
router.post('/:id/members', requireProjectAccess('Admin'), addMember);
router.put('/:id/members/:userId', requireProjectAccess('Owner'), updateMemberRole);
router.delete('/:id/members/:userId', requireProjectAccess('Admin'), removeMember);
router.get('/:id/stats', requireProjectAccess(), getProjectStats);

export default router;

