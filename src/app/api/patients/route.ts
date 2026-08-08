import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { Patient, PatientSex } from '@/models/Patient';
import { getNextPatientCode } from '@/models/Counter';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const CreatePatientSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    middleName: z.string().max(50).optional().or(z.literal('')),
    extension: z.string().max(10).optional().or(z.literal('')),
    dateOfBirth: z.string().min(1, 'Date of birth is required').refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth format',
    }),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await requireUser(req);

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const includeInactive = searchParams.get('includeInactive') === 'true' || searchParams.get('includeInactive') === '1';

    const filter: Record<string, unknown> = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { patientCode: regex },
        { lastName: regex },
        { firstName: regex },
        { middleName: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    const formattedPatients = patients.map((p) => ({
      id: p._id.toString(),
      patientCode: p.patientCode,
      lastName: p.lastName,
      firstName: p.firstName,
      middleName: p.middleName,
      extension: p.extension,
      dateOfBirth: p.dateOfBirth,
      sex: p.sex,
      isActive: p.isActive,
      createdBy: p.createdBy?.toString(),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      data: formattedPatients,
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
    console.error('GET /api/patients error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['DOCTOR', 'ADMIN']);

    const body = await req.json().catch(() => null);
    const parseResult = CreatePatientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid patient payload' },
        { status: 400 }
      );
    }

    const { firstName, lastName, middleName, extension, dateOfBirth, sex } = parseResult.data;

    // Concurrency-safe atomic patient code generation
    const patientCode = await getNextPatientCode();

    const newPatient = await Patient.create({
      patientCode,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName?.trim() || undefined,
      extension: extension?.trim() || undefined,
      dateOfBirth: new Date(dateOfBirth),
      sex: sex as PatientSex,
      isActive: true,
      createdBy: user._id,
    });

    const patientPayload = {
      id: newPatient._id.toString(),
      patientCode: newPatient.patientCode,
      lastName: newPatient.lastName,
      firstName: newPatient.firstName,
      middleName: newPatient.middleName,
      extension: newPatient.extension,
      dateOfBirth: newPatient.dateOfBirth,
      sex: newPatient.sex,
      isActive: newPatient.isActive,
      createdBy: newPatient.createdBy.toString(),
      createdAt: newPatient.createdAt,
      updatedAt: newPatient.updatedAt,
    };

    return NextResponse.json(
      {
        patient: patientPayload,
        message: 'Patient registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/patients error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
