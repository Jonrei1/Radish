import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { VitalSign, IVitalSign } from '@/models/VitalSign';
import { Patient } from '@/models/Patient';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const CreateVitalsSchema = z
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    await requireUser(req);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Paginated, newest -> oldest, includes soft-deleted rows for ghost styling
    const [vitalsList, total] = await Promise.all([
      VitalSign.find({ patientId: id })
        .sort({ measuredAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IVitalSign[]>(),
      VitalSign.countDocuments({ patientId: id }),
    ]);

    const formattedVitals = vitalsList.map((v) => ({
      id: v._id.toString(),
      patientId: v.patientId.toString(),
      sbp: v.sbp,
      dbp: v.dbp,
      heartRate: v.heartRate,
      respiratoryRate: v.respiratoryRate,
      temperature: v.temperature,
      oxygenSaturation: v.oxygenSaturation,
      measuredAt: v.measuredAt,
      measuredBy: v.measuredBy.toString(),
      measuredBySnapshot: v.measuredBySnapshot,
      isDeleted: v.isDeleted || false,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    return NextResponse.json({
      data: formattedVitals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('GET /api/patients/[id]/vitals error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['DOCTOR', 'NURSE', 'ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = CreateVitalsSchema.safeParse(body || {});

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid vitals payload' },
        { status: 400 }
      );
    }

    const {
      sbp,
      dbp,
      heartRate,
      respiratoryRate,
      temperature,
      oxygenSaturation,
      measuredAt,
    } = parseResult.data;

    const newVitals = await VitalSign.create({
      patientId: patient._id,
      sbp: sbp ?? undefined,
      dbp: dbp ?? undefined,
      heartRate: heartRate ?? undefined,
      respiratoryRate: respiratoryRate ?? undefined,
      temperature: temperature ?? undefined,
      oxygenSaturation: oxygenSaturation ?? undefined,
      measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
      measuredBy: user._id,
      measuredBySnapshot: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      isDeleted: false,
    });

    const vitalsPayload = {
      id: newVitals._id.toString(),
      patientId: newVitals.patientId.toString(),
      sbp: newVitals.sbp,
      dbp: newVitals.dbp,
      heartRate: newVitals.heartRate,
      respiratoryRate: newVitals.respiratoryRate,
      temperature: newVitals.temperature,
      oxygenSaturation: newVitals.oxygenSaturation,
      measuredAt: newVitals.measuredAt,
      measuredBy: newVitals.measuredBy.toString(),
      measuredBySnapshot: newVitals.measuredBySnapshot,
      isDeleted: newVitals.isDeleted,
      createdAt: newVitals.createdAt,
      updatedAt: newVitals.updatedAt,
    };

    return NextResponse.json(
      {
        vitals: vitalsPayload,
        message: 'Vital signs recorded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/patients/[id]/vitals error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
