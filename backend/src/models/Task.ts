import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  _id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: Date;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      default: 'MEDIUM',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    },
    status: {
      type: String,
      default: 'TODO',
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ projectId: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });

// Virtual populate for comments and attachments
TaskSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'taskId',
});

TaskSchema.virtual('attachments', {
  ref: 'Attachment',
  localField: '_id',
  foreignField: 'taskId',
});

TaskSchema.virtual('subtasks', {
  ref: 'Subtask',
  localField: '_id',
  foreignField: 'taskId',
});

TaskSchema.virtual('taskLabels', {
  ref: 'TaskLabel',
  localField: '_id',
  foreignField: 'taskId',
});

// Ensure virtuals are included in JSON output
TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

export const Task = mongoose.model<ITask>('Task', TaskSchema);

