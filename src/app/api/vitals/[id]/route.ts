import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { VitalSign } from '@/models/VitalSign';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const UpdateVitalsSchema = z
  .object({
    sbp: z
      .number()
      .min(50, 'Systolic BP must be between 50 and 300')
      .max(300, 'Systolic BP must be between 50 and 300')
      .optional()
      .nullable(),
    dbp: z
      .number()
      .min(20, 'Diastolic BP must be between 20 and 200')
      .max(200, 'Diastolic BP must be between 20 and 200')
      .optional()
      .nullable(),
    heartRate: z
      .number()
      .min(20, 'Heart rate must be between 20 and 300')
      .max(300, 'Heart rate must be between 20 and 300')
      .optional()
      .nullable(),
    respiratoryRate: z
      .number()
      .min(5, 'Respiratory rate must be between 5 and 60')
      .max(60, 'Respiratory rate must be between 5 and 60')
      .optional()
      .nullable(),
    temperature: z
      .number()
      .min(30.0, 'Temperature must be between 30.0 and 45.0')
      .max(45.0, 'Temperature must be between 30.0 and 45.0')
      .optional()
      .nullable(),
    oxygenSaturation: z
      .number()
      .min(50, 'Oxygen saturation must be between 50 and 100')
      .max(100, 'Oxygen saturation must be between 50 and 100')
      .optional()
      .nullable(),
    measuredAt: z
      .string()
      .optional()
      .refine((val) => val === undefined || val === '' || !isNaN(Date.parse(val)), {
        message: 'Invalid measuredAt format',
      }),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['DOCTOR', 'NURSE', 'ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid vitals ID' }, { status: 400 });
    }

    const vitals = await VitalSign.findById(id);
    if (!vitals) {
      return NextResponse.json({ message: 'Vital signs entry not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = UpdateVitalsSchema.safeParse(body || {});

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid vitals payload' },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    if (updates.sbp !== undefined) vitals.sbp = updates.sbp ?? undefined;
    if (updates.dbp !== undefined) vitals.dbp = updates.dbp ?? undefined;
    if (updates.heartRate !== undefined) vitals.heartRate = updates.heartRate ?? undefined;
    if (updates.respiratoryRate !== undefined) {
      vitals.respiratoryRate = updates.respiratoryRate ?? undefined;
    }
    if (updates.temperature !== undefined) vitals.temperature = updates.temperature ?? undefined;
    if (updates.oxygenSaturation !== undefined) {
      vitals.oxygenSaturation = updates.oxygenSaturation ?? undefined;
    }
    if (updates.measuredAt !== undefined && updates.measuredAt) {
      vitals.measuredAt = new Date(updates.measuredAt);
    }

    await vitals.save();

    return NextResponse.json({
      message: 'Vital signs updated successfully',
      vitals: {
        id: vitals._id.toString(),
        patientId: vitals.patientId.toString(),
        sbp: vitals.sbp,
        dbp: vitals.dbp,
        heartRate: vitals.heartRate,
        respiratoryRate: vitals.respiratoryRate,
        temperature: vitals.temperature,
        oxygenSaturation: vitals.oxygenSaturation,
        measuredAt: vitals.measuredAt,
        measuredBy: vitals.measuredBy.toString(),
        measuredBySnapshot: vitals.measuredBySnapshot,
        isDeleted: vitals.isDeleted,
        createdAt: vitals.createdAt,
        updatedAt: vitals.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('PATCH /api/vitals/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['DOCTOR', 'NURSE', 'ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid vitals ID' }, { status: 400 });
    }

    const vitals = await VitalSign.findById(id);
    if (!vitals) {
      return NextResponse.json({ message: 'Vital signs entry not found' }, { status: 404 });
    }

    vitals.isDeleted = true;
    await vitals.save();

    return NextResponse.json({
      message: 'Vital signs entry deleted successfully',
      vitals: {
        id: vitals._id.toString(),
        patientId: vitals.patientId.toString(),
        isDeleted: vitals.isDeleted,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('DELETE /api/vitals/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
