import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as taskService from '../services/taskService';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const projectId = (req.params as any).projectId;
    const result = await taskService.getTasks(projectId, req.user.id, {
      status: req.query.status as string,
      assigneeId: req.query.assigneeId as string,
      priority: req.query.priority as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });

    res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const projectId = (req.params as any).projectId;
    const task = await taskService.createTask(projectId, req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const task = await taskService.getTaskById(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const task = await taskService.updateTask(req.params.id, req.user.id, req.body);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    await taskService.deleteTask(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addSubtask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const subtask = await taskService.addSubtask(
      req.params.id,
      req.user.id,
      req.body.title
    );

    res.status(201).json({
      success: true,
      message: 'Subtask added successfully',
      data: subtask,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubtask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const subtask = await taskService.updateSubtask(
      req.params.id,
      req.params.subtaskId,
      req.user.id,
      req.body
    );

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      data: subtask,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubtask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    await taskService.deleteSubtask(
      req.params.id,
      req.params.subtaskId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Subtask deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

