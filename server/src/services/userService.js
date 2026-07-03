import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { sendVerificationEmail } from './emailService.js';

function omitPassword(user) {
  if (!user) return null;
  const { password, emailVerificationToken, passwordResetToken, passwordResetExpires, ...rest } = user;
  return rest;
}

const CURRENT_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  emailVerified: true,
  passwordChangedAt: true,
  createdAt: true,
};

const PREFERENCE_SCOPE_SELECTS = {
  default: { defaultView: true },
  profile: { profileNote: true, theme: true },
  workspace: {
    defaultView: true,
    density: true,
    theme: true,
    sidebarDefault: true,
    projectSelectorBehavior: true,
    rememberLastProject: true,
  },
  notifications: {
    emailNotifications: true,
    inAppNotifications: true,
    dueSoonNotifications: true,
    assignmentNotifications: true,
    mentionNotifications: true,
    commentNotifications: true,
    digestFrequency: true,
    quietHoursEnabled: true,
    quietHoursStart: true,
    quietHoursEnd: true,
  },
  all: undefined,
};

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: CURRENT_USER_SELECT,
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function getPreferences(userId, scope = 'all') {
  const select = PREFERENCE_SCOPE_SELECTS[scope] ?? PREFERENCE_SCOPE_SELECTS.all;
  return prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
    ...(select ? { select } : {}),
  });
}

export async function updatePreferences(userId, data) {
  const allowed = [
    'defaultView',
    'density',
    'theme',
    'profileNote',
    'sidebarDefault',
    'projectSelectorBehavior',
    'rememberLastProject',
    'emailNotifications',
    'inAppNotifications',
    'dueSoonNotifications',
    'assignmentNotifications',
    'mentionNotifications',
    'commentNotifications',
    'digestFrequency',
    'quietHoursEnabled',
    'quietHoursStart',
    'quietHoursEnd',
  ];
  const updateData = {};
  allowed.forEach((key) => {
    if (data[key] !== undefined) updateData[key] = data[key];
  });
  return prisma.userPreference.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });
}

export async function updateProfile(userId, data) {
  const updateData = {};
  if (data.name != null) updateData.name = data.name;
  if (data.email != null) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, id: { not: userId } },
    });
    if (existing) throw new AppError('Email already in use', 409);
    updateData.email = data.email;
    updateData.emailVerified = false;
  }
  if (data.password != null && data.password.length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    if (!data.currentPassword || !await bcrypt.compare(data.currentPassword, user.password)) {
      throw new AppError('Current password is required to change password', 400);
    }
    updateData.password = await bcrypt.hash(data.password, 12);
    updateData.passwordChangedAt = new Date();
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: CURRENT_USER_SELECT,
  });
  return user;
}

export async function updateAvatar(userId, avatarUrl) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl || null },
    select: CURRENT_USER_SELECT,
  });
  return user;
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatar: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function getSessions(userId) {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, expiresAt: true },
  });
  return sessions;
}

export async function revokeOtherSessions(userId, currentRefreshToken) {
  const where = { userId };
  if (currentRefreshToken) where.token = { not: currentRefreshToken };
  await prisma.refreshToken.deleteMany({ where });
}

export async function resendVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  if (user.emailVerified) throw new AppError('Email is already verified', 400);

  const rawToken = generateToken();
  const emailVerificationToken = hashToken(rawToken);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerificationToken },
  });
  await sendVerificationEmail(user.email, rawToken);
}
