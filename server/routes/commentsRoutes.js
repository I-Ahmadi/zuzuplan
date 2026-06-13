import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as commentController from '../controllers/commentController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', commentController.list);
router.post(
  '/',
  [body('content').trim().notEmpty()],
  validate,
  commentController.create
);

router.put(
  '/:id',
  [body('content').trim().notEmpty()],
  validate,
  commentController.update
);
router.delete('/:id', commentController.remove);

export default router;
