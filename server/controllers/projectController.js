import * as projectService from '../services/projectService.js';

async function list(req, res, next) {
  try {
    const result = await projectService.getProjects(req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user.id);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const project = await projectService.createProject(req.user.id, req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

async function getMembers(req, res, next) {
  try {
    const members = await projectService.getMembers(req.params.id, req.user.id);
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const members = await projectService.addMember(
      req.params.id,
      req.user.id,
      req.body.userId,
      req.body.role
    );
    res.status(201).json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

async function getInvites(req, res, next) {
  try {
    const invites = await projectService.getInvites(req.params.id, req.user.id);
    res.json({ success: true, data: invites });
  } catch (err) {
    next(err);
  }
}

async function createInvite(req, res, next) {
  try {
    const invite = await projectService.createInvite(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data: invite });
  } catch (err) {
    next(err);
  }
}

async function revokeInvite(req, res, next) {
  try {
    await projectService.revokeInvite(req.params.id, req.params.inviteId, req.user.id);
    res.json({ success: true, message: 'Invite revoked' });
  } catch (err) {
    next(err);
  }
}

async function getInviteByToken(req, res, next) {
  try {
    const invite = await projectService.getInviteByToken(req.params.token);
    res.json({ success: true, data: invite });
  } catch (err) {
    next(err);
  }
}

async function acceptInvite(req, res, next) {
  try {
    const project = await projectService.acceptInvite(req.params.token, req.user.id);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

async function updateMemberRole(req, res, next) {
  try {
    const member = await projectService.updateMemberRole(
      req.params.id,
      req.user.id,
      req.params.userId,
      req.body.role
    );
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    await projectService.removeMember(req.params.id, req.user.id, req.params.userId);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await projectService.getProjectStats(req.params.id, req.user.id);
    res.json({ success: true, data: stats });
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
  getMembers,
  addMember,
  getInvites,
  createInvite,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
  updateMemberRole,
  removeMember,
  getStats,
};
