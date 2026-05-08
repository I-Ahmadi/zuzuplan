import * as sprintService from '../services/sprintService.js';

async function list(req, res, next) {
  try {
    const sprints = await sprintService.listSprints(req.params.projectId, req.user.id);
    res.json({ success: true, data: sprints });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const sprint = await sprintService.createSprint(req.params.projectId, req.user.id, req.body);
    res.status(201).json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const sprint = await sprintService.updateSprint(req.params.projectId, req.params.sprintId, req.user.id, req.body);
    res.json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function start(req, res, next) {
  try {
    const sprint = await sprintService.startSprint(req.params.projectId, req.params.sprintId, req.user.id, req.body);
    res.json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function complete(req, res, next) {
  try {
    const sprint = await sprintService.completeSprint(req.params.projectId, req.params.sprintId, req.user.id, req.body);
    res.json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await sprintService.deleteSprint(req.params.projectId, req.params.sprintId, req.user.id);
    res.json({ success: true, message: 'Sprint deleted' });
  } catch (err) {
    next(err);
  }
}

async function addTasks(req, res, next) {
  try {
    const sprint = await sprintService.addTasksToSprint(req.params.projectId, req.params.sprintId, req.user.id, req.body.taskIds);
    res.json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function removeTask(req, res, next) {
  try {
    const sprint = await sprintService.removeTaskFromSprint(req.params.projectId, req.params.sprintId, req.params.taskId, req.user.id);
    res.json({ success: true, data: sprint });
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    await sprintService.reorderTasks(req.params.projectId, req.params.sprintId, req.user.id, req.body.orderedTaskIds);
    res.json({ success: true, message: 'Tasks reordered' });
  } catch (err) {
    next(err);
  }
}

export { list, create, update, start, complete, remove, addTasks, removeTask, reorder };
