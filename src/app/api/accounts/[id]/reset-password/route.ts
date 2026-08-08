import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { Session } from '@/models/Session';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';
import { generateTempPassword, hashPassword } from '@/lib/auth/password';

export async function POST(
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

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    targetUser.passwordHash = passwordHash;
    targetUser.requiresPasswordChange = true;
    await targetUser.save();

    // Invalidate active session immediately
    await Session.deleteOne({ userId: targetUser._id });

    return NextResponse.json({
      message: 'Password reset successfully',
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        requiresPasswordChange: targetUser.requiresPasswordChange,
      },
      tempPassword,
      note: 'Save this temporary password securely. It will be shown once and not stored in plaintext.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/accounts/[id]/reset-password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
