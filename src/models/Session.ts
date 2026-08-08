import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  sid: string;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sid: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'sessions',
  }
);

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
