import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { Patient, IPatient, PatientSex } from '@/models/Patient';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const UpdatePatientSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    middleName: z.string().max(50).optional().nullable(),
    extension: z.string().max(10).optional().nullable(),
    dateOfBirth: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(Date.parse(val)), {
        message: 'Invalid date of birth format',
      }),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
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

    const patient = await Patient.findById(id).lean<IPatient | null>();
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({
      patient: {
        id: patient._id.toString(),
        patientCode: patient.patientCode,
        lastName: patient.lastName,
        firstName: patient.firstName,
        middleName: patient.middleName,
        extension: patient.extension,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        isActive: patient.isActive,
        createdBy: patient.createdBy?.toString(),
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('GET /api/patients/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['DOCTOR', 'ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid patient ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = UpdatePatientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid update payload' },
        { status: 400 }
      );
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    const updates = parseResult.data;

    if (updates.firstName !== undefined) patient.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) patient.lastName = updates.lastName.trim();
    if (updates.middleName !== undefined) {
      patient.middleName = updates.middleName ? updates.middleName.trim() : undefined;
    }
    if (updates.extension !== undefined) {
      patient.extension = updates.extension ? updates.extension.trim() : undefined;
    }
    if (updates.dateOfBirth !== undefined) {
      patient.dateOfBirth = new Date(updates.dateOfBirth);
    }
    if (updates.sex !== undefined) {
      patient.sex = updates.sex as PatientSex;
    }

    await patient.save();

    return NextResponse.json({
      message: 'Patient updated successfully',
      patient: {
        id: patient._id.toString(),
        patientCode: patient.patientCode,
        lastName: patient.lastName,
        firstName: patient.firstName,
        middleName: patient.middleName,
        extension: patient.extension,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        isActive: patient.isActive,
        createdBy: patient.createdBy.toString(),
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('PATCH /api/patients/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
