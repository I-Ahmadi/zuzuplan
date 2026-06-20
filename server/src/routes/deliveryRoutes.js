import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as deliveryController from '../controllers/deliveryController.js';
import * as deliveryValidators from '../validators/deliveryValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(deliveryValidators.projectId, validate);

router.get('/pull-requests', deliveryValidators.listPullRequests, validate, deliveryController.listPullRequests);
router.post('/pull-requests', deliveryValidators.createPullRequest, validate, deliveryController.createPullRequest);
router.put('/pull-requests/:id', deliveryValidators.updatePullRequest, validate, deliveryController.updatePullRequest);
router.get('/deployments', deliveryValidators.listDeployments, validate, deliveryController.listDeployments);
router.post('/deployments', deliveryValidators.createDeployment, validate, deliveryController.createDeployment);
router.put('/deployments/:id', deliveryValidators.updateDeployment, validate, deliveryController.updateDeployment);

export default router;
