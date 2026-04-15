import { prisma } from '../config/database.js';
import { AppError } from './errorHandler.js';
import { ROLES } from '../utils/constants.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return next(new AppError('Forbidden', 403));
    }
    next();
  };
}

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
  const isOwner = project.ownerId === userId;
  const member = project.members.find((m) => m.userId === userId);

  if (!isOwner && !member) {
    throw new AppError('Access denied to this project', 403);
  }

  req.project = project;
  req.user.role = isOwner ? ROLES.ADMIN : member.role;
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
      if (req.user.role !== ROLES.ADMIN) {
        throw new AppError('Admin access required', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
