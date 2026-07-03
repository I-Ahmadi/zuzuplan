import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as analyticsValidators from '../validators/analyticsValidators.js';

const router = express.Router();

router.use(authenticate);
router.get('/delivery-health', analyticsValidators.deliveryHealth, validate, analyticsController.deliveryHealth);

export default router;
