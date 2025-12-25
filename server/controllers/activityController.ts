import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getActivityLog } from '../services/activityLogService';

export const getActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const projectId = (req.params as any).projectId;
    const result = await getActivityLog(projectId, {
      taskId: req.query.taskId as string,
      userId: req.query.userId as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });

    res.json({
      success: true,
      message: 'Activity log retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

