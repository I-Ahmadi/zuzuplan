import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ token: 1 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

