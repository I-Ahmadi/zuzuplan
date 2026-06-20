import { body, param, query } from 'express-validator';

const STATUS_VALUES = ['UNREAD', 'READ', 'ARCHIVED'];
const STATUS_FILTER_VALUES = [...STATUS_VALUES, 'all'];

export const listInbox = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(STATUS_FILTER_VALUES),
  query('type').optional().trim(),
  query('projectId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Project id must be a valid id'),
  query('search').optional().trim(),
  query('includeArchived').optional().isBoolean(),
];

export const inboxItem = [
  param('id').matches(/^c[a-z0-9]{24}$/).withMessage('Inbox item id must be a valid id'),
];

export const updateInboxItem = [
  ...inboxItem,
  body('status').optional().isIn(STATUS_VALUES),
  body('snoozedUntil')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('snoozedUntil must be a valid ISO 8601 date'),
];
