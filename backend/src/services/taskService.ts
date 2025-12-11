import { Task, Subtask, TaskLabel, Label, Comment, Attachment, Project } from '../models';
import { AppError } from '../middleware/errorHandler';
import { TASK_STATUS, TASK_PRIORITY, ACTIVITY_ACTIONS } from '../utils/constants';
import { getSkip, createPaginationResult } from '../utils/pagination';
import { logActivity } from './activityLogService';
import projectService from './projectService';
import { notifyTaskAssignment } from './notificationService';

export class TaskService {
  async createTask(
    projectId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      dueDate?: Date;
      priority?: string;
      labelIds?: string[];
    }
  ) {
    // Verify project access
    await projectService.getProjectById(projectId, userId);

    const task = await Task.create({
      title: data.title,
      description: data.description,
      projectId,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      priority: data.priority || TASK_PRIORITY.MEDIUM,
      status: TASK_STATUS.TODO,
    });

    // Add labels if provided
    if (data.labelIds && data.labelIds.length > 0) {
      await TaskLabel.insertMany(
        data.labelIds.map((labelId) => ({
          taskId: task._id,
          labelId,
        }))
      );
    }

    // Get task labels separately
    const taskLabels = await TaskLabel.find({ taskId: task._id })
      .populate('labelId')
      .lean();

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'id name email avatar')
      .populate('projectId', 'id name')
      .lean();

    return { ...populatedTask, taskLabels };

    // Log activity
    await logActivity({
      projectId,
      taskId: task._id.toString(),
      userId,
      action: ACTIVITY_ACTIONS.CREATED,
      details: JSON.stringify({ type: 'task', title: task.title }),
    });

    // Notify assignee if task is assigned
    if (data.assigneeId && data.assigneeId !== userId) {
      try {
        const project = await Project.findById(projectId).lean();
        await notifyTaskAssignment(
          data.assigneeId,
          task._id.toString(),
          task.title,
          project?.name || 'Unknown Project'
        );
      } catch (error) {
        console.error('Failed to send task assignment notification:', error);
      }
    }

    // Update project progress
    await projectService.calculateProgress(projectId);

    return populatedTask;
  }

  async getTasks(
    projectId: string,
    userId: string,
    filters: {
      status?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    // Verify project access
    await projectService.getProjectById(projectId, userId);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = getSkip(page, limit);

    const query: any = { projectId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.assigneeId) {
      query.assigneeId = filters.assigneeId;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assigneeId', 'id name email avatar')
        .sort({ priority: -1, dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    // Get task labels and counts for each task
    const tasksWithCounts = await Promise.all(
      tasks.map(async (task: any) => {
        const [taskLabels, commentCount, attachmentCount] = await Promise.all([
          TaskLabel.find({ taskId: task._id })
            .populate('labelId')
            .lean(),
          Comment.countDocuments({ taskId: task._id }),
          Attachment.countDocuments({ taskId: task._id }),
        ]);
        return {
          ...task,
          taskLabels,
          _count: {
            comments: commentCount,
            attachments: attachmentCount,
          },
        };
      })
    );

    return createPaginationResult(tasksWithCounts, total, page, limit);
  }

  async getTaskById(taskId: string, userId: string) {
    const task = await Task.findById(taskId)
      .populate('assigneeId', 'id name email avatar')
      .populate('projectId', 'id name')
      .lean();

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify project access
    await projectService.getProjectById((task as any).projectId.toString(), userId);

    // Get related data
    const [subtasks, taskLabels, comments, attachments] = await Promise.all([
      Subtask.find({ taskId }).lean(),
      TaskLabel.find({ taskId })
        .populate('labelId')
        .lean(),
      Comment.find({ taskId })
        .populate('userId', 'id name email avatar')
        .sort({ createdAt: 1 })
        .lean(),
      Attachment.find({ taskId })
        .populate('uploadedBy', 'id name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      ...task,
      subtasks,
      taskLabels,
      comments,
      attachments,
    };
  }

  async updateTask(
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string;
      dueDate?: Date;
      priority?: string;
      status?: string;
      labelIds?: string[];
    }
  ) {
    const task = await this.getTaskById(taskId, userId);
    const oldStatus = (task as any).status;

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;

    // Handle labels
    if (data.labelIds !== undefined) {
      // Remove existing labels
      await TaskLabel.deleteMany({ taskId });

      // Add new labels
      if (data.labelIds.length > 0) {
        await TaskLabel.insertMany(
          data.labelIds.map((labelId) => ({
            taskId,
            labelId,
          }))
        );
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('assigneeId', 'id name email avatar')
      .lean();

    // Get task labels
    const taskLabels = await TaskLabel.find({ taskId })
      .populate('labelId')
      .lean();

    const result = { ...updatedTask, taskLabels };

    // Log activity
    const activityDetails: any = { type: 'task', changes: data };
    if (data.status && data.status !== oldStatus) {
      activityDetails.action = ACTIVITY_ACTIONS.STATUS_CHANGED;
      activityDetails.oldStatus = oldStatus;
      activityDetails.newStatus = data.status;
    } else {
      activityDetails.action = ACTIVITY_ACTIONS.UPDATED;
    }

    await logActivity({
      projectId: (task as any).projectId.toString(),
      taskId,
      userId,
      action: activityDetails.action,
      details: JSON.stringify(activityDetails),
    });

    // Update project progress
    await projectService.calculateProgress((task as any).projectId.toString());

    return result;
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.getTaskById(taskId, userId);

    await Task.findByIdAndDelete(taskId);

    // Log activity
    await logActivity({
      projectId: (task as any).projectId.toString(),
      taskId,
      userId,
      action: ACTIVITY_ACTIONS.DELETED,
      details: JSON.stringify({ type: 'task', title: (task as any).title }),
    });

    // Update project progress
    await projectService.calculateProgress((task as any).projectId.toString());
  }

  async addSubtask(taskId: string, userId: string, title: string) {
    const task = await this.getTaskById(taskId, userId);

    const subtask = await Subtask.create({
      taskId,
      title,
    });

    // Log activity
    await logActivity({
      projectId: (task as any).projectId.toString(),
      taskId,
      userId,
      action: ACTIVITY_ACTIONS.UPDATED,
      details: JSON.stringify({ type: 'subtask', action: 'added', title }),
    });

    return subtask;
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    userId: string,
    data: { title?: string; completed?: boolean }
  ) {
    const task = await this.getTaskById(taskId, userId);

    const subtask = await Subtask.findOne({
      _id: subtaskId,
      taskId,
    });

    if (!subtask) {
      throw new AppError('Subtask not found', 404);
    }

    const updatedSubtask = await Subtask.findByIdAndUpdate(subtaskId, data, {
      new: true,
    });

    // Log activity
    await logActivity({
      projectId: (task as any).projectId.toString(),
      taskId,
      userId,
      action: ACTIVITY_ACTIONS.UPDATED,
      details: JSON.stringify({ type: 'subtask', action: 'updated', subtaskId }),
    });

    return updatedSubtask;
  }

  async deleteSubtask(taskId: string, subtaskId: string, userId: string) {
    const task = await this.getTaskById(taskId, userId);

    const subtask = await Subtask.findOne({
      _id: subtaskId,
      taskId,
    });

    if (!subtask) {
      throw new AppError('Subtask not found', 404);
    }

    await Subtask.findByIdAndDelete(subtaskId);

    // Log activity
    await logActivity({
      projectId: (task as any).projectId.toString(),
      taskId,
      userId,
      action: ACTIVITY_ACTIONS.UPDATED,
      details: JSON.stringify({ type: 'subtask', action: 'deleted', subtaskId }),
    });
  }
}

export default new TaskService();
