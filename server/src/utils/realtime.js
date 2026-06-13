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

