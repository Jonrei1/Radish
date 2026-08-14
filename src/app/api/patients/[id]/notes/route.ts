import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { Note, INote } from '@/models/Note';
import { Patient } from '@/models/Patient';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const CreateNoteSchema = z
  .object({
    notes: z.string().min(1, 'Notes section is required'),
    orders: z.string().optional().or(z.literal('')),
    noteDatetime: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(Date.parse(val)), {
        message: 'Invalid note datetime format',
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
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '1', 10)));
    const skip = (page - 1) * limit;

    // Newest -> oldest, includes soft-deleted notes for client ghost row rendering
    const [notes, total] = await Promise.all([
      Note.find({ patientId: id })
        .sort({ noteDatetime: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<INote[]>(),
      Note.countDocuments({ patientId: id }),
    ]);

    const formattedNotes = notes.map((n) => ({
      id: n._id.toString(),
      patientId: n.patientId.toString(),
      authorId: n.authorId.toString(),
      authorSnapshot: n.authorSnapshot,
      noteDatetime: n.noteDatetime,
      notes: n.notes,
      orders: n.orders || '',
      isDeleted: n.isDeleted || false,
      deletedBy: n.deletedBy?.toString(),
      deletedAt: n.deletedAt,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json({
      data: formattedNotes,
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
    console.error('GET /api/patients/[id]/notes error:', error);
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
    // Note creation is author/doctor only
    requireRole(user, ['DOCTOR']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = CreateNoteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid note payload' },
        { status: 400 }
      );
    }

    const { notes, orders, noteDatetime } = parseResult.data;

    const newNote = await Note.create({
      patientId: patient._id,
      authorId: user._id,
      authorSnapshot: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        licenseNumber: user.licenseNumber,
      },
      noteDatetime: noteDatetime ? new Date(noteDatetime) : new Date(),
      notes: notes.trim(),
      orders: orders?.trim() || undefined,
      isDeleted: false,
    });

    const notePayload = {
      id: newNote._id.toString(),
      patientId: newNote.patientId.toString(),
      authorId: newNote.authorId.toString(),
      authorSnapshot: newNote.authorSnapshot,
      noteDatetime: newNote.noteDatetime,
      notes: newNote.notes,
      orders: newNote.orders || '',
      isDeleted: newNote.isDeleted,
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt,
    };

    return NextResponse.json(
      {
        note: notePayload,
        message: 'Note created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/patients/[id]/notes error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
