import * as labelService from '../services/labelService.js';

export async function list(req, res, next) {
  try {
    const labels = await labelService.getLabels(req.params.projectId, req.user.id);
    res.json({ success: true, data: labels });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const label = await labelService.createLabel(
      req.params.projectId,
      req.user.id,
      req.body
    );
    res.status(201).json({ success: true, data: label });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const label = await labelService.updateLabel(req.params.labelId, req.user.id, req.body);
    res.json({ success: true, data: label });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await labelService.deleteLabel(req.params.labelId, req.user.id);
    res.json({ success: true, message: 'Label deleted' });
  } catch (err) {
    next(err);
  }
}
