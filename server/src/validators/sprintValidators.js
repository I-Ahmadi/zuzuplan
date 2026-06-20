import { body, param } from 'express-validator';

const sprintFields = [
  body('name').optional().trim().notEmpty(),
  body('goal').optional({ nullable: true }).trim(),
  body('startDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

export const projectId = [
  param('projectId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Project id must be a valid id'),
];

export const sprintId = [
  param('sprintId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Sprint id must be a valid id'),
];

export const taskInSprint = [
  param('sprintId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Sprint id must be a valid id'),
  param('taskId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
];

export const createSprint = sprintFields;

export const updateSprint = [
  ...sprintId,
  ...sprintFields,
];

export const startSprint = updateSprint;

export const completeSprint = [
  ...sprintId,
  body('moveOpenToBacklog').optional().isBoolean(),
];

export const deleteSprint = sprintId;

export const addTasks = [
  ...sprintId,
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('Task ids must be an array'),
  body('taskIds.*')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task ids must contain valid ids'),
];

export const reorderTasks = [
  ...sprintId,
  body('orderedTaskIds')
    .isArray()
    .withMessage('Ordered task ids must be an array'),
  body('orderedTaskIds.*')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Ordered task ids must contain valid ids'),
];
