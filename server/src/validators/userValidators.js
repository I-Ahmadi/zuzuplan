import { body, param, query } from 'express-validator';

export const updateMe = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('currentPassword').optional().isString(),
  body('password').optional().isLength({ min: 6 }),
];

export const updateAvatar = [
  body('avatarUrl').optional({ nullable: true, checkFalsy: true }).isString(),
];

export const revokeOtherSessions = [
  body('currentRefreshToken').optional().isString(),
];

export const userId = [
  param('id').matches(/^c[a-z0-9]{24}$/).withMessage('User id must be a valid id'),
];

export const getPreferences = [
  query('scope').optional().isIn(['default', 'profile', 'workspace', 'notifications', 'all']),
];

export const updatePreferences = [
  body('defaultView').optional({ nullable: true }).trim(),
  body('density').optional({ nullable: true }).trim(),
  body('theme').optional({ nullable: true }).trim(),
  body('profileNote').optional({ nullable: true }).trim(),
  body('sidebarDefault').optional({ nullable: true }).trim(),
  body('projectSelectorBehavior').optional({ nullable: true }).trim(),
  body('rememberLastSpace').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('inAppNotifications').optional().isBoolean(),
  body('dueSoonNotifications').optional().isBoolean(),
  body('assignmentNotifications').optional().isBoolean(),
  body('mentionNotifications').optional().isBoolean(),
  body('commentNotifications').optional().isBoolean(),
  body('digestFrequency').optional({ nullable: true }).trim(),
  body('quietHoursEnabled').optional().isBoolean(),
  body('quietHoursStart')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('quietHoursEnd')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/),
];
