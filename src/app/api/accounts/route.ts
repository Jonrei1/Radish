import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { User, UserRole } from '@/models/User';
import { requireUser, requireRole, AuthError } from '@/lib/auth/session';
import { generateTempPassword, hashPassword } from '@/lib/auth/password';

const CreateAccountSchema = z
  .object({
    email: z.string().email('Valid email is required'),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(30),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(30),
    middleName: z.string().max(30).optional().or(z.literal('')),
    extension: z.string().max(10).optional().or(z.literal('')),
    role: z.enum(['DOCTOR', 'NURSE', 'ADMIN']),
    licenseNumber: z.string().max(30).optional().or(z.literal('')),
  })
  .strict()
  .refine(
    (data) => {
      if (data.role === 'DOCTOR' && (!data.licenseNumber || !data.licenseNumber.trim())) {
        return false;
      }
      return true;
    },
    {
      message: 'License number is required for doctors',
      path: ['licenseNumber'],
    }
  );

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['ADMIN']);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const roleParam = searchParams.get('role');
    const isActiveParam = searchParams.get('isActive');

    const filter: Record<string, unknown> = {};
    if (roleParam && (roleParam === 'DOCTOR' || roleParam === 'NURSE' || roleParam === 'ADMIN')) {
      filter.role = roleParam;
    }
    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== '') {
      filter.isActive = isActiveParam === 'true';
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash')
        .lean(),
      User.countDocuments(filter),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      middleName: u.middleName,
      extension: u.extension,
      role: u.role,
      isActive: u.isActive,
      requiresPasswordChange: u.requiresPasswordChange,
      licenseNumber: u.licenseNumber,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({
      data: formattedUsers,
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
    console.error('GET /api/accounts error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user } = await requireUser(req);
    requireRole(user, ['ADMIN']);

    const body = await req.json().catch(() => null);
    const parseResult = CreateAccountSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.issues[0]?.message || 'Invalid account payload' },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, middleName, extension, role, licenseNumber } =
      parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName?.trim() || undefined,
      extension: extension?.trim() || undefined,
      role: role as UserRole,
      licenseNumber: role === 'DOCTOR' ? (licenseNumber?.trim() || undefined) : undefined,
      isActive: true,
      requiresPasswordChange: true,
    });

    const userPayload = {
      id: newUser._id.toString(),
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      middleName: newUser.middleName,
      extension: newUser.extension,
      role: newUser.role,
      isActive: newUser.isActive,
      requiresPasswordChange: newUser.requiresPasswordChange,
      licenseNumber: newUser.licenseNumber,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return NextResponse.json(
      {
        user: userPayload,
        tempPassword,
        note: 'Save this temporary password securely. It will be shown once and not stored in plaintext.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/accounts error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
