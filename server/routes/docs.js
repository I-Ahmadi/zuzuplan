import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/authorization.js';
import { validate } from '../middleware/validation.js';
import * as docController from '../controllers/docController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectAccess());

router.get('/', docController.list);
router.post(
  '/',
  [body('title').trim().notEmpty(), body('content').optional().trim(), body('pinned').optional().isBoolean()],
  validate,
  docController.create
);
router.put(
  '/:docId',
  [
    body('title').optional().trim().notEmpty(),
    body('content').optional().trim(),
    body('pinned').optional().isBoolean(),
  ],
  validate,
  docController.update
);
router.delete('/:docId', docController.remove);

export default router;
