import { query } from 'express-validator';

export const listActivity = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('projectId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Project id must be a valid id'),
  query('taskId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  query('type').optional().trim(),
  query('entityType').optional().trim(),
];
