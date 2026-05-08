import * as searchService from '../services/searchService.js';

export async function globalSearch(req, res, next) {
  try {
    const results = await searchService.globalSearch(req.user.id, req.query.q);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}
