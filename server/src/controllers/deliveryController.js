import * as deliveryService from '../services/deliveryService.js';

function listHandler(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req.params.projectId, req.user.id, req.query);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  };
}

function createHandler(fn) {
  return async (req, res, next) => {
    try {
      const item = await fn(req.params.projectId, req.user.id, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };
}

function updateHandler(fn) {
  return async (req, res, next) => {
    try {
      const item = await fn(req.params.projectId, req.params.id, req.user.id, req.body);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };
}

export const listPullRequests = listHandler(deliveryService.listPullRequests);
export const createPullRequest = createHandler(deliveryService.createPullRequest);
export const updatePullRequest = updateHandler(deliveryService.updatePullRequest);
export const listDeployments = listHandler(deliveryService.listDeployments);
export const createDeployment = createHandler(deliveryService.createDeployment);
export const updateDeployment = updateHandler(deliveryService.updateDeployment);
