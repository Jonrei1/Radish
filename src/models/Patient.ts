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

export const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
