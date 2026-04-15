import { prisma } from '../config/database.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401);
    }
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId || payload.id },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }
    if (!user.emailVerified) {
      throw new AppError('Email not verified', 403);
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (err.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(err);
    }
  }
}
