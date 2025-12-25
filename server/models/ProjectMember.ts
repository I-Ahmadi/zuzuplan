import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectMember extends Document {
  _id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      default: 'Admin',
      enum: ['Admin'],
    },
  },
  {
    timestamps: true,
  }
);

ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMemberSchema.index({ projectId: 1 });
ProjectMemberSchema.index({ userId: 1 });

export const ProjectMember = mongoose.model<IProjectMember>('ProjectMember', ProjectMemberSchema);

