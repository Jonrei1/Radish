import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { Note } from '@/models/Note';
import { requireUser, AuthError } from '@/lib/auth/session';

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

    // Permission check: Author or ADMIN only
    const isAuthor = note.authorId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
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
