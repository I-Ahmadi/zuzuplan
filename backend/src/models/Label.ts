import mongoose, { Schema, Document } from 'mongoose';

export interface ILabel extends Document {
  _id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabelSchema = new Schema<ILabel>(
  {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

LabelSchema.index({ projectId: 1 });

export const Label = mongoose.model<ILabel>('Label', LabelSchema);

