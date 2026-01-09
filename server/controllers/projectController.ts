import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as projectService from '../services/projectService';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const result = await projectService.getProjects(req.user.id, {
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const project = await projectService.createProject(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const project = await projectService.getProjectById(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const project = await projectService.updateProject(
      req.params.id,
      req.user.id,
      req.body
    );

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    await projectService.deleteProject(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const getMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const members = await projectService.getMembers(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Members retrieved successfully',
      data: members,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const addMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const member = await projectService.addMember(
      req.params.id,
      req.user.id,
      req.body.userId,
      req.body.role
    );

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: member,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const member = await projectService.updateMemberRole(
      req.params.id,
      req.user.id,
      req.params.userId,
      req.body.role
    );

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: member,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    await projectService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const getProjectStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const stats = await projectService.getProjectStats(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Project stats retrieved successfully',
      data: stats,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

