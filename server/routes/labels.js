import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as labelController from '../controllers/labelController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', labelController.list);
router.post(
  '/',
  [body('name').trim().notEmpty(), body('color').optional().trim()],
  validate,
  labelController.create
);
router.put(
  '/:labelId',
  [body('name').optional().trim().notEmpty(), body('color').optional().trim()],
  validate,
  labelController.update
);
router.delete('/:labelId', labelController.remove);

export default router;
