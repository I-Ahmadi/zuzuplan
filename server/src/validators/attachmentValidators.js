import { param } from 'express-validator';

export const taskId = [
  param('taskId').matches(/^c[a-z0-9]{24}$/).withMessage('Task id must be a valid id'),
];

export const attachmentId = [
  param('id').matches(/^c[a-z0-9]{24}$/).withMessage('Attachment id must be a valid id'),
];
