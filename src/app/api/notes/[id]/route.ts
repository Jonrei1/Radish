import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { Note } from '@/models/Note';
import { requireUser, AuthError } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid note ID' }, { status: 400 });
    }

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    if (note.isDeleted) {
      return NextResponse.json({ message: 'Cannot edit a deleted note' }, { status: 400 });
    }

    const isAuthor = note.authorId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';
    const isDoctor = user.role === 'DOCTOR';

    if (!isAuthor && !isAdmin && !isDoctor) {
      return NextResponse.json(
        { message: 'You are not authorized to edit this note.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (typeof body.notes === 'string') {
      if (!body.notes.trim()) {
        return NextResponse.json({ message: 'Notes section cannot be empty' }, { status: 400 });
      }
      note.notes = body.notes.trim();
    }
    if (typeof body.orders === 'string') {
      note.orders = body.orders.trim();
    }

    await note.save();

    return NextResponse.json({
      message: 'Note updated successfully',
      note: {
        id: note._id.toString(),
        patientId: note.patientId.toString(),
        authorId: note.authorId.toString(),
        authorSnapshot: note.authorSnapshot,
        noteDatetime: note.noteDatetime,
        notes: note.notes,
        orders: note.orders || '',
        isDeleted: note.isDeleted,
        deletedBy: note.deletedBy?.toString(),
        deletedAt: note.deletedAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('PATCH /api/notes/[id] error:', error);
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

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid note ID' }, { status: 400 });
    }

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    // Permission check: Author, DOCTOR, or ADMIN
    const isAuthor = note.authorId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';
    const isDoctor = user.role === 'DOCTOR';

    if (!isAuthor && !isAdmin && !isDoctor) {
      return NextResponse.json(
        { message: 'You are not authorized to delete this note.' },
        { status: 403 }
      );
    }

    // Soft delete only — sets isDeleted, deletedBy, deletedAt
    note.isDeleted = true;
    note.deletedBy = user._id;
    note.deletedAt = new Date();
    await note.save();

    return NextResponse.json({
      message: 'Note deleted successfully',
      note: {
        id: note._id.toString(),
        patientId: note.patientId.toString(),
        authorId: note.authorId.toString(),
        authorSnapshot: note.authorSnapshot,
        noteDatetime: note.noteDatetime,
        notes: note.notes,
        orders: note.orders || '',
        isDeleted: note.isDeleted,
        deletedBy: note.deletedBy?.toString(),
        deletedAt: note.deletedAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
