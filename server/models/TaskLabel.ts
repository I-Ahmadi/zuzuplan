import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskLabel extends Document {
  _id: string;
  taskId: string;
  labelId: string;
}

const TaskLabelSchema = new Schema<ITaskLabel>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    labelId: {
      type: Schema.Types.ObjectId,
      ref: 'Label',
      required: true,
    },
  }
);

TaskLabelSchema.index({ taskId: 1, labelId: 1 }, { unique: true });
TaskLabelSchema.index({ taskId: 1 });
TaskLabelSchema.index({ labelId: 1 });

export const TaskLabel = mongoose.model<ITaskLabel>('TaskLabel', TaskLabelSchema);

