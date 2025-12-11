import admin from '../config/firebase';

export const sendRealtimeUpdate = async (
  path: string,
  data: any
): Promise<void> => {
  try {
    if (!admin.apps.length) {
      console.warn('Firebase not initialized, skipping real-time update');
      return;
    }

    const db = admin.database();
    const ref = db.ref(path);
    await ref.set(data);
  } catch (error) {
    console.error('Real-time update failed:', error);
    // Don't throw - real-time updates are not critical
  }
};

export const notifyTaskUpdate = async (
  projectId: string,
  taskId: string,
  data: unknown
): Promise<void> => {
  await sendRealtimeUpdate(`projects/${projectId}/tasks/${taskId}`, data);
};

export const notifyCommentUpdate = async (
  projectId: string,
  taskId: string,
  commentId: string,
  data: unknown
): Promise<void> => {
  await sendRealtimeUpdate(
    `projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    data
  );
};

export const notifyActivityUpdate = async (
  projectId: string,
  activity: unknown
): Promise<void> => {
  await sendRealtimeUpdate(`projects/${projectId}/activity`, activity);
};

export const notifyNotificationUpdate = async (
  userId: string,
  notification: unknown
): Promise<void> => {
  await sendRealtimeUpdate(`users/${userId}/notifications`, notification);
};

