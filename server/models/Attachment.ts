import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttachment extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    taskId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Task',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AttachmentSchema.index({ taskId: 1 });
AttachmentSchema.index({ uploadedBy: 1 });

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema);

