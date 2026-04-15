import * as notificationService from '../services/notificationService.js';

export async function list(req, res, next) {
  try {
    const result = await notificationService.getNotifications(req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllNotificationsAsRead(req.user.id);
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
}
