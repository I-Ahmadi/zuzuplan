import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const refreshExpiryMs = JWT_REFRESH_EXPIRES_IN.endsWith('d')
                        ? parseInt(JWT_REFRESH_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000
                        : 7 * 24 * 60 * 60 * 1000;

function omitUser(user) {
  if (!user) return null;
  const { password: _pw, emailVerificationToken: _evt, passwordResetToken: _prt, passwordResetExpires: _pre, ...rest } = user;
  return rest;
}







// -----------------------Reviewed-----------------------
export async function register(email, password, name) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Registration attempt with existing email: ${email}`);
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword         = await bcrypt.hash(password, 12);
  const rawToken               = generateToken();
  const emailVerificationToken = hashToken(rawToken);

  const user = await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      name: name,
      emailVerificationToken,
    },
  });

  try {
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    console.warn(`Verification email failed: ${err.message}`);
  }

  const accessToken  = generateAccessToken({ userId: user.id });
  const refreshToken = generateRefreshToken({ userId: user.id });
  const expiresAt    = new Date(Date.now() + refreshExpiryMs);

  await prisma.refreshToken.create({
    data: { 
      token: refreshToken, 
      userId: user.id, 
      expiresAt: expiresAt 
    },
  });

  if (! user) return null;

  const {
    password: _pw,
    emailVerificationToken: _evt,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    ...rest 
  } = user;

  return {
    user: rest,
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: refreshExpiryMs / 1000,
  };
}

// -----------------------Reviewed-----------------------
export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    console.log(`Failed login attempt for email: ${email}`);
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.emailVerified) {
    console.log(`Login attempt with unverified email: ${email}`);
    throw new AppError('The user email is not verified', 403);
  }

  const accessToken  = generateAccessToken({ userId: user.id });
  const refreshToken = generateRefreshToken({ userId: user.id });
  const expiresAt    = new Date(Date.now() + refreshExpiryMs);

  await prisma.refreshToken.create({
    data: { 
      token: refreshToken, 
      userId: user.id, 
      expiresAt: expiresAt 
    },
  });

  if (! user) return null;

  const { 
    password: _pw,
    emailVerificationToken: _evt,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    ...rest
  } = user;

  return {
    user: rest,
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: refreshExpiryMs / 1000,
  };
}

// -----------------------Reviewed-----------------------
export async function refreshToken(token) {
  try {
    const payload = verifyRefreshToken(token);    
  } catch (error) {
    console.warn(`Invalid refresh token: ${error.message}`);
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { 
      token: token, 
      userId: payload.userId 
    },
  });
  
  if (!stored || new Date() > stored.expiresAt) {
    console.log(`Invalid or expired refresh token: ${token}`);
    throw new AppError('Invalid or expired refresh token', 401);
  }
  
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const newAccessToken = generateAccessToken({ userId: payload.userId });
  
  return { 
    accessToken: newAccessToken 
  };
}

export async function logout(token) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function verifyEmail(token) {
  const hashed = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: hashed },
  });
  
  if (!user) {
    console.log(`Invalid or expired verification token: ${token}`)
    throw new AppError('Invalid or expired verification token', 400);
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationToken: null },
  });
  
  return omitUser(await prisma.user.findUnique({ where: { id: user.id } }));
}

export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const rawToken = generateToken();
  const passwordResetToken = hashToken(rawToken);
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken, passwordResetExpires },
  });
  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (err) {
    console.warn('Reset email failed:', err.message);
  }
}

export async function resetPassword(token, newPassword) {
  const hashed = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashed,
      passwordResetExpires: { gt: new Date() },
    },
  });
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);
}
