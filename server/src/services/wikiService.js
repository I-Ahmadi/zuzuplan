import { prisma } from '../config/database.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectPermissions, getProjectRole, hasProjectPermission } from '../utils/permissions.js';

const userSelect = { id: true, name: true, email: true, avatar: true };

function normalizeTitle(title) {
  return String(title || '').trim().replace(/\s+/g, ' ');
}

function pageSelect() {
  return {
    id: true,
    projectId: true,
    title: true,
    content: true,
    createdById: true,
    lastUpdatedById: true,
    createdAt: true,
    updatedAt: true,
    createdBy: { select: userSelect },
    lastUpdatedBy: { select: userSelect },
  };
}

async function getProject(projectId, userId, permission = PROJECT_PERMISSIONS.WIKI_READ) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);

  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }

  return { project, role, permissions: getProjectPermissions(role) };
}

function canUpdatePage(role, page, userId) {
  return hasProjectPermission(role, PROJECT_PERMISSIONS.WIKI_UPDATE_ANY) ||
    (page.createdById === userId && hasProjectPermission(role, PROJECT_PERMISSIONS.WIKI_UPDATE_OWN));
}

function canDeletePage(role) {
  return hasProjectPermission(role, PROJECT_PERMISSIONS.WIKI_DELETE_ANY);
}

async function getPageInProject(projectId, pageId) {
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, projectId },
    select: pageSelect(),
  });
  if (!page) throw new AppError('Wiki page not found', 404);
  return page;
}

function publicPage(page, role, userId) {
  return {
    ...page,
    canEdit: canUpdatePage(role, page, userId),
    canDelete: canDeletePage(role),
  };
}

export async function listWikiPages(projectId, userId, options = {}) {
  const { role, permissions } = await getProject(projectId, userId);
  const search = String(options.search || '').trim();
  const where = { projectId };

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const pages = await prisma.wikiPage.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: pageSelect(),
  });

  return {
    items: pages.map((page) => publicPage(page, role, userId)),
    permissions,
  };
}

export async function createWikiPage(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.WIKI_CREATE);

  const title = normalizeTitle(data.title);
  if (!title) throw new AppError('Title is required', 400);

  const page = await prisma.wikiPage.create({
    data: {
      projectId,
      title,
      content: data.content || '',
      createdById: userId,
      lastUpdatedById: userId,
    },
    select: pageSelect(),
  });

  const { role } = await getProject(projectId, userId);
  return publicPage(page, role, userId);
}

export async function getWikiPage(projectId, pageId, userId) {
  const { role } = await getProject(projectId, userId);
  const page = await getPageInProject(projectId, pageId);
  return publicPage(page, role, userId);
}

export async function updateWikiPage(projectId, pageId, userId, data) {
  const { role } = await getProject(projectId, userId);
  const page = await getPageInProject(projectId, pageId);

  if (!canUpdatePage(role, page, userId)) {
    throw new AppError('Insufficient wiki permission', 403);
  }

  const updateData = { lastUpdatedById: userId };
  if (data.title !== undefined) {
    const title = normalizeTitle(data.title);
    if (!title) throw new AppError('Title is required', 400);
    updateData.title = title;
  }
  if (data.content !== undefined) updateData.content = data.content || '';

  const updated = await prisma.wikiPage.update({
    where: { id: pageId },
    data: updateData,
    select: pageSelect(),
  });

  return publicPage(updated, role, userId);
}

export async function deleteWikiPage(projectId, pageId, userId) {
  const { role } = await getProject(projectId, userId);
  await getPageInProject(projectId, pageId);

  if (!canDeletePage(role)) {
    throw new AppError('Insufficient wiki permission', 403);
  }

  await prisma.wikiPage.delete({ where: { id: pageId } });
}
