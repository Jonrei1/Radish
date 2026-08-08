import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'DOCTOR' | 'ADMIN';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  extension?: string;
  role: UserRole;
  licenseNumber?: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    extension: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['DOCTOR', 'ADMIN'],
      required: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    requiresPasswordChange: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

UserSchema.index({ role: 1, isActive: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
