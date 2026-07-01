import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { PROJECT_INVITE_STATUS, PROJECT_PERMISSIONS, ROLES, TASK_STATUS, taskStatusFilterValues } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectPermissions, getProjectRole, hasProjectPermission, normalizeRole } from '../utils/permissions.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { sendProjectInviteEmail } from '../utils/email.js';

const USER_SUMMARY_SELECT = { id: true, name: true, email: true, avatar: true };

const PROJECT_LIST_SELECT = {
  id: true,
  name: true,
  key: true,
  description: true,
  status: true,
  visibility: true,
  progress: true,
  _count: { select: { tasks: true, members: true } },
};

const PROJECT_SWITCHER_SELECT = {
  id: true,
  name: true,
  key: true,
};

const PROJECT_ACCESS_SELECT = {
  ownerId: true,
  members: { select: { userId: true, role: true } },
};

const PROJECT_DETAIL_SELECTS = {
  detail: {
    ...PROJECT_LIST_SELECT,
    ownerId: true,
    startDate: true,
    endDate: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: USER_SUMMARY_SELECT },
    ...PROJECT_ACCESS_SELECT,
  },
  planning: {
    id: true,
    name: true,
    key: true,
    ...PROJECT_ACCESS_SELECT,
  },
  team: {
    id: true,
    name: true,
    key: true,
    ownerId: true,
    ...PROJECT_ACCESS_SELECT,
  },
  edit: {
    id: true,
    name: true,
    key: true,
    description: true,
    status: true,
    visibility: true,
    ...PROJECT_ACCESS_SELECT,
  },
  switcher: {
    ...PROJECT_SWITCHER_SELECT,
    ...PROJECT_ACCESS_SELECT,
  },
};

const PROJECT_DETAIL_SELECT = {
  ...PROJECT_LIST_SELECT,
  ownerId: true,
  ...PROJECT_ACCESS_SELECT,
};

const MEMBER_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  role: true,
  user: { select: USER_SUMMARY_SELECT },
};

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
    createdAt: true,
  };
}

function projectListSelect(fields) {
  return fields === 'switcher' ? PROJECT_SWITCHER_SELECT : PROJECT_LIST_SELECT;
}

function projectDetailSelect(fields) {
  return PROJECT_DETAIL_SELECTS[fields] || PROJECT_DETAIL_SELECTS.detail;
}

export async function getProjectById(projectId, userId, options = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectDetailSelect(options.fields),
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  const role = getProjectRole(project, userId);
  const { members, ...publicProject } = project;
  if (options.fields === 'planning' || options.fields === 'switcher' || options.fields === 'edit') {
    delete publicProject.ownerId;
  }
  if (options.fields === 'switcher' || options.fields === 'edit') {
    return publicProject;
  }
  return { ...publicProject, currentUserRole: role, currentUserPermissions: getProjectPermissions(role) };
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
      select: projectListSelect(options.fields),
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

  await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });
  return getProjectById(projectId, userId);
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
    select: MEMBER_SELECT,
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
    where: { projectId, status: PROJECT_INVITE_STATUS.PENDING },
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
      owner: { select: USER_SUMMARY_SELECT },
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
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  if (project.ownerId === memberUserId) {
    throw new AppError('Cannot change owner role', 403);
  }
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.MEMBERS_MANAGE);
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) throw new AppError('Invalid project role', 400);

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: memberUserId } },
    data: { role: normalizedRole },
    select: MEMBER_SELECT,
  });
  return updated;
}

export async function removeMember(projectId, userId, memberUserId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
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
    prisma.task.count({ where: { projectId, status: { in: taskStatusFilterValues(TASK_STATUS.DONE) } } }),
  ]);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
  return progress;
}
