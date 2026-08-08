import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document<string> {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'counters',
    _id: false,
  }
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export async function getNextPatientCode(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'patientCode' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, returnDocument: 'after' }
  );

  if (!counter) {
    throw new Error('Failed to generate next patient code');
  }

  return `PT-${String(counter.seq).padStart(4, '0')}`;
}

export default Counter;
