import * as dashboardService from '../services/dashboardService.js';

async function forYou(req, res, next) {
  try {
    const data = await dashboardService.getForYouDashboard(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { forYou };
