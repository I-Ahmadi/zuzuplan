import * as reportService from '../services/reportService.js';

async function deliveryHealth(req, res, next) {
  try {
    const data = await reportService.getDeliveryHealthReport(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { deliveryHealth };
