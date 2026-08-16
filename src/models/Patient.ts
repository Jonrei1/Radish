import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PatientSex = 'MALE' | 'FEMALE' | 'OTHER';

export interface IPatient extends Document {
  patientCode: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  extension?: string;
  dateOfBirth: Date;
  sex: PatientSex;
  addressStreet?: string;
  addressBarangay?: string;
  addressCity?: string;
  addressRegion?: string;
  addressCountry?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    patientCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
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
    dateOfBirth: {
      type: Date,
      required: true,
    },
    sex: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: true,
    },
    addressStreet: {
      type: String,
      trim: true,
    },
    addressBarangay: {
      type: String,
      trim: true,
    },
    addressCity: {
      type: String,
      trim: true,
    },
    addressRegion: {
      type: String,
      trim: true,
    },
    addressCountry: {
      type: String,
      trim: true,
      default: 'Philippines',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'patients',
  }
);

PatientSchema.index({ lastName: 1, firstName: 1 });
PatientSchema.index({ isActive: 1, lastName: 1, firstName: 1 });

// Force recompilation on every module load in dev so schema edits take effect
// immediately, instead of silently reusing a stale cached model (and dropping
// any fields added since the dev server last restarted) across hot reloads.
if (process.env.NODE_ENV !== 'production' && mongoose.models.Patient) {
  mongoose.deleteModel('Patient');
}

export const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
