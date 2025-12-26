import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

interface AppErrorConstructor {
  new (message: string, statusCode?: number): AppError;
}

const AppErrorFn = function (
  this: AppError,
  message: string,
  statusCode: number = 500
) {
  Error.call(this, message);

  this.name = 'AppError';
  this.message = message;
  this.statusCode = statusCode;
  this.isOperational = true;

  Error.captureStackTrace(this, AppErrorFn);
};

AppErrorFn.prototype = Object.create(Error.prototype);
AppErrorFn.prototype.constructor = AppErrorFn;

export const AppError = AppErrorFn as unknown as AppErrorConstructor;

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ('statusCode' in err && (err as AppError).isOperational) {
    return res.status((err as AppError).statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: (err as AppError).statusCode,
      },
    });
  }

  // MongoDB/Mongoose duplicate key
  if (err.name === 'MongoServerError') {
    const mongoError = err as any;
    if (mongoError.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        error: {
          message: `A record with this ${field} already exists`,
          statusCode: 409,
        },
      });
    }
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        statusCode: 400,
      },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const messages = Object.values(validationError.errors || {}).map(
      (e: any) => e.message
    );
    return res.status(400).json({
      success: false,
      error: {
        message: messages.join(', ') || 'Validation error',
        statusCode: 400,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        statusCode: 401,
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        statusCode: 401,
      },
    });
  }

  // Default error (500)
  console.error('Error:', err);
  return res.status(500).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
      statusCode: 500,
    },
  });
};

