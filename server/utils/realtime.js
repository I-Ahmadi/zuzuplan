import { firebaseAdmin } from '../config/firebase.js';

export function sendRealtimeUpdate(path, data) {
  if (!firebaseAdmin) return;
  try {
    const db = firebaseAdmin.database();
    if (db) db.ref(path).set(data);
  } catch (err) {
    console.warn('Realtime update failed:', err.message);
  }
}

export function notifyTaskUpdate(projectId, taskId, data) {
  sendRealtimeUpdate(`projects/${projectId}/tasks/${taskId}`, data);
}

export function notifyCommentUpdate(projectId, taskId, commentId, data) {
  sendRealtimeUpdate(`projects/${projectId}/tasks/${taskId}/comments/${commentId}`, data);
}

export function notifyActivityUpdate(projectId, activity) {
  sendRealtimeUpdate(`projects/${projectId}/activity/${activity.id}`, activity);
}

export function notifyNotificationUpdate(userId, notification) {
  sendRealtimeUpdate(`users/${userId}/notifications/${notification.id}`, notification);
}
