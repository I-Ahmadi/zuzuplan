import { prisma } from '../config/database.js';
import { AppError } from './errorHandler.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { getProjectPermissions, getProjectRole, hasProjectPermission } from '../utils/permissions.js';

export async function resolveProjectAccess(req) {
  const projectId = req.params.projectId || req.params.id || req.body?.projectId;
  if (!projectId) {
    throw new AppError('Project ID required', 400);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const userId = req.user.id;
  const role = getProjectRole(project, userId);

  if (!role) {
    throw new AppError('Access denied to this project', 403);
  }

  req.project = project;
  req.user.role = role;
  req.user.permissions = getProjectPermissions(role);
  return project;
}

export function requireProjectAccess() {
  return async (req, res, next) => {
    try {
      await resolveProjectAccess(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireProjectAdmin() {
  return async (req, res, next) => {
    try {
      await resolveProjectAccess(req);
      if (!hasProjectPermission(req.user.role, PROJECT_PERMISSIONS.PROJECT_UPDATE)) {
        throw new AppError('Project management permission required', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireProjectPermission(permission) {
  return async (req, res, next) => {
    try {
      await resolveProjectAccess(req);
      if (!hasProjectPermission(req.user.role, permission)) {
        throw new AppError('Insufficient project permission', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
