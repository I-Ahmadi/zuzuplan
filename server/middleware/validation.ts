import { NextFunction } from 'express';

// Validation middleware - currently a no-op
// Can be replaced with express-validator or custom validation logic
export const validate = () => {
  return (_req: unknown, _res: unknown, next: NextFunction) => {
    // No validation performed - just pass through
    next();
  };
};
