import { ActivityLog } from '../models';
import { getSkip, createPaginationResult } from '../utils/pagination';
import { notifyActivityUpdate } from '../utils/realtime';

export interface LogActivityParams {
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  details?: string;
}

export const logActivity = async (params: LogActivityParams) => {
  const activity = await ActivityLog.create({
    projectId: params.projectId,
    taskId: params.taskId,
    userId: params.userId,
    action: params.action,
    details: params.details,
  });

  const populatedActivity = await ActivityLog.findById(activity._id)
    .populate('userId', 'id name email avatar')
    .populate('taskId', 'id title')
    .lean();

  // Send real-time update
  await notifyActivityUpdate(params.projectId, populatedActivity);

  return populatedActivity;
};

export const getActivityLog = async (
  projectId: string,
  filters: {
    taskId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = getSkip(page, limit);

  const query: any = { projectId };

  if (filters.taskId) {
    query.taskId = filters.taskId;
  }

  if (filters.userId) {
    query.userId = filters.userId;
  }

  const [activities, total] = await Promise.all([
    ActivityLog.find(query)
      .populate('userId', 'id name email avatar')
      .populate('taskId', 'id title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  return createPaginationResult(activities, total, page, limit);
};
