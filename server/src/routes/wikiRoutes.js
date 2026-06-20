import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as wikiController from '../controllers/wikiController.js';
import * as wikiValidators from '../validators/wikiValidators.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(wikiValidators.projectId, validate);

router.get('/', wikiValidators.listWikiPages, validate, wikiController.list);
router.post('/', wikiValidators.createWikiPage, validate, wikiController.create);
router.get('/:pageId', wikiValidators.pageId, validate, wikiController.getById);
router.put('/:pageId', wikiValidators.updateWikiPage, validate, wikiController.update);
router.delete('/:pageId', wikiValidators.pageId, validate, wikiController.remove);

export default router;
