import * as taskService from '../services/taskService.js';

async function list(req, res, next) {
  try {
    const filters = {
      ...req.query,
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await taskService.getTasks(req.params.projectId, req.user.id, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await taskService.createTask(req.params.projectId, req.user.id, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await taskService.updateTask(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

async function addSubtask(req, res, next) {
  try {
    const subtask = await taskService.addSubtask(req.params.id, req.user.id, req.body.title);
    res.status(201).json({ success: true, data: subtask });
  } catch (err) {
    next(err);
  }
}

async function updateSubtask(req, res, next) {
  try {
    const subtask = await taskService.updateSubtask(
      req.params.id,
      req.params.subtaskId,
      req.user.id,
      req.body
    );
    res.json({ success: true, data: subtask });
  } catch (err) {
    next(err);
  }
}

async function deleteSubtask(req, res, next) {
  try {
    await taskService.deleteSubtask(req.params.id, req.params.subtaskId, req.user.id);
    res.json({ success: true, message: 'Subtask deleted' });
  } catch (err) {
    next(err);
  }
}

export {
  list,
  getById,
  create,
  update,
  remove,
  addSubtask,
  updateSubtask,
  deleteSubtask,
};
