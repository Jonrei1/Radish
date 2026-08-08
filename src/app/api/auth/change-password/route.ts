import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, AuthError } from '@/lib/auth/session';
import { hashPassword, PASSWORD_COMPLEXITY_REGEX } from '@/lib/auth/password';

const ChangePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters long')
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);

    const body = await req.json().catch(() => null);
    const parseResult = ChangePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid password payload' },
        { status: 400 }
      );
    }

    const { newPassword } = parseResult.data;
    const passwordHash = await hashPassword(newPassword);

    user.passwordHash = passwordHash;
    user.requiresPasswordChange = false;
    await user.save();

    return NextResponse.json({
      message: 'Password changed successfully',
      requiresPasswordChange: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
