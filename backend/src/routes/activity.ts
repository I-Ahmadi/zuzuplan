import { Router } from 'express';
import { getActivity } from '../controllers/activityController';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess } from '../middleware/authorization';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', getActivity);

export default router;

