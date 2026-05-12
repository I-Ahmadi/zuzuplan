import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as integrationController from '../controllers/integrationController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', integrationController.list);
router.post('/:id/sync-github', integrationController.syncGitHub);
router.post('/', [
  body('provider').isIn(['GITHUB', 'GITLAB']),
  body('name').optional().trim(),
  body('repository').optional().trim(),
  body('status').optional().isIn(['CONNECTED', 'DISABLED', 'ERROR']),
], validate, integrationController.create);
router.put('/:id', integrationController.update);

export default router;
