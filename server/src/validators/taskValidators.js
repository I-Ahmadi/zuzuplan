import { body, param, query } from 'express-validator';
import { ISSUE_TYPE, TASK_PRIORITY, TASK_STATUS } from '../utils/constants.js';

const STATUS_VALUES = [...Object.values(TASK_STATUS), 'TODO', 'CANCELLED'];

export const projectId = [
  param('projectId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Project id must be a valid id'),
];

export const listTasks = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(STATUS_VALUES),
  query('type').optional().isIn(Object.values(ISSUE_TYPE)),
  query('assigneeId')
    .optional()
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Assignee id must be a valid id'),
  query('priority').optional().isIn(Object.values(TASK_PRIORITY)),
  query('sprintId')
    .optional()
    .custom((value) => value === 'backlog' || /^c[a-z0-9]{24}$/.test(value))
    .withMessage('Sprint id must be a valid id'),
  query('search').optional().trim(),
];

export const taskId = [
  param('id')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
];

export const subtaskId = [
  param('id')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  param('subtaskId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Subtask id must be a valid id'),
];

export const linkId = [
  param('id')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  param('linkId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Link id must be a valid id'),
];

export const createTask = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional({ nullable: true }).trim(),
  body('assigneeId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Assignee id must be a valid id'),
  body('dueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('type').optional().isIn(Object.values(ISSUE_TYPE)),
  body('estimate').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body('branchName').optional({ nullable: true }).trim(),
  body('blockedReason').optional({ nullable: true }).trim(),
  body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
  body('status').optional().isIn(STATUS_VALUES),
  body('sprintId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Sprint id must be a valid id'),
];

export const updateTask = [
  ...taskId,
  body('title').optional().trim().notEmpty(),
  body('description').optional({ nullable: true }).trim(),
  body('assigneeId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Assignee id must be a valid id'),
  body('dueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('type').optional().isIn(Object.values(ISSUE_TYPE)),
  body('estimate').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body('branchName').optional({ nullable: true }).trim(),
  body('blockedReason').optional({ nullable: true }).trim(),
  body('priority').optional().isIn(Object.values(TASK_PRIORITY)),
  body('status').optional().isIn(STATUS_VALUES),
  body('sprintId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Sprint id must be a valid id'),
];

export const createSubtask = [
  ...taskId,
  body('title').trim().notEmpty().withMessage('Title is required'),
];

export const updateSubtask = [
  ...subtaskId,
  body('title').optional().trim().notEmpty(),
  body('completed').optional().isBoolean(),
];

export const createTaskLink = [
  ...taskId,
  body('targetTaskId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Target task id must be a valid id'),
  body('type').optional({ nullable: true }).trim(),
];
