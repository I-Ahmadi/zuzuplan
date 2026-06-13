import * as docService from '../services/docService.js';

async function list(req, res, next) {
  try {
    const result = await docService.listDocs(req.params.projectId, req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const doc = await docService.createDoc(req.params.projectId, req.user.id, req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const doc = await docService.updateDoc(req.params.projectId, req.params.docId, req.user.id, req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await docService.deleteDoc(req.params.projectId, req.params.docId, req.user.id);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

export { list, create, update, remove };
