import { Router } from 'express';
import {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  upload,
} from '../controllers/attachmentController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

router.get('/', getAttachments);
router.post('/', upload.single('file'), uploadAttachment);
router.delete('/:id', deleteAttachment);

export default router;

