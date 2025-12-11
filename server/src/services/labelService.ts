import { Label } from '../models';
import { AppError } from '../middleware/errorHandler';
import projectService from './projectService';

export class LabelService {
  async createLabel(
    projectId: string,
    userId: string,
    data: { name: string; color: string }
  ) {
    await projectService.getProjectById(projectId, userId); // Verify access

    const label = await Label.create({
      name: data.name,
      color: data.color,
      projectId,
    });

    return label;
  }

  async getLabels(projectId: string, userId: string) {
    await projectService.getProjectById(projectId, userId); // Verify access

    const labels = await Label.find({ projectId }).sort({ name: 1 }).lean();

    return labels;
  }

  async updateLabel(
    labelId: string,
    userId: string,
    data: { name?: string; color?: string }
  ) {
    const label = await Label.findById(labelId).lean();

    if (!label) {
      throw new AppError('Label not found', 404);
    }

    await projectService.getProjectById((label as any).projectId.toString(), userId); // Verify access

    const updated = await Label.findByIdAndUpdate(labelId, data, {
      new: true,
      runValidators: true,
    }).lean();

    return updated;
  }

  async deleteLabel(labelId: string, userId: string) {
    const label = await Label.findById(labelId).lean();

    if (!label) {
      throw new AppError('Label not found', 404);
    }

    await projectService.getProjectById((label as any).projectId.toString(), userId); // Verify access

    await Label.findByIdAndDelete(labelId);
  }
}

export default new LabelService();
