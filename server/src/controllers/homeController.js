import * as homeService from '../services/homeService.js';

async function home(req, res, next) {
  try {
    const data = await homeService.getHomeDashboard(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { home };
