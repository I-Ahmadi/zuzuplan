import * as activityService from '../services/activityService.js';

async function list(req, res, next) {
  try {
    const result = await activityService.listActivityEvents(req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

export { list };
