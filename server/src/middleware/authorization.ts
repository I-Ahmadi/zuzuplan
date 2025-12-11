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

export const requireProjectAccess = (minRole: string = ROLES.VIEWER) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const projectId = req.params.projectId || req.body.projectId;
      if (!projectId) {
        throw new AppError('Project ID required', 400);
      }

      const project = await Project.findById(projectId);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if user is owner
      if (project.ownerId.toString() === req.user.id) {
        req.user.role = ROLES.OWNER;
        return next();
      }

      // Check if user is a member
      const membership = await ProjectMember.findOne({
        projectId: projectId,
        userId: req.user.id,
      });

      if (!membership) {
        throw new AppError('Access denied to this project', 403);
      }

      // Check role hierarchy
      const roleHierarchy = {
        [ROLES.OWNER]: 4,
        [ROLES.ADMIN]: 3,
        [ROLES.MEMBER]: 2,
        [ROLES.VIEWER]: 1,
      };

      const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[minRole as keyof typeof roleHierarchy] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        throw new AppError('Insufficient permissions for this project', 403);
      }

      req.user.role = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireProjectOwner = requireProjectAccess(ROLES.OWNER);
export const requireProjectAdmin = requireProjectAccess(ROLES.ADMIN);
export const requireProjectMember = requireProjectAccess(ROLES.MEMBER);
