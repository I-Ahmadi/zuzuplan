import bcrypt from 'bcrypt';
import { User, RefreshToken } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { generateToken, hashToken } from '../utils/crypto';

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ user: any; accessToken: string; refreshToken: string }> {
  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = generateToken();
  const hashedVerificationToken = hashToken(verificationToken);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    emailVerificationToken: hashedVerificationToken,
  });

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email fails
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    email: user.email,
  });

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: any; accessToken: string; refreshToken: string }> {
  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    email: user.email,
  });

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string): Promise<{ accessToken: string }> {
  const { verifyRefreshToken } = await import('../utils/jwt');
  const decoded = verifyRefreshToken(token);

  // Verify refresh token exists in database
  const refreshTokenRecord = await RefreshToken.findOne({
    token,
    userId: decoded.id,
    expiresAt: { $gt: new Date() },
  });

  if (!refreshTokenRecord) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    id: decoded.id,
    email: decoded.email,
  });

  return { accessToken };
}

export async function logout(token: string): Promise<void> {
  await RefreshToken.deleteMany({ token });
}

export async function verifyEmail(token: string): Promise<void> {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  if (user.emailVerified) {
    throw new AppError('Email already verified', 400);
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists
    return;
  }

  // Generate reset token
  const resetToken = generateToken();
  const hashedResetToken = hashToken(resetToken);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = expiresAt;
  await user.save();

  // Send reset email
  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new AppError('Failed to send password reset email', 500);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear reset token
  user.password = hashedPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Invalidate all refresh tokens
  await RefreshToken.deleteMany({ userId: user._id });
}
