import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as commentController from '../controllers/commentController.js';
import * as commentValidators from '../validators/commentValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(commentValidators.taskId, validate);

router.get('/', commentValidators.listComments, validate, commentController.list);
router.post('/', commentValidators.createComment, validate, commentController.create);
router.put('/:id', commentValidators.updateComment, validate, commentController.update);
router.delete('/:id', commentValidators.commentId, validate, commentController.remove);

export default router;
