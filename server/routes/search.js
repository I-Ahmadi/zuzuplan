import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as searchController from '../controllers/searchController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', searchController.globalSearch);

export default router;
