import { prisma } from '../config/database.js';

function accessibleProjectWhere(userId) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

export async function globalSearch(userId, query) {
  const search = String(query || '').trim();
  if (!search) {
    return { projects: [], tasks: [], docs: [], comments: [], members: [] };
  }

  const projectAccess = accessibleProjectWhere(userId);

  const [projects, tasks, docs, comments, members] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...projectAccess,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { key: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, key: true, description: true, status: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: {
        project: projectAccess,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: 12,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),
    prisma.projectDoc.findMany({
      where: {
        project: projectAccess,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: { project: { select: { id: true, name: true, key: true } } },
    }),
    prisma.comment.findMany({
      where: {
        task: { project: projectAccess },
        content: { contains: search, mode: 'insensitive' },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true, key: true } } } },
      },
    }),
    prisma.projectMember.findMany({
      where: {
        project: projectAccess,
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, key: true } },
      },
    }),
  ]);

  return { projects, tasks, docs, comments, members };
}
