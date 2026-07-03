import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as homeController from '../controllers/homeController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', homeController.home);

export default router;
