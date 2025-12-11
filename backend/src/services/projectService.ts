import { Project, ProjectMember, User, Task, Label } from '../models';
import { AppError } from '../middleware/errorHandler';
import { ROLES } from '../utils/constants';
import { getSkip, createPaginationResult } from '../utils/pagination';
import { logActivity } from './activityLogService';
import { ACTIVITY_ACTIONS } from '../utils/constants';

export class ProjectService {
  async createProject(userId: string, data: { name: string; description?: string }) {
    const project = await Project.create({
      name: data.name,
      description: data.description,
      ownerId: userId,
    });

    // Create owner membership
    await ProjectMember.create({
      projectId: project._id,
      userId: userId,
      role: ROLES.OWNER,
    });

    // Populate owner and members
    const populatedProject = await Project.findById(project._id)
      .populate('ownerId', 'id name email avatar')
      .lean();

    const members = await ProjectMember.find({ projectId: project._id })
      .populate('userId', 'id name email avatar')
      .lean();

    // Log activity
    await logActivity({
      projectId: project._id.toString(),
      userId,
      action: ACTIVITY_ACTIONS.CREATED,
      details: JSON.stringify({ type: 'project', name: project.name }),
    });

    return { ...populatedProject, members };
  }

  async getProjects(
    userId: string,
    filters: {
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = getSkip(page, limit);

    // Find projects where user is owner or member
    const userProjects = await ProjectMember.find({ userId }).select('projectId');
    const projectIds = userProjects.map((pm) => pm.projectId);

    const query: any = {
      $or: [
        { ownerId: userId },
        { _id: { $in: projectIds } },
      ],
    };

    if (filters.search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } },
          ],
        },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('ownerId', 'id name email avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
    ]);

    // Populate members for each project
    const projectsWithMembers = await Promise.all(
      projects.map(async (project: any) => {
        const members = await ProjectMember.find({ projectId: project._id })
          .populate('userId', 'id name email avatar')
          .lean();
        return { ...project, members };
      })
    );

    return createPaginationResult(projectsWithMembers, total, page, limit);
  }

  async getProjectById(projectId: string, userId: string) {
    // Check if user has access
    const project = await Project.findById(projectId).lean();
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const isOwner = project.ownerId.toString() === userId;
    const membership = await ProjectMember.findOne({
      projectId: projectId,
      userId: userId,
    }).lean();

    if (!isOwner && !membership) {
      throw new AppError('Project not found', 404);
    }

    // Populate owner and members
    const populatedProject = await Project.findById(projectId)
      .populate('ownerId', 'id name email avatar')
      .lean();

    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'id name email avatar')
      .lean();

    // Get task and label counts
    const [taskCount, labelCount] = await Promise.all([
      Task.countDocuments({ projectId }),
      Label.countDocuments({ projectId }),
    ]);

    return {
      ...populatedProject,
      members,
      _count: {
        tasks: taskCount,
        labels: labelCount,
      },
    };
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: { name?: string; description?: string }
  ) {
    // Check permissions
    const project = await this.getProjectById(projectId, userId);
    const isOwner = project.ownerId.toString() === userId;
    const membership = await ProjectMember.findOne({
      projectId,
      userId,
    });
    const isAdmin = membership?.role === ROLES.ADMIN || membership?.role === ROLES.OWNER;

    if (!isOwner && !isAdmin) {
      throw new AppError('Insufficient permissions', 403);
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      data,
      { new: true, runValidators: true }
    )
      .populate('ownerId', 'id name email avatar')
      .lean();

    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'id name email avatar')
      .lean();

    // Log activity
    await logActivity({
      projectId,
      userId,
      action: ACTIVITY_ACTIONS.UPDATED,
      details: JSON.stringify({ type: 'project', changes: data }),
    });

    return { ...updatedProject, members };
  }

  async deleteProject(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    if (project.ownerId.toString() !== userId) {
      throw new AppError('Only project owner can delete the project', 403);
    }

    await Project.findByIdAndDelete(projectId);
  }

  async getMembers(projectId: string, userId: string) {
    await this.getProjectById(projectId, userId); // Verify access

    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'id name email avatar')
      .lean();

    return members;
  }

  async addMember(
    projectId: string,
    userId: string,
    memberUserId: string,
    role: string = ROLES.MEMBER
  ) {
    const project = await this.getProjectById(projectId, userId);

    // Check permissions
    const isOwner = project.ownerId.toString() === userId;
    const membership = await ProjectMember.findOne({
      projectId,
      userId,
    });
    const isAdmin = membership?.role === ROLES.ADMIN || membership?.role === ROLES.OWNER;

    if (!isOwner && !isAdmin) {
      throw new AppError('Insufficient permissions to add members', 403);
    }

    // Check if user exists
    const user = await User.findById(memberUserId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({
      projectId,
      userId: memberUserId,
    });

    if (existingMember) {
      throw new AppError('User is already a member of this project', 409);
    }

    const member = await ProjectMember.create({
      projectId,
      userId: memberUserId,
      role: role as any,
    });

    const populatedMember = await ProjectMember.findById(member._id)
      .populate('userId', 'id name email avatar')
      .lean();

    // Log activity
    await logActivity({
      projectId,
      userId,
      action: ACTIVITY_ACTIONS.MEMBER_ADDED,
      details: JSON.stringify({
        memberId: memberUserId,
        memberName: user.name,
        role,
      }),
    });

    return populatedMember;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    memberUserId: string,
    role: string
  ) {
    const project = await this.getProjectById(projectId, userId);

    // Only owner can change roles
    if (project.ownerId.toString() !== userId) {
      throw new AppError('Only project owner can change member roles', 403);
    }

    // Cannot change owner's role
    if (project.ownerId.toString() === memberUserId) {
      throw new AppError('Cannot change owner role', 400);
    }

    const member = await ProjectMember.findOneAndUpdate(
      {
        projectId,
        userId: memberUserId,
      },
      { role: role as any },
      { new: true }
    )
      .populate('userId', 'id name email avatar')
      .lean();

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // Log activity
    await logActivity({
      projectId,
      userId,
      action: ACTIVITY_ACTIONS.ROLE_CHANGED,
      details: JSON.stringify({
        memberId: memberUserId,
        newRole: role,
      }),
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, memberUserId: string) {
    const project = await this.getProjectById(projectId, userId);

    // Check permissions
    const isOwner = project.ownerId.toString() === userId;
    const membership = await ProjectMember.findOne({
      projectId,
      userId,
    });
    const isAdmin = membership?.role === ROLES.ADMIN || membership?.role === ROLES.OWNER;

    if (!isOwner && !isAdmin) {
      throw new AppError('Insufficient permissions to remove members', 403);
    }

    // Cannot remove owner
    if (project.ownerId.toString() === memberUserId) {
      throw new AppError('Cannot remove project owner', 400);
    }

    const member = await ProjectMember.findOne({
      projectId,
      userId: memberUserId,
    }).populate('userId');

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    await ProjectMember.findByIdAndDelete(member._id);

    // Log activity
    await logActivity({
      projectId,
      userId,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
      details: JSON.stringify({
        memberId: memberUserId,
        memberName: (member.userId as any).name,
      }),
    });
  }

  async calculateProgress(projectId: string): Promise<number> {
    const tasks = await Task.find({ projectId }).select('status').lean();

    if (tasks.length === 0) {
      return 0;
    }

    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const progress = (completedTasks / tasks.length) * 100;

    // Update project progress
    await Project.findByIdAndUpdate(projectId, {
      progress: Math.round(progress * 100) / 100,
    });

    return progress;
  }

  async getProjectStats(projectId: string, userId: string) {
    await this.getProjectById(projectId, userId); // Verify access

    const [tasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
      Task.countDocuments({ projectId }),
      Task.countDocuments({ projectId, status: 'DONE' }),
      Task.countDocuments({ projectId, status: 'IN_PROGRESS' }),
      Task.countDocuments({
        projectId,
        dueDate: { $lt: new Date() },
        status: { $ne: 'DONE' },
      }),
    ]);

    const project = await Project.findById(projectId).select('progress').lean();

    return {
      totalTasks: tasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      progress: project?.progress || 0,
    };
  }
}

export default new ProjectService();
