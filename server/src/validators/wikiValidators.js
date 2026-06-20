import { body, param, query } from 'express-validator';

const cuidPattern = /^c[a-z0-9]{24}$/;

export const projectId = [
  param('projectId')
    .matches(cuidPattern)
    .withMessage('Project id must be a valid id'),
];

export const pageId = [
  param('pageId')
    .matches(cuidPattern)
    .withMessage('Wiki page id must be a valid id'),
];

export const listWikiPages = [
  query('search').optional().trim().isLength({ max: 120 }),
];

export const createWikiPage = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be 160 characters or fewer'),
  body('content')
    .optional()
    .isString()
    .isLength({ max: 50000 })
    .withMessage('Content must be 50000 characters or fewer'),
];

export const updateWikiPage = [
  ...pageId,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be 160 characters or fewer'),
  body('content')
    .optional()
    .isString()
    .isLength({ max: 50000 })
    .withMessage('Content must be 50000 characters or fewer'),
];
