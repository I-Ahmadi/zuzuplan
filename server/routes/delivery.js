import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as deliveryController from '../controllers/deliveryController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/pull-requests', deliveryController.listPullRequests);
router.post('/pull-requests', [
  body('repository').trim().notEmpty(),
  body('number').isInt({ min: 1 }),
  body('title').trim().notEmpty(),
], validate, deliveryController.createPullRequest);
router.put('/pull-requests/:id', deliveryController.updatePullRequest);

router.get('/deployments', deliveryController.listDeployments);
router.post('/deployments', [
  body('environment').optional().isIn(['production', 'staging', 'preview']),
  body('status').optional().isIn(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'ROLLED_BACK']),
], validate, deliveryController.createDeployment);
router.put('/deployments/:id', deliveryController.updateDeployment);

router.get('/releases', deliveryController.listReleases);
router.post('/releases', [
  body('title').trim().notEmpty(),
  body('status').optional().isIn(['PLANNED', 'SHIPPING', 'SHIPPED', 'CANCELED']),
], validate, deliveryController.createRelease);
router.put('/releases/:id', deliveryController.updateRelease);

export default router;
