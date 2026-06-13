import * as commentService from '../services/commentService.js';

async function list(req, res, next) {
  try {
    const result = await commentService.getComments(req.params.taskId, req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const comment = await commentService.createComment(
      req.params.taskId,
      req.user.id,
      req.body.content
    );
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const comment = await commentService.updateComment(
      req.params.id,
      req.user.id,
      req.body.content
    );
    res.json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await commentService.deleteComment(req.params.id, req.user.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}

export { list, create, update, remove };
