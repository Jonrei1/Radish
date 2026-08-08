import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMeasuredBySnapshot {
  firstName: string;
  lastName: string;
  role: 'DOCTOR' | 'ADMIN';
}

export interface IVitalSign extends Document {
  patientId: Types.ObjectId;
  sbp?: number;
  dbp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  measuredAt: Date;
  measuredBy: Types.ObjectId;
  measuredBySnapshot: IMeasuredBySnapshot;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VitalSignSchema = new Schema<IVitalSign>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    sbp: {
      type: Number,
    },
    dbp: {
      type: Number,
    },
    heartRate: {
      type: Number,
    },
    respiratoryRate: {
      type: Number,
    },
    temperature: {
      type: Number,
    },
    oxygenSaturation: {
      type: Number,
    },
    measuredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    measuredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    measuredBySnapshot: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      role: { type: String, enum: ['DOCTOR', 'ADMIN'], required: true },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'vitalsigns',
  }
);

VitalSignSchema.index({ patientId: 1, measuredAt: -1 });

export const VitalSign: Model<IVitalSign> =
  mongoose.models.VitalSign || mongoose.model<IVitalSign>('VitalSign', VitalSignSchema);

export const Vitals = VitalSign;
export default VitalSign;
