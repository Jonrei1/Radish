import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { verifyPassword } from '@/lib/auth/password';
import { createActiveSession, setSessionCookie } from '@/lib/auth/session';

const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => null);
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid login payload' },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact an administrator.' },
        { status: 401 }
      );
    }

    // Rotates sid, upserts single session document in MongoDB, signs JWT
    const { token } = await createActiveSession(user);

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      extension: user.extension,
      role: user.role,
      requiresPasswordChange: user.requiresPasswordChange,
      licenseNumber: user.licenseNumber,
    };

    const response = NextResponse.json({
      user: userPayload,
      message: 'Login successful',
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
