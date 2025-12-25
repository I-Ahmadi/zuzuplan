import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CommentSchema.index({ taskId: 1 });
CommentSchema.index({ userId: 1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);

