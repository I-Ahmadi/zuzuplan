import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { calculateProgress } from './projectService.js';
import { PROJECT_PERMISSIONS, TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectRole, hasProjectPermission } from '../utils/permissions.js';

function requireProjectPermission(project, userId, permission) {
  const role = getProjectRole(project, userId);
  if (!hasProjectPermission(role, permission)) {
    throw new AppError('Insufficient project permission', 403);
  }
  return role;
}

function canUpdateTask(task, userId) {
  const role = getProjectRole(task.project, userId);
  if (hasProjectPermission(role, PROJECT_PERMISSIONS.TASK_UPDATE_ANY)) return true;
  if (!hasProjectPermission(role, PROJECT_PERMISSIONS.TASK_UPDATE_OWN)) return false;
  return task.createdById === userId || task.assigneeId === userId;
}

function assertAssignable(project, assigneeId) {
  if (!assigneeId) return;
  const isProjectOwner = project.ownerId === assigneeId;
  const isProjectMember = project.members.some((member) => member.userId === assigneeId);
  if (!isProjectOwner && !isProjectMember) {
    throw new AppError('Assignee must be a project member', 400);
  }
}

async function assertSprint(projectId, sprintId) {
  if (!sprintId) return;
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });
  if (!sprint) throw new AppError('Sprint must belong to this project', 400);
}

export async function ensureTaskAccess(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } },
  });
  if (!task) throw new AppError('Task not found', 404);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_READ);
  return task;
}

export async function getTaskById(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { members: true } },
      sprint: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      createdBy: { select: { id: true, name: true, email: true, avatar: true } },
      subtasks: true,
      comments: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      linkedFrom: {
        include: {
          targetTask: {
            include: {
              assignee: { select: { id: true, name: true, email: true, avatar: true } },
              createdBy: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      linkedTo: {
        include: {
          sourceTask: {
            include: {
              assignee: { select: { id: true, name: true, email: true, avatar: true } },
              createdBy: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!task) throw new AppError('Task not found', 404);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_READ);
  return task;
}

export async function createTask(projectId, userId, data) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_CREATE);
  if (data.assigneeId) {
    requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_ASSIGN);
    assertAssignable(project, data.assigneeId);
  }
  await assertSprint(projectId, data.sprintId);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      projectId,
      createdById: userId,
      sprintId: data.sprintId || null,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || TASK_PRIORITY.MEDIUM,
      status: data.status || TASK_STATUS.TODO,
      backlogOrder: Date.now(),
      sprintOrder: data.sprintId ? Date.now() : 0,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      createdBy: { select: { id: true, name: true, email: true, avatar: true } },
      sprint: { select: { id: true, name: true, status: true } },
    },
  });

  await calculateProgress(projectId);
  return getTaskById(task.id, userId);
}

export async function getTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  requireProjectPermission(project, userId, PROJECT_PERMISSIONS.TASK_READ);

  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = { projectId };

  if (filters.status) where.status = filters.status;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.sprintId === 'backlog') {
    where.sprintId = null;
  } else if (filters.sprintId) {
    where.sprintId = filters.sprintId;
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sprintOrder: 'asc' }, { backlogOrder: 'asc' }, { updatedAt: 'desc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        sprint: { select: { id: true, name: true, status: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function updateTask(taskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  if (data.assigneeId !== undefined) {
    requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_ASSIGN);
    assertAssignable(task.project, data.assigneeId);
  }
  if (data.sprintId !== undefined) {
    requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_UPDATE_ANY);
    await assertSprint(task.projectId, data.sprintId);
  }
  const updateData = {};
  if (data.title != null) updateData.title = data.title;
  if (data.description != null) updateData.description = data.description;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.priority != null) updateData.priority = data.priority;
  if (data.status != null) updateData.status = data.status;
  if (data.sprintId !== undefined) {
    updateData.sprintId = data.sprintId || null;
    updateData.sprintOrder = data.sprintId ? Date.now() : 0;
    updateData.backlogOrder = data.sprintId ? task.backlogOrder : Date.now();
  }
  await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  await calculateProgress(task.projectId);
  return getTaskById(taskId, userId);
}

export async function deleteTask(taskId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  requireProjectPermission(task.project, userId, PROJECT_PERMISSIONS.TASK_DELETE);
  await prisma.task.delete({ where: { id: taskId } });
  await calculateProgress(task.projectId);
}

export async function addSubtask(taskId, userId, title) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  const subtask = await prisma.subtask.create({
    data: { taskId, title },
  });
  return subtask;
}

export async function updateSubtask(taskId, subtaskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId, taskId },
  });
  if (!subtask) throw new AppError('Subtask not found', 404);

  const updateData = {};
  if (data.title != null) updateData.title = data.title;
  if (data.completed !== undefined) updateData.completed = data.completed;

  const updated = await prisma.subtask.update({
    where: { id: subtaskId },
    data: updateData,
  });
  return updated;
}

export async function deleteSubtask(taskId, subtaskId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId, taskId },
  });
  if (!subtask) throw new AppError('Subtask not found', 404);
  await prisma.subtask.delete({ where: { id: subtaskId } });
}

export async function addTaskLink(taskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  if (!data.targetTaskId || data.targetTaskId === taskId) {
    throw new AppError('A different linked work item is required', 400);
  }
  const targetTask = await prisma.task.findFirst({
    where: { id: data.targetTaskId, projectId: task.projectId },
  });
  if (!targetTask) throw new AppError('Linked work item must belong to this project', 404);

  const link = await prisma.taskLink.create({
    data: {
      sourceTaskId: taskId,
      targetTaskId: data.targetTaskId,
      type: data.type || 'RELATES_TO',
    },
    include: {
      targetTask: {
        include: {
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  });
  return link;
}

export async function deleteTaskLink(taskId, linkId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  if (!canUpdateTask(task, userId)) {
    throw new AppError('Insufficient task update permission', 403);
  }
  const link = await prisma.taskLink.findFirst({
    where: {
      id: linkId,
      OR: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
    },
  });
  if (!link) throw new AppError('Linked work item not found', 404);
  await prisma.taskLink.delete({ where: { id: linkId } });
}
