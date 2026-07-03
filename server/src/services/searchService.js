import { prisma } from '../config/database.js';

const USER_SUMMARY_SELECT = { id: true, name: true, email: true, avatar: true };
const PROJECT_SUMMARY_SELECT = { id: true, name: true, key: true };

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
    return { projects: [], tasks: [], comments: [], members: [] };
  }

  const projectAccess = accessibleProjectWhere(userId);

  const [projects, tasks, comments, members] = await Promise.all([
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
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        priority: true,
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: USER_SUMMARY_SELECT },
      },
    }),
    prisma.comment.findMany({
      where: {
        task: { project: projectAccess },
        content: { contains: search, mode: 'insensitive' },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: USER_SUMMARY_SELECT },
        task: { select: { id: true, title: true, projectId: true, project: { select: PROJECT_SUMMARY_SELECT } } },
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
      select: {
        id: true,
        role: true,
        userId: true,
        projectId: true,
        user: { select: USER_SUMMARY_SELECT },
        project: { select: PROJECT_SUMMARY_SELECT },
      },
    }),
  ]);

  return { projects, tasks, comments, members };
}
