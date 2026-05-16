import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as ideaController from '../controllers/ideaController.js';
import {
  IDEA_EXPERIMENT_STATUSES,
  IDEA_GOAL_STATUSES,
  IDEA_LINK_TARGET_TYPES,
  IDEA_REQUIREMENT_TYPES,
  IDEA_SECTION_TYPES,
  IDEA_STAGES,
} from '../services/ideaService.js';

const router = express.Router();
const collections = ['goals', 'requirements', 'experiments', 'links'];

router.use(authenticate);

router.get('/', ideaController.list);
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('summary').optional({ nullable: true }).trim(),
    body('problem').optional({ nullable: true }).trim(),
    body('opportunity').optional({ nullable: true }).trim(),
    body('stage').optional().isIn(IDEA_STAGES),
    body('confidence').optional().isInt({ min: 0, max: 100 }),
    body('tags').optional(),
  ],
  validate,
  ideaController.create
);

router.get('/:ideaId', ideaController.getById);
router.put(
  '/:ideaId',
  [
    body('title').optional().trim().notEmpty(),
    body('summary').optional({ nullable: true }).trim(),
    body('problem').optional({ nullable: true }).trim(),
    body('opportunity').optional({ nullable: true }).trim(),
    body('stage').optional().isIn(IDEA_STAGES),
    body('confidence').optional().isInt({ min: 0, max: 100 }),
    body('tags').optional(),
  ],
  validate,
  ideaController.update
);
router.delete('/:ideaId', ideaController.remove);
router.post('/:ideaId/archive', ideaController.archive);
router.post('/:ideaId/finalize', ideaController.finalize);

router.get('/:ideaId/sections', ideaController.listSections);
router.post(
  '/:ideaId/sections',
  [
    body('title').trim().notEmpty(),
    body('type').optional().isIn(IDEA_SECTION_TYPES),
    body('contentJson').optional(),
    body('plainText').optional().trim(),
    body('order').optional().isInt(),
  ],
  validate,
  ideaController.createSection
);
router.patch(
  '/:ideaId/sections/:sectionId',
  [
    body('title').optional().trim().notEmpty(),
    body('type').optional().isIn(IDEA_SECTION_TYPES),
    body('contentJson').optional(),
    body('plainText').optional().trim(),
    body('order').optional().isInt(),
  ],
  validate,
  ideaController.updateSection
);

router.post('/:ideaId/versions', [body('label').optional().trim()], validate, ideaController.createVersion);
router.get('/:ideaId/versions', ideaController.listVersions);
router.post('/:ideaId/versions/:versionId/restore-preview', ideaController.restoreVersionPreview);

router.get('/:ideaId/comments', ideaController.listComments);
router.post(
  '/:ideaId/comments',
  [body('content').trim().notEmpty(), body('sectionId').optional({ nullable: true }).trim(), body('parentId').optional({ nullable: true }).trim()],
  validate,
  ideaController.createComment
);
router.patch(
  '/:ideaId/comments/:commentId',
  [body('content').optional().trim().notEmpty(), body('resolved').optional().isBoolean()],
  validate,
  ideaController.updateComment
);
router.delete('/:ideaId/comments/:commentId', ideaController.deleteComment);

router.post('/:ideaId/conversion-preview', ideaController.conversionPreview);
router.post('/:ideaId/convert', ideaController.convert);
router.post('/:ideaId/ai/:action', [param('action').isIn(['summarize', 'generate-plan', 'generate-tasks'])], validate, ideaController.ai);

router.get('/:ideaId/:collection', [param('collection').isIn(collections)], validate, ideaController.listCollection);
router.post(
  '/:ideaId/:collection',
  [
    param('collection').isIn(collections),
    body('title').trim().notEmpty(),
    body('status').optional().custom((value, { req }) => {
      if (req.params.collection === 'goals') return IDEA_GOAL_STATUSES.includes(value);
      if (req.params.collection === 'experiments') return IDEA_EXPERIMENT_STATUSES.includes(value);
      return true;
    }),
    body('type').optional().custom((value, { req }) => {
      if (req.params.collection === 'requirements') return IDEA_REQUIREMENT_TYPES.includes(value);
      if (req.params.collection === 'links') return IDEA_LINK_TARGET_TYPES.includes(value);
      return true;
    }),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  validate,
  ideaController.createCollectionItem
);
router.patch(
  '/:ideaId/:collection/:itemId',
  [
    param('collection').isIn(collections),
    body('title').optional().trim().notEmpty(),
    body('status').optional().custom((value, { req }) => {
      if (req.params.collection === 'goals') return IDEA_GOAL_STATUSES.includes(value);
      if (req.params.collection === 'experiments') return IDEA_EXPERIMENT_STATUSES.includes(value);
      return true;
    }),
    body('type').optional().custom((value, { req }) => {
      if (req.params.collection === 'requirements') return IDEA_REQUIREMENT_TYPES.includes(value);
      if (req.params.collection === 'links') return IDEA_LINK_TARGET_TYPES.includes(value);
      return true;
    }),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  validate,
  ideaController.updateCollectionItem
);
router.delete('/:ideaId/:collection/:itemId', [param('collection').isIn(collections)], validate, ideaController.deleteCollectionItem);

export default router;
