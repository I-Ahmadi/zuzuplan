import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as searchController from '../controllers/searchController.js';
import * as searchValidators from '../validators/searchValidators.js';

const router = express.Router();

router.use(authenticate);
router.get('/', searchValidators.globalSearch, validate, searchController.globalSearch);

export default router;
