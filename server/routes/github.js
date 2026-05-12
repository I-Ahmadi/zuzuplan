import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as githubController from '../controllers/githubController.js';

const router = express.Router();

router.get('/oauth/start', authenticate, githubController.startOAuth);
router.get('/oauth/callback', githubController.callback);
router.post('/webhook', express.raw({ type: '*/*' }), githubController.webhook);

export default router;
