import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  _id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ projectId: 1 });
ActivityLogSchema.index({ taskId: 1 });
ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ createdAt: 1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

