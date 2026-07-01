import * as taskService from '../services/taskService.js';

async function list(req, res, next) {
  try {
    const filters = {
      ...req.query,
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      sprintId: req.query.sprintId,
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

async function backlog(req, res, next) {
  try {
    const filters = {
      ...req.query,
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      sprintId: req.query.sprintId,
      search: req.query.search,
    };
    const result = await taskService.getBacklogTasks(req.params.projectId, req.user.id, filters);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listActive(req, res, next) {
  try {
    const filters = {
      ...req.query,
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      sprintId: req.query.sprintId,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await taskService.getListTasks(req.params.projectId, req.user.id, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function board(req, res, next) {
  try {
    const filters = {
      ...req.query,
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      sprintId: req.query.sprintId,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await taskService.getBoardTasks(req.params.projectId, req.user.id, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function timeline(req, res, next) {
  try {
    const filters = {
      search: req.query.search,
      statusCategory: req.query.statusCategory,
      assigneeId: req.query.assigneeId,
      from: req.query.from,
      to: req.query.to,
      zoom: req.query.zoom,
      limit: req.query.limit,
    };
    const result = await taskService.getTimelineTasks(req.params.projectId, req.user.id, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const result = await taskService.getTaskSummary(req.params.projectId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function workload(req, res, next) {
  try {
    const result = await taskService.getTaskWorkload(req.params.projectId, req.user.id);
    res.json({ success: true, data: result });
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

async function addTaskLink(req, res, next) {
  try {
    const link = await taskService.addTaskLink(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    next(err);
  }
}

async function deleteTaskLink(req, res, next) {
  try {
    await taskService.deleteTaskLink(req.params.id, req.params.linkId, req.user.id);
    res.json({ success: true, message: 'Linked work item removed' });
  } catch (err) {
    next(err);
  }
}

export {
  list,
  backlog,
  listActive,
  board,
  timeline,
  summary,
  workload,
  getById,
  create,
  update,
  remove,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addTaskLink,
  deleteTaskLink,
};
