import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as reportController from '../controllers/reportController.js';
import * as reportValidators from '../validators/reportValidators.js';

const router = express.Router();

router.use(authenticate);
router.get('/delivery-health', reportValidators.deliveryHealth, validate, reportController.deliveryHealth);

export default router;
