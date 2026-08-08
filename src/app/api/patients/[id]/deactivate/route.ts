import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { Patient } from '@/models/Patient';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    patient.isActive = false;
    await patient.save();

    return NextResponse.json({
      message: 'Patient deactivated successfully',
      patient: {
        id: patient._id.toString(),
        patientCode: patient.patientCode,
        lastName: patient.lastName,
        firstName: patient.firstName,
        isActive: patient.isActive,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('PATCH /api/patients/[id]/deactivate error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
