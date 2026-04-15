import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

async function ensureProjectAccess(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  return project;
}

export async function createLabel(projectId, userId, { name, color }) {
  await ensureProjectAccess(projectId, userId);
  return prisma.label.create({
    data: { projectId, name, color: color || '#6B7280' },
  });
}

export async function getLabels(projectId, userId) {
  await ensureProjectAccess(projectId, userId);
  return prisma.label.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  });
}

export async function updateLabel(labelId, userId, { name, color }) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: { project: { include: { members: true } } },
  });
  if (!label) throw new AppError('Label not found', 404);
  const isOwner = label.project.ownerId === userId;
  const isMember = label.project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);

  const data = {};
  if (name != null) data.name = name;
  if (color != null) data.color = color;
  return prisma.label.update({
    where: { id: labelId },
    data,
  });
}

export async function deleteLabel(labelId, userId) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: { project: { include: { members: true } } },
  });
  if (!label) throw new AppError('Label not found', 404);
  const isOwner = label.project.ownerId === userId;
  const isMember = label.project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  await prisma.label.delete({ where: { id: labelId } });
}
