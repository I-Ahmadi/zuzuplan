import * as inboxService from '../services/inboxService.js';

async function list(req, res, next) {
  try {
    const result = await inboxService.listInboxItems(req.user.id, req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination, unread: result.unread });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const item = await inboxService.updateInboxItem(req.user.id, req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Inbox item not found' } });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await inboxService.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export { list, update, markAllRead };
