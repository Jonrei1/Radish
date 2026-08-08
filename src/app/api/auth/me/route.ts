import { NextRequest, NextResponse } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        extension: user.extension,
        role: user.role,
        requiresPasswordChange: user.requiresPasswordChange,
        licenseNumber: user.licenseNumber,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('Auth me error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
