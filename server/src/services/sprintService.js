import { prisma } from '../config/database.js';
import { PROJECT_PERMISSIONS, SPRINT_STATUS, TASK_STATUS, normalizeTaskStatus, taskStatusFilterValues } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';

const SPRINT_SUMMARY_SELECT = {
  id: true,
  name: true,
  goal: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tasks: true } },
};

function requirePermission(project, userId, permission) {
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
}

async function getProject(projectId, userId, permission = PROJECT_PERMISSIONS.TASK_READ) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requirePermission(project, userId, permission);
  return project;
}

async function getSprintInProject(projectId, sprintId) {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: SPRINT_SUMMARY_SELECT,
  });
  if (!sprint) throw new AppError('Sprint not found', 404);
  return sprint;
}

function sprintPayload(data) {
  const payload = {};
  if (data.name != null) payload.name = data.name;
  if (data.goal !== undefined) payload.goal = data.goal || null;
  if (data.startDate !== undefined) payload.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) payload.endDate = data.endDate ? new Date(data.endDate) : null;
  return payload;
}

function normalizeSprintTaskStatuses(sprint) {
  if (!sprint?.tasks) return sprint;
  return {
    ...sprint,
    tasks: sprint.tasks.map((task) => ({ ...task, status: normalizeTaskStatus(task.status) })),
  };
}

export async function listSprints(projectId, userId) {
  await getProject(projectId, userId);
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    select: SPRINT_SUMMARY_SELECT,
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  });
  return sprints;
}

export async function listSprintTasks(projectId, sprintId, userId) {
  await getProject(projectId, userId);
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });
  if (!sprint) throw new AppError('Sprint not found', 404);
  const tasks = await prisma.task.findMany({
    where: { projectId, sprintId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: [{ sprintOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return tasks.map((task) => ({ ...task, status: normalizeTaskStatus(task.status) }));
}

export async function createSprint(projectId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  const count = await prisma.sprint.count({ where: { projectId } });
  const sprint = await prisma.sprint.create({
    data: {
      name: data.name || `Sprint ${count + 1}`,
      goal: data.goal || null,
      projectId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
  return normalizeSprintTaskStatuses(await getSprintInProject(projectId, sprint.id));
}

export async function updateSprint(projectId, sprintId, userId, data) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  await getSprintInProject(projectId, sprintId);
  await prisma.sprint.update({
    where: { id: sprintId },
    data: sprintPayload(data),
  });
  return normalizeSprintTaskStatuses(await getSprintInProject(projectId, sprintId));
}

export async function startSprint(projectId, sprintId, userId, data = {}) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  const sprint = await getSprintInProject(projectId, sprintId);
  if (!sprint._count.tasks) throw new AppError('Add at least one task before starting a sprint', 400);
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId, status: SPRINT_STATUS.ACTIVE, id: { not: sprintId } },
  });
  if (activeSprint) throw new AppError('Only one sprint can be active at a time', 400);

  await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: SPRINT_STATUS.ACTIVE,
      startDate: data.startDate ? new Date(data.startDate) : sprint.startDate || new Date(),
      endDate: data.endDate ? new Date(data.endDate) : sprint.endDate,
      goal: data.goal !== undefined ? data.goal || null : sprint.goal,
    },
  });
  return normalizeSprintTaskStatuses(await getSprintInProject(projectId, sprintId));
}

export async function completeSprint(projectId, sprintId, userId, data = {}) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  const sprint = await getSprintInProject(projectId, sprintId);
  const moveOpenToBacklog = data.moveOpenToBacklog !== false;

  await prisma.$transaction(async (tx) => {
    await tx.sprint.update({
      where: { id: sprintId },
      data: { status: SPRINT_STATUS.COMPLETED },
    });
    if (moveOpenToBacklog) {
      await tx.task.updateMany({
        where: { sprintId, status: { notIn: taskStatusFilterValues(TASK_STATUS.DONE) } },
        data: { sprintId: null, sprintOrder: 0 },
      });
    }
  });

  return normalizeSprintTaskStatuses(await getSprintInProject(projectId, sprintId));
}

export async function deleteSprint(projectId, sprintId, userId) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  await getSprintInProject(projectId, sprintId);
  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { sprintId },
      data: { sprintId: null, sprintOrder: 0 },
    });
    await tx.sprint.delete({ where: { id: sprintId } });
  });
}

export async function addTasksToSprint(projectId, sprintId, userId, taskIds) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  await getSprintInProject(projectId, sprintId);
  if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError('Task IDs are required', 400);

  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds }, projectId },
    select: { id: true },
  });
  if (tasks.length !== taskIds.length) throw new AppError('One or more tasks were not found in this project', 404);

  await prisma.$transaction(
    taskIds.map((taskId, index) =>
      prisma.task.update({
        where: { id: taskId },
        data: { sprintId, sprintOrder: Date.now() + index },
      })
    )
  );
  return normalizeSprintTaskStatuses(await getSprintInProject(projectId, sprintId));
}

export async function removeTaskFromSprint(projectId, sprintId, taskId, userId) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId, sprintId } });
  if (!task) throw new AppError('Task not found in sprint', 404);
  await prisma.task.update({
    where: { id: taskId },
    data: { sprintId: null, sprintOrder: 0, backlogOrder: Date.now() },
  });
  return getSprintInProject(projectId, sprintId);
}

export async function reorderTasks(projectId, sprintId, userId, orderedTaskIds) {
  await getProject(projectId, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
  if (!Array.isArray(orderedTaskIds)) throw new AppError('orderedTaskIds must be an array', 400);
  const scope = sprintId === 'backlog' ? { projectId, sprintId: null } : { projectId, sprintId };
  const tasks = await prisma.task.findMany({ where: { id: { in: orderedTaskIds }, ...scope }, select: { id: true } });
  if (tasks.length !== orderedTaskIds.length) throw new AppError('One or more tasks cannot be reordered in this scope', 400);
  await prisma.$transaction(
    orderedTaskIds.map((taskId, index) =>
      prisma.task.update({
        where: { id: taskId },
        data: sprintId === 'backlog' ? { backlogOrder: index + 1 } : { sprintOrder: index + 1 },
      })
    )
  );
}
