import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess, requireProjectAdmin } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as projectController from '../controllers/projectController.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.get('/', projectController.list);
router.get('/invites/:token', projectController.getInviteByToken);
router.post('/invites/:token/accept', projectController.acceptInvite);
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('key').trim().notEmpty().isLength({ max: 10 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'archived', 'completed']),
    body('visibility').optional().isIn(['private', 'public']),
    body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
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
    body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  validate,
  projectController.update
);
router.delete('/:id', requireProjectAdmin(), projectController.remove);

router.get('/:id/members', requireProjectAccess(), projectController.getMembers);
router.post(
  '/:id/members',
  requireProjectAdmin(),
  [body('userId').notEmpty(), body('role').optional().isIn(Object.values(ROLES))],
  validate,
  projectController.addMember
);
router.put(
  '/:id/members/:userId',
  requireProjectAdmin(),
  [body('role').isIn(Object.values(ROLES))],
  validate,
  projectController.updateMemberRole
);
router.delete('/:id/members/:userId', requireProjectAdmin(), projectController.removeMember);

router.get('/:id/invites', requireProjectAccess(), projectController.getInvites);
router.post(
  '/:id/invites',
  requireProjectAdmin(),
  [body('email').isEmail().normalizeEmail(), body('role').optional().isIn(Object.values(ROLES))],
  validate,
  projectController.createInvite
);
router.delete('/:id/invites/:inviteId', requireProjectAdmin(), projectController.revokeInvite);

router.get('/:id/stats', requireProjectAccess(), projectController.getStats);

export default router;
