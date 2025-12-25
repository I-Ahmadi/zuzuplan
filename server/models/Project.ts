import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ ownerId: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

