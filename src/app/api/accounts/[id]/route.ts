import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { User, UserRole } from '@/models/User';
import { Session } from '@/models/Session';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';

const UpdateAccountSchema = z
  .object({
    firstName: z.string().min(2).max(30).optional(),
    lastName: z.string().min(2).max(30).optional(),
    middleName: z.string().max(30).optional().nullable(),
    extension: z.string().max(10).optional().nullable(),
    role: z.enum(['DOCTOR', 'NURSE', 'ADMIN']).optional(),
    licenseNumber: z.string().max(30).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const targetUser = await User.findById(id).select('-passwordHash');
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        middleName: targetUser.middleName,
        extension: targetUser.extension,
        role: targetUser.role,
        isActive: targetUser.isActive,
        requiresPasswordChange: targetUser.requiresPasswordChange,
        licenseNumber: targetUser.licenseNumber,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('GET /api/accounts/[id] error:', error);
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
    requireRole(user, ['ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = UpdateAccountSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid update payload' },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updates = parseResult.data;

    // Doctor license validation
    const nextRole = updates.role || targetUser.role;
    const nextLicense =
      updates.licenseNumber !== undefined ? updates.licenseNumber : targetUser.licenseNumber;

    if (nextRole === 'DOCTOR' && (!nextLicense || !nextLicense.trim())) {
      return NextResponse.json(
        { message: 'License number is required for doctors.' },
        { status: 400 }
      );
    }

    // Protection: do not allow deactivating the last active ADMIN
    if (updates.isActive === false && targetUser.role === 'ADMIN' && targetUser.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { message: 'Cannot deactivate the last active administrator.' },
          { status: 400 }
        );
      }
    }

    if (updates.firstName !== undefined) targetUser.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) targetUser.lastName = updates.lastName.trim();
    if (updates.middleName !== undefined) {
      targetUser.middleName = updates.middleName ? updates.middleName.trim() : undefined;
    }
    if (updates.extension !== undefined) {
      targetUser.extension = updates.extension ? updates.extension.trim() : undefined;
    }
    if (updates.role !== undefined) targetUser.role = updates.role as UserRole;
    if (targetUser.role !== 'DOCTOR') {
      targetUser.licenseNumber = undefined;
    } else if (updates.licenseNumber !== undefined) {
      targetUser.licenseNumber = updates.licenseNumber ? updates.licenseNumber.trim() : undefined;
    }
    if (updates.isActive !== undefined) targetUser.isActive = updates.isActive;

    await targetUser.save();

    // If account was deactivated, invalidate its active session
    if (updates.isActive === false) {
      await Session.deleteOne({ userId: targetUser._id });
    }

    return NextResponse.json({
      message: 'Account updated successfully',
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        middleName: targetUser.middleName,
        extension: targetUser.extension,
        role: targetUser.role,
        isActive: targetUser.isActive,
        requiresPasswordChange: targetUser.requiresPasswordChange,
        licenseNumber: targetUser.licenseNumber,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('PATCH /api/accounts/[id] error:', error);
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
    requireRole(user, ['ADMIN']);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Refuse if it's the last active ADMIN
    if (targetUser.role === 'ADMIN' && targetUser.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { message: 'Cannot delete the last active administrator.' },
          { status: 400 }
        );
      }
    }

    // Invalidate any active session
    await Session.deleteOne({ userId: targetUser._id });
    // Remove user
    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('DELETE /api/accounts/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
