import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

function omitPassword(user) {
  if (!user) return null;
  const { password, emailVerificationToken, passwordResetToken, passwordResetExpires, ...rest } = user;
  return rest;
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return omitPassword(user);
}

export async function getPreferences(userId) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function updatePreferences(userId, data) {
  const allowed = ['defaultView', 'density', 'theme', 'profileNote'];
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
    updateData.password = await bcrypt.hash(data.password, 12);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  return omitPassword(user);
}

export async function updateAvatar(userId, avatarUrl) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });
  return omitPassword(user);
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatar: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}
