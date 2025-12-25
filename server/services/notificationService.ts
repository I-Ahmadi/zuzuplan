import { Notification, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getSkip, createPaginationResult } from '../utils/pagination';
import { sendNotificationEmail } from '../utils/email';
import { notifyNotificationUpdate } from '../utils/realtime';
import { NOTIFICATION_TYPES } from '../utils/constants';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  message: string;
  relatedId?: string;
  sendEmail?: boolean;
}

export const createNotification = async (params: CreateNotificationParams) => {
  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    message: params.message,
    relatedId: params.relatedId,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate('userId', 'id email')
    .lean();

  // Send real-time update
  await notifyNotificationUpdate(params.userId, populatedNotification);

  // Send email if requested
  if (params.sendEmail && (populatedNotification?.userId as any)?.email) {
    try {
      await sendNotificationEmail(
        (populatedNotification?.userId as any).email,
        `ZuzuPlan: ${params.type}`,
        params.message
      );
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // Don't fail if email fails
    }
  }

  return populatedNotification;
};

export const getNotifications = async (
  userId: string,
  filters: {
    read?: boolean;
    page?: number;
    limit?: number;
  }
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = getSkip(page, limit);

  const query: any = { userId };

  if (filters.read !== undefined) {
    query.read = filters.read;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
  ]);

  return createPaginationResult(notifications, total, page, limit);
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const notification = await Notification.findById(notificationId).lean();

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.userId.toString() !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  const updated = await Notification.findByIdAndUpdate(
    notificationId,
    { read: true },
    { new: true }
  ).lean();

  return updated;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  await Notification.updateMany(
    {
      userId,
      read: false,
    },
    {
      read: true,
    }
  );
};

// Helper function to notify task assignment
export const notifyTaskAssignment = async (
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  projectName: string
) => {
  await createNotification({
    userId: assigneeId,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    message: `You have been assigned to task "${taskTitle}" in project "${projectName}"`,
    relatedId: taskId,
    sendEmail: true,
  });
};

// Helper function to notify due date reminders
export const notifyDueDateReminder = async (
  userId: string,
  taskId: string,
  taskTitle: string,
  daysUntilDue: number
) => {
  const message =
    daysUntilDue === 0
      ? `Task "${taskTitle}" is due today`
      : daysUntilDue < 0
      ? `Task "${taskTitle}" is overdue`
      : `Task "${taskTitle}" is due in ${daysUntilDue} day(s)`;

  await createNotification({
    userId,
    type: daysUntilDue < 0 ? NOTIFICATION_TYPES.TASK_OVERDUE : NOTIFICATION_TYPES.TASK_DUE_SOON,
    message,
    relatedId: taskId,
    sendEmail: true,
  });
};
