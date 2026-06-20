import { body, param, query } from 'express-validator';

const ENVIRONMENTS = ['production', 'staging', 'preview'];
const DEPLOYMENT_STATUSES = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'ROLLED_BACK'];
const PR_STATUSES = ['OPEN', 'MERGED', 'CLOSED', 'DRAFT'];
const REVIEW_STATES = ['REQUESTED', 'APPROVED', 'CHANGES_REQUESTED', 'MERGED'];
const CI_STATUSES = ['UNKNOWN', 'PENDING', 'SUCCESS', 'FAILED'];

export const projectId = [
  param('projectId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Project id must be a valid id'),
];

export const deliveryItemId = [
  param('id')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Delivery item id must be a valid id'),
];

export const listPullRequests = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(PR_STATUSES),
  query('reviewState').optional().isIn(REVIEW_STATES),
  query('ciStatus').optional().isIn(CI_STATUSES),
  query('search').optional().trim(),
];

export const createPullRequest = [
  body('taskId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  body('provider').optional({ nullable: true }).trim(),
  body('repository').trim().notEmpty().withMessage('Repository is required'),
  body('number').isInt({ min: 1 }),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('url').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('branch').optional({ nullable: true }).trim(),
  body('targetBranch').optional({ nullable: true }).trim(),
  body('status').optional().isIn(PR_STATUSES),
  body('reviewState').optional().isIn(REVIEW_STATES),
  body('ciStatus').optional().isIn(CI_STATUSES),
  body('author').optional({ nullable: true }).trim(),
  body('openedAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('openedAt must be a valid ISO 8601 date'),
  body('mergedAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('mergedAt must be a valid ISO 8601 date'),
];

export const updatePullRequest = [
  ...deliveryItemId,
  body('taskId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  body('status').optional().isIn(PR_STATUSES),
  body('reviewState').optional().isIn(REVIEW_STATES),
  body('ciStatus').optional().isIn(CI_STATUSES),
  body('mergedAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('mergedAt must be a valid ISO 8601 date'),
];

export const listDeployments = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('environment').optional().isIn(ENVIRONMENTS),
  query('status').optional().isIn(DEPLOYMENT_STATUSES),
  query('search').optional().trim(),
];

export const createDeployment = [
  body('taskId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Task id must be a valid id'),
  body('pullRequestId')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Pull request id must be a valid id'),
  body('environment').optional().isIn(ENVIRONMENTS),
  body('status').optional().isIn(DEPLOYMENT_STATUSES),
  body('version').optional({ nullable: true }).trim(),
  body('url').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('deployedBy').optional({ nullable: true }).trim(),
  body('deployedAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('deployedAt must be a valid ISO 8601 date'),
];

export const updateDeployment = [
  ...deliveryItemId,
  body('environment').optional().isIn(ENVIRONMENTS),
  body('status').optional().isIn(DEPLOYMENT_STATUSES),
  body('version').optional({ nullable: true }).trim(),
  body('url').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('deployedBy').optional({ nullable: true }).trim(),
  body('deployedAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('deployedAt must be a valid ISO 8601 date'),
];
