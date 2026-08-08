import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAuthorSnapshot {
  firstName: string;
  lastName: string;
  role: 'DOCTOR' | 'ADMIN';
  licenseNumber?: string;
}

export interface INote extends Document {
  patientId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorSnapshot: IAuthorSnapshot;
  noteDatetime: Date;
  notes: string;
  orders?: string;
  isDeleted: boolean;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorSnapshot: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      role: { type: String, enum: ['DOCTOR', 'ADMIN'], required: true },
      licenseNumber: { type: String, trim: true },
    },
    noteDatetime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    orders: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'notes',
  }
);

NoteSchema.index({ patientId: 1, noteDatetime: -1 });

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
