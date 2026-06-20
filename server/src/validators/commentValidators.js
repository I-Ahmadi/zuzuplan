import { body, param, query } from 'express-validator';

export const taskId = [
  param('taskId').matches(/^c[a-z0-9]{24}$/).withMessage('Task id must be a valid id'),
];

export const listComments = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

export const commentId = [
  param('id').matches(/^c[a-z0-9]{24}$/).withMessage('Comment id must be a valid id'),
];

export const createComment = [
  body('content').trim().notEmpty().withMessage('Content is required'),
];

export const updateComment = [
  ...commentId,
  body('content').trim().notEmpty().withMessage('Content is required'),
];
