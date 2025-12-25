import { User } from '../models';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcrypt';

export async function getProfile(userId: string) {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; password?: string }
) {
  const updateData: any = {};

  if (data.name) {
    updateData.name = data.name;
  }

  if (data.email) {
    // Check if email is already taken
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });

    if (existingUser && existingUser._id.toString() !== userId) {
      throw new AppError('Email already in use', 409);
    }

    updateData.email = data.email.toLowerCase();
    updateData.emailVerified = false; // Require re-verification
  }

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    updatedAt: user.updatedAt,
  };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };
}
