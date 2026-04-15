import { prisma } from '../config/database.js';
import { getSkip, getPageAndLimit, createPaginationResult } from '../utils/pagination.js';
import { logActivity } from './activityLogService.js';
import { calculateProgress } from './projectService.js';
import { notifyTaskAssignment } from './notificationService.js';
import { ACTIVITY_ACTIONS, TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export async function ensureTaskAccess(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } } },
  });
  if (!task) throw new AppError('Task not found', 404);
  const isOwner = task.project.ownerId === userId;
  const isMember = task.project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  return task;
}

export async function getTaskById(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { members: true } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      subtasks: true,
      taskLabels: { include: { label: true } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!task) throw new AppError('Task not found', 404);
  const isOwner = task.project.ownerId === userId;
  const isMember = task.project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);
  return task;
}

export async function createTask(projectId, userId, data) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      projectId,
      createdById: userId,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || TASK_PRIORITY.MEDIUM,
      status: data.status || TASK_STATUS.TODO,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      taskLabels: { include: { label: true } },
    },
  });

  if (data.labelIds && Array.isArray(data.labelIds) && data.labelIds.length > 0) {
    await prisma.taskLabel.createMany({
      data: data.labelIds.map((labelId) => ({ taskId: task.id, labelId })),
      skipDuplicates: true,
    });
  }

  await logActivity({
    projectId,
    taskId: task.id,
    userId,
    action: ACTIVITY_ACTIONS.CREATED,
    details: `Task created: ${task.title}`,
  });

  if (task.assigneeId && task.assigneeId !== userId) {
    const projectName = project.name;
    try {
      await notifyTaskAssignment(task.assigneeId, task.id, task.title, projectName);
    } catch (_) {}
  }

  await calculateProgress(projectId);
  return getTaskById(task.id, userId);
}

export async function getTasks(projectId, userId, filters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);

  const { page, limit } = getPageAndLimit(filters);
  const skip = getSkip(page, limit);
  const where = { projectId };

  if (filters.status) where.status = filters.status;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.priority) where.priority = filters.priority;
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
      orderBy: { updatedAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        taskLabels: { include: { label: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return createPaginationResult(items, total, page, limit);
}

export async function updateTask(taskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
  const previousStatus = task.status;

  const updateData = {};
  if (data.title != null) updateData.title = data.title;
  if (data.description != null) updateData.description = data.description;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.priority != null) updateData.priority = data.priority;
  if (data.status != null) updateData.status = data.status;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  if (data.labelIds && Array.isArray(data.labelIds)) {
    await prisma.taskLabel.deleteMany({ where: { taskId } });
    if (data.labelIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: data.labelIds.map((labelId) => ({ taskId, labelId })),
        skipDuplicates: true,
      });
    }
  }

  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.UPDATED,
    details: previousStatus !== updated.status ? ACTIVITY_ACTIONS.STATUS_CHANGED : 'Task updated',
  });

  if (updated.assigneeId && updated.assigneeId !== task.assigneeId && updated.assigneeId !== userId) {
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    try {
      await notifyTaskAssignment(updated.assigneeId, taskId, updated.title, project?.name || '');
    } catch (_) {}
  }

  await calculateProgress(task.projectId);
  return getTaskById(taskId, userId);
}

export async function deleteTask(taskId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.DELETED,
    details: `Task deleted: ${task.title}`,
  });
  await calculateProgress(task.projectId);
}

export async function addSubtask(taskId, userId, title) {
  const task = await ensureTaskAccess(taskId, userId);
  const subtask = await prisma.subtask.create({
    data: { taskId, title },
  });
  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.UPDATED,
    details: `Subtask added: ${title}`,
  });
  return subtask;
}

export async function updateSubtask(taskId, subtaskId, userId, data) {
  const task = await ensureTaskAccess(taskId, userId);
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
  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.UPDATED,
    details: 'Subtask updated',
  });
  return updated;
}

export async function deleteSubtask(taskId, subtaskId, userId) {
  const task = await ensureTaskAccess(taskId, userId);
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId, taskId },
  });
  if (!subtask) throw new AppError('Subtask not found', 404);
  await prisma.subtask.delete({ where: { id: subtaskId } });
  await logActivity({
    projectId: task.projectId,
    taskId,
    userId,
    action: ACTIVITY_ACTIONS.UPDATED,
    details: 'Subtask deleted',
  });
}
