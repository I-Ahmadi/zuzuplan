import { Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { AuthRequest } from './auth';
import { Project, ProjectMember } from '../models';
import { ROLES } from '../utils/constants';

export const requireRole = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check if user has one of the allowed roles
      if (allowedRoles.length > 0 && req.user.role) {
        if (!allowedRoles.includes(req.user.role)) {
          throw new AppError('Insufficient permissions', 403);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireProjectAccess = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const projectId = req.params.id || req.params.projectId || req.body.projectId;
      if (!projectId) {
        throw new AppError('Project ID required', 400);
      }

      const project = await Project.findById(projectId);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if user is owner (treat as admin)
      if (project.ownerId.toString() === req.user.id) {
        req.user.role = ROLES.ADMIN;
        return next();
      }

      // Check if user is an admin member
      const membership = await ProjectMember.findOne({
        projectId: projectId,
        userId: req.user.id,
      });

      if (!membership) {
        throw new AppError('Access denied to this project', 403);
      }

      // Only admin role is allowed
      if (membership.role !== ROLES.ADMIN) {
        throw new AppError('Insufficient permissions for this project', 403);
      }

      req.user.role = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireProjectAdmin = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const projectId = req.params.id || req.params.projectId || req.body.projectId;
      if (!projectId) {
        throw new AppError('Project ID required', 400);
      }

      const project = await Project.findById(projectId);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if user is owner (treat as admin)
      if (project.ownerId.toString() === req.user.id) {
        return next();
      }

      // Check if user is an admin member
      const membership = await ProjectMember.findOne({
        projectId: projectId,
        userId: req.user.id,
        role: ROLES.ADMIN,
      });

      if (!membership) {
        throw new AppError('Admin access required for this project', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
