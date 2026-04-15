import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { notifyNotificationUpdate } from '../utils/realtime.js';
import { sendNotificationEmail } from '../utils/email.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createNotification({ userId, type, message, relatedId, sendEmail }) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, relatedId: relatedId || null },
  });
  try {
    notifyNotificationUpdate(userId, notification);
  } catch (_) {}
  if (sendEmail) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      try {
        await sendNotificationEmail(user.email, `Notification: ${type}`, message);
      } catch (_) {}
    }
  }
  return notification;
}

export async function getNotifications(userId, options = {}) {
  const { page, limit } = getPageAndLimit(options);
  const skip = getSkip(page, limit);
  const where = { userId };
  if (options.read !== undefined) where.read = options.read === 'true' || options.read === true;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function markNotificationAsRead(notificationId, userId) {
  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) throw new AppError('Notification not found', 404);
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllNotificationsAsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function notifyTaskAssignment(assigneeId, taskId, taskTitle, projectName) {
  const message = `You were assigned to task "${taskTitle}" in project "${projectName}".`;
  return createNotification({
    userId: assigneeId,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    message,
    relatedId: taskId,
    sendEmail: true,
  });
}

export async function notifyDueDateReminder(userId, taskId, taskTitle, daysUntilDue) {
  const type = daysUntilDue < 0 ? NOTIFICATION_TYPES.TASK_OVERDUE : NOTIFICATION_TYPES.TASK_DUE_SOON;
  const message =
    daysUntilDue < 0
      ? `Task "${taskTitle}" is overdue.`
      : `Task "${taskTitle}" is due in ${daysUntilDue} day(s).`;
  return createNotification({
    userId,
    type,
    message,
    relatedId: taskId,
    sendEmail: true,
  });
}
