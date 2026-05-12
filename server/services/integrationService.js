import { prisma } from '../config/database.js';
import { getPageAndLimit, getSkip, createPaginationResult } from '../utils/pagination.js';
import { PROJECT_PERMISSIONS } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';
import { createActivityEvent } from './activityService.js';

async function getProject(projectId, userId, permission = PROJECT_PERMISSIONS.DELIVERY_READ) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) throw new AppError('Project not found', 404);
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) throw new AppError('Insufficient project permission', 403);
  return project;
}

function normalizeRepository(provider, repository) {
  if (!repository || provider !== 'GITHUB') return repository || null;
  const trimmed = String(repository).trim().replace(/\.git$/i, '');
  const match = trimmed.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);
  if (match) return `${match[1]}/${match[2]}`;
  return trimmed.replace(/^\/+|\/+$/g, '');
}

export async function listIntegrations(projectId, userId, filters = {}) {
  await getProject(projectId, userId);
  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = { projectId };
  if (filters.provider) where.provider = filters.provider;
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    prisma.integration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { pullRequests: true, deployments: true } },
      },
    }),
    prisma.integration.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function createIntegration(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.INTEGRATION_MANAGE);
  const integration = await prisma.integration.create({
    data: {
      projectId,
      provider: data.provider,
      name: data.name || normalizeRepository(data.provider, data.repository) || data.provider,
      repository: normalizeRepository(data.provider, data.repository),
      externalId: data.externalId || null,
      status: data.status || 'CONNECTED',
      config: data.config || undefined,
      createdById: userId,
    },
  });
  await createActivityEvent({
    projectId,
    actorId: userId,
    type: 'integration.connected',
    entityType: 'integration',
    entityId: integration.id,
    title: `${integration.provider} integration connected`,
    description: integration.repository || integration.name,
    severity: 'SUCCESS',
  });
  return integration;
}

export async function updateIntegration(projectId, integrationId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.INTEGRATION_MANAGE);
  const integration = await prisma.integration.findFirst({ where: { id: integrationId, projectId } });
  if (!integration) throw new AppError('Integration not found', 404);
  return prisma.integration.update({
    where: { id: integrationId },
    data: {
      name: data.name,
      repository: normalizeRepository(integration.provider, data.repository),
      status: data.status,
      externalId: data.externalId,
      config: data.config,
    },
  });
}
