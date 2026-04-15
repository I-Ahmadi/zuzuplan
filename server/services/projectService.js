import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { logActivity } from './activityLogService.js';
import { ACTIVITY_ACTIONS, ROLES } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getProjectById(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      _count: { select: { tasks: true, labels: true } },
    },
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  return project;
}

export async function createProject(userId, data) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      key: (data.key || '').slice(0, 10),
      description: data.description || null,
      ownerId: userId,
      status: data.status || 'active',
      visibility: data.visibility || 'private',
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId, role: ROLES.ADMIN },
  });
  await logActivity({
    projectId: project.id,
    userId,
    action: ACTIVITY_ACTIONS.CREATED,
    details: `Project created: ${project.name}`,
  });
  return getProjectById(project.id, userId);
}

export async function getProjects(userId, options = {}) {
  const { page, limit } = getPageAndLimit(options);
  const skip = getSkip(page, limit);

  const where = {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
  if (options.search) {
    where.OR = where.OR.map((o) => ({
      ...o,
      OR: [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ],
    }));
  }

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { tasks: true, members: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function updateProject(projectId, userId, data) {
  await getProjectById(projectId, userId);
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  const isOwner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!isOwner && (!member || member.role !== ROLES.ADMIN)) {
    throw new AppError('Admin access required', 403);
  }

  const updateData = {};
  if (data.name != null) updateData.name = data.name;
  if (data.key != null) updateData.key = (data.key + '').slice(0, 10);
  if (data.description != null) updateData.description = data.description;
  if (data.status != null) updateData.status = data.status;
  if (data.visibility != null) updateData.visibility = data.visibility;
  if (data.startDate != null) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate != null) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  await logActivity({
    projectId,
    userId,
    action: ACTIVITY_ACTIONS.UPDATED,
    details: 'Project updated',
  });
  return project;
}

export async function deleteProject(projectId, userId) {
  await getProjectById(projectId, userId);
  const isOwner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!isOwner && (!member || member.role !== ROLES.ADMIN)) {
    throw new AppError('Admin access required', 403);
  }
  await prisma.project.delete({ where: { id: projectId } });
}

export async function getMembers(projectId, userId) {
  await getProjectById(projectId, userId);
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
}

export async function addMember(projectId, userId, memberUserId, role) {
  await getProjectById(projectId, userId);
  const isOwner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!isOwner && (!member || member.role !== ROLES.ADMIN)) {
    throw new AppError('Admin access required', 403);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: memberUserId } });
  if (!targetUser) throw new AppError('User not found', 404);
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: memberUserId } },
  });
  if (existing) throw new AppError('User is already a member', 409);

  await prisma.projectMember.create({
    data: { projectId, userId: memberUserId, role: role || ROLES.ADMIN },
  });
  await logActivity({
    projectId,
    userId,
    action: ACTIVITY_ACTIONS.MEMBER_ADDED,
    details: `Added ${targetUser.name}`,
  });
  return getMembers(projectId, userId);
}

export async function updateMemberRole(projectId, userId, memberUserId, role) {
  const project = await getProjectById(projectId, userId);
  if (project.ownerId === memberUserId) {
    throw new AppError('Cannot change owner role', 403);
  }
  const adminMember = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  const isOwner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!isOwner && (!adminMember || adminMember.role !== ROLES.ADMIN)) {
    throw new AppError('Admin access required', 403);
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: memberUserId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await logActivity({
    projectId,
    userId,
    action: ACTIVITY_ACTIONS.ROLE_CHANGED,
    details: `Role updated for member`,
  });
  return updated;
}

export async function removeMember(projectId, userId, memberUserId) {
  const project = await getProjectById(projectId, userId);
  if (project.ownerId === memberUserId) {
    throw new AppError('Cannot remove project owner', 403);
  }
  const adminMember = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  const isOwner = project.ownerId === userId;
  if (!isOwner && (!adminMember || adminMember.role !== ROLES.ADMIN)) {
    throw new AppError('Admin access required', 403);
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: memberUserId } },
  });
  await logActivity({
    projectId,
    userId,
    action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
    details: 'Member removed',
  });
}

export async function calculateProgress(projectId) {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: 'DONE' } }),
  ]);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
  return progress;
}

export async function getProjectStats(projectId, userId) {
  await getProjectById(projectId, userId);
  const now = new Date();
  const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: 'DONE' } }),
    prisma.task.count({ where: { projectId, status: 'IN_PROGRESS' } }),
    prisma.task.count({
      where: { projectId, dueDate: { lt: now }, status: { not: 'DONE' } },
    }),
  ]);
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    progress,
  };
}
