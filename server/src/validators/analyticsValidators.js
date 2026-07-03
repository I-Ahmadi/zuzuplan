import { query } from 'express-validator';
import { TASK_PRIORITY, TASK_STATUS } from '../utils/constants.js';

export const deliveryHealth = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('projectId')
    .optional()
    .custom((value) => value === 'all' || /^c[a-z0-9]{24}$/.test(value))
    .withMessage('Project id must be a valid id'),
  query('assigneeId')
    .optional()
    .custom((value) => value === 'all' || value === 'unassigned' || /^c[a-z0-9]{24}$/.test(value))
    .withMessage('Assignee id must be a valid id'),
  query('status').optional().custom((value) => value === 'all' || Object.values(TASK_STATUS).includes(value)),
  query('priority').optional().custom((value) => value === 'all' || Object.values(TASK_PRIORITY).includes(value)),
  query('rangeDays').optional().isInt({ min: 1, max: 365 }).withMessage('Range days must be between 1 and 365'),
  query('includeCompleted').optional().isBoolean(),
  query('includeExport').optional().isBoolean(),
];
