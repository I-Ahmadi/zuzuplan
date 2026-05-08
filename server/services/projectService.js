import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { PROJECT_INVITE_STATUS, PROJECT_PERMISSIONS, ROLES } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectPermissions, getProjectRole, hasProjectPermission, normalizeRole } from '../utils/permissions.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { sendProjectInviteEmail } from '../utils/email.js';

function requireProjectPermission(project, userId, permission) {
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
  return role;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function inviteSelect() {
  return {
    id: true,
    projectId: true,
    email: true,
    role: true,
    status: true,
    expiresAt: true,
    acceptedAt: true,
    createdAt: true,
    invitedBy: { select: { id: true, name: true, email: true, avatar: true } },
    acceptedBy: { select: { id: true, name: true, email: true, avatar: true } },
  };
}

export async function getProjectById(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  const role = getProjectRole(project, userId);
  return { ...project, currentUserRole: role, currentUserPermissions: getProjectPermissions(role) };
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
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
    },
  });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId, role: ROLES.ADMIN },
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
  if (options.visibility) where.visibility = options.visibility;
  if (options.status) where.status = options.status;

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function updateProject(projectId, userId, data) {
  const projectAccess = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!projectAccess) throw new AppError('Project not found', 404);
  requireProjectPermission(projectAccess, userId, PROJECT_PERMISSIONS.PROJECT_UPDATE);

  const updateData = {};
  if (data.name != null) updateData.name = data.name;
  if (data.key != null) updateData.key = (data.key + '').slice(0, 10);
  if (data.description != null) updateData.description = data.description;
  if (data.status != null) updateData.status = data.status;
  if (data.visibility != null) updateData.visibility = data.visibility;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
    },
  });
  return project;
}

export async function deleteProject(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.PROJECT_DELETE);
  await prisma.project.delete({ where: { id: projectId } });
}

export async function getMembers(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_READ);
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
}

export async function getInvites(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_READ);

  await prisma.projectInvite.updateMany({
    where: {
      projectId,
      status: PROJECT_INVITE_STATUS.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: { status: PROJECT_INVITE_STATUS.EXPIRED },
  });

  return prisma.projectInvite.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: inviteSelect(),
  });
}

export async function createInvite(projectId, userId, data) {
  const email = normalizeEmail(data.email);
  const role = normalizeRole(data.role) || ROLES.EMPLOYEE;

  if (!email) throw new AppError('Invite email is required', 400);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
      owner: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const isOwner = project.ownerId === existingUser.id;
    const isMember = project.members.some((member) => member.userId === existingUser.id);
    if (isOwner || isMember) throw new AppError('This user is already a project member', 409);
  }

  await prisma.projectInvite.updateMany({
    where: { projectId, email, status: PROJECT_INVITE_STATUS.PENDING },
    data: { status: PROJECT_INVITE_STATUS.REVOKED },
  });

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.projectInvite.create({
    data: {
      projectId,
      email,
      role,
      tokenHash: hashToken(rawToken),
      invitedById: userId,
      expiresAt,
    },
    select: inviteSelect(),
  });

  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  await sendProjectInviteEmail(email, rawToken, project.name, inviter?.name || inviter?.email || 'A teammate');
  return invite;
}

export async function revokeInvite(projectId, inviteId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);

  const invite = await prisma.projectInvite.findFirst({ where: { id: inviteId, projectId } });
  if (!invite) throw new AppError('Invite not found', 404);
  if (invite.status !== PROJECT_INVITE_STATUS.PENDING) {
    throw new AppError('Only pending invites can be revoked', 400);
  }

  await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status: PROJECT_INVITE_STATUS.REVOKED },
  });
}

export async function getInviteByToken(token) {
  const invite = await prisma.projectInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      ...inviteSelect(),
      project: { select: { id: true, name: true, key: true } },
    },
  });
  if (!invite) throw new AppError('Invite not found', 404);
  return invite;
}

export async function acceptInvite(token, userId) {
  const invite = await prisma.projectInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      project: { include: { members: true } },
    },
  });

  if (!invite) throw new AppError('Invite not found', 404);
  if (invite.status !== PROJECT_INVITE_STATUS.PENDING) throw new AppError('Invite is no longer active', 400);
  if (invite.expiresAt < new Date()) {
    await prisma.projectInvite.update({
      where: { id: invite.id },
      data: { status: PROJECT_INVITE_STATUS.EXPIRED },
    });
    throw new AppError('Invite has expired', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    throw new AppError('This invite was sent to a different email address', 403);
  }
  if (invite.project.ownerId === userId || invite.project.members.some((member) => member.userId === userId)) {
    throw new AppError('You are already a member of this project', 409);
  }

  await prisma.$transaction([
    prisma.projectMember.create({
      data: {
        projectId: invite.projectId,
        userId,
        role: normalizeRole(invite.role) || ROLES.EMPLOYEE,
      },
    }),
    prisma.projectInvite.update({
      where: { id: invite.id },
      data: {
        status: PROJECT_INVITE_STATUS.ACCEPTED,
        acceptedById: userId,
        acceptedAt: new Date(),
      },
    }),
  ]);

  return getProjectById(invite.projectId, userId);
}

export async function addMember(projectId, userId, memberUserId, role) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);

  const targetUser = await prisma.user.findUnique({ where: { id: memberUserId } });
  if (!targetUser) throw new AppError('User not found', 404);
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: memberUserId } },
  });
  if (existing) throw new AppError('User is already a member', 409);

  await prisma.projectMember.create({
    data: { projectId, userId: memberUserId, role: normalizeRole(role) || ROLES.EMPLOYEE },
  });
  return getMembers(projectId, userId);
}

export async function updateMemberRole(projectId, userId, memberUserId, role) {
  const project = await getProjectById(projectId, userId);
  if (project.ownerId === memberUserId) {
    throw new AppError('Cannot change owner role', 403);
  }
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) throw new AppError('Invalid project role', 400);

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: memberUserId } },
    data: { role: normalizedRole },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  return updated;
}

export async function removeMember(projectId, userId, memberUserId) {
  const project = await getProjectById(projectId, userId);
  if (project.ownerId === memberUserId) {
    throw new AppError('Cannot remove project owner', 403);
  }
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: memberUserId } },
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
