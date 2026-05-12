import * as integrationService from '../services/integrationService.js';
import * as githubService from '../services/githubService.js';

async function list(req, res, next) {
  try {
    const result = await integrationService.listIntegrations(req.params.projectId, req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const integration = await integrationService.createIntegration(req.params.projectId, req.user.id, req.body);
    res.status(201).json({ success: true, data: integration });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const integration = await integrationService.updateIntegration(req.params.projectId, req.params.id, req.user.id, req.body);
    res.json({ success: true, data: integration });
  } catch (err) {
    next(err);
  }
}

async function syncGitHub(req, res, next) {
  try {
    const result = await githubService.syncGitHubRepository(req.params.projectId, req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export { list, create, update, syncGitHub };
