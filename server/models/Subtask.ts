import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubtask extends Document {
  _id: Types.ObjectId;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema<ISubtask>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Subtask = mongoose.model<ISubtask>('Subtask', SubtaskSchema);

