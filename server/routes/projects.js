import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess, requireProjectAdmin } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as projectController from '../controllers/projectController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', projectController.list);
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('key').trim().notEmpty().isLength({ max: 10 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'archived', 'completed']),
    body('visibility').optional().isIn(['private', 'public']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  projectController.create
);

router.get('/:id', requireProjectAccess(), projectController.getById);
router.put(
  '/:id',
  requireProjectAdmin(),
  [
    body('name').optional().trim().notEmpty(),
    body('key').optional().trim().isLength({ max: 10 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'archived', 'completed']),
    body('visibility').optional().isIn(['private', 'public']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  projectController.update
);
router.delete('/:id', requireProjectAdmin(), projectController.remove);

router.get('/:id/members', requireProjectAccess(), projectController.getMembers);
router.post(
  '/:id/members',
  requireProjectAdmin(),
  [body('userId').notEmpty(), body('role').optional().isIn(['Admin'])],
  validate,
  projectController.addMember
);
router.put(
  '/:id/members/:userId',
  requireProjectAdmin(),
  [body('role').isIn(['Admin'])],
  validate,
  projectController.updateMemberRole
);
router.delete('/:id/members/:userId', requireProjectAdmin(), projectController.removeMember);

router.get('/:id/stats', requireProjectAccess(), projectController.getStats);

export default router;
