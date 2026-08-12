import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const RADISH_SESSION_COOKIE = 'radish_session';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

interface QuickPayload {
  sub: string;
  role: 'DOCTOR' | 'NURSE' | 'ADMIN';
  sid: string;
}

async function verifyTokenFast(token: string): Promise<QuickPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub === 'string' &&
      (payload.role === 'DOCTOR' || payload.role === 'NURSE' || payload.role === 'ADMIN') &&
      typeof payload.sid === 'string'
    ) {
      return {
        sub: payload.sub,
        role: payload.role,
        sid: payload.sid,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and Next internals are always public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Public API route
  if (pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(RADISH_SESSION_COOKIE)?.value;
  const payload = sessionCookie ? await verifyTokenFast(sessionCookie) : null;

  // Handle Login page access
  if (pathname === '/login') {
    if (payload) {
      const redirectUrl =
        payload.role === 'ADMIN' ? '/admin/accounts' : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // If unauthenticated
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Root path routing
  if (pathname === '/') {
    const target = payload.role === 'ADMIN' ? '/admin/accounts' : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Canonical admin index redirect
  if (pathname === '/admin' || pathname === '/admin/') {
    if (payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/admin/accounts', request.url));
  }

  // Fast-path guard for /admin/*
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
