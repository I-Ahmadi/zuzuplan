import * as activityLogService from '../services/activityLogService.js';

export async function list(req, res, next) {
  try {
    const result = await activityLogService.getActivityLog(req.params.projectId, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}
