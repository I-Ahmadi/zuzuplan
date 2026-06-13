import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { createPaginationResult, getPageAndLimit, getSkip } from '../utils/pagination.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';

async function getProject(projectId, userId, permission) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
  return project;
}

async function getDoc(projectId, docId) {
  const doc = await prisma.projectDoc.findFirst({
    where: { id: docId, projectId },
    include: { createdBy: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  if (!doc) throw new AppError('Document not found', 404);
  return doc;
}

export async function listDocs(projectId, userId, filters = {}) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.PROJECT_READ);
  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = { projectId };
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.projectDoc.findMany({
      where,
      skip,
      take: limit,
      include: { createdBy: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.projectDoc.count({ where }),
  ]);
  return createPaginationResult(items, total, page, limit);
}

export async function createDoc(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.PROJECT_UPDATE);
  return prisma.projectDoc.create({
    data: {
      title: data.title,
      content: data.content || '',
      pinned: Boolean(data.pinned),
      projectId,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true, avatar: true } } },
  });
}

export async function updateDoc(projectId, docId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.PROJECT_UPDATE);
  await getDoc(projectId, docId);
  const updateData = {};
  if (data.title != null) updateData.title = data.title;
  if (data.content != null) updateData.content = data.content;
  if (data.pinned !== undefined) updateData.pinned = Boolean(data.pinned);
  return prisma.projectDoc.update({
    where: { id: docId },
    data: updateData,
    include: { createdBy: { select: { id: true, name: true, email: true, avatar: true } } },
  });
}

export async function deleteDoc(projectId, docId, userId) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.PROJECT_UPDATE);
  await getDoc(projectId, docId);
  await prisma.projectDoc.delete({ where: { id: docId } });
}
