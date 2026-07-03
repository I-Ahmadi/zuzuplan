import * as analyticsService from '../services/analyticsService.js';

async function deliveryHealth(req, res, next) {
  try {
    const data = await analyticsService.getDeliveryHealthAnalytics(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { deliveryHealth };
