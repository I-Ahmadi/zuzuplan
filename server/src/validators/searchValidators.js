import { query } from 'express-validator';

export const globalSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required'),
];
