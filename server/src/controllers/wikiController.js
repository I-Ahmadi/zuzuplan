import * as wikiService from '../services/wikiService.js';

export async function list(req, res, next) {
  try {
    const result = await wikiService.listWikiPages(req.params.projectId, req.user.id, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const page = await wikiService.createWikiPage(req.params.projectId, req.user.id, req.body);
    res.status(201).json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const page = await wikiService.getWikiPage(req.params.projectId, req.params.pageId, req.user.id);
    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const page = await wikiService.updateWikiPage(req.params.projectId, req.params.pageId, req.user.id, req.body);
    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await wikiService.deleteWikiPage(req.params.projectId, req.params.pageId, req.user.id);
    res.json({ success: true, message: 'Wiki page deleted' });
  } catch (err) {
    next(err);
  }
}
