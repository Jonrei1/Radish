import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, IUser, UserRole } from '@/models/User';
import { Session, ISession } from '@/models/Session';
import {
  verifySessionJwt,
  signSessionJwt,
  RADISH_SESSION_COOKIE,
  getSessionTtlHours,
  SessionJwtPayload,
} from './jwt';

export interface AuthenticatedContext {
  user: IUser;
  session: ISession;
  payload: SessionJwtPayload;
}

export class AuthError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Extracts the radish_session token from a NextRequest, standard Request, or cookie string.
 */
export function getSessionTokenFromRequest(req: NextRequest | Request): string | null {
  if ('cookies' in req && typeof req.cookies?.get === 'function') {
    const cookie = req.cookies.get(RADISH_SESSION_COOKIE);
    if (cookie?.value) {
      return cookie.value;
    }
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${RADISH_SESSION_COOKIE}=([^;]+)`));
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Authoritative authentication guard for API route handlers.
 * Verifies JWT signature, enforces single-active-session sid equality against MongoDB,
 * checks user active status, and enforces the password-change interlock.
 */
export async function requireUser(req: NextRequest | Request): Promise<AuthenticatedContext> {
  await dbConnect();

  const token = getSessionTokenFromRequest(req);
  if (!token) {
    throw new AuthError('Authentication required', 401);
  }

  // 1. Verify JWT signature + expiry
  const payload = await verifySessionJwt(token);
  if (!payload) {
    throw new AuthError('Invalid or expired session token', 401);
  }

  // 2. Load the sessions doc for payload.sub; reject unless session.sid === payload.sid
  const session = await Session.findOne({ userId: payload.sub });
  if (!session || session.sid !== payload.sid) {
    throw new AuthError('Session expired or invalidated by another login', 401);
  }

  // 3. Load the users doc; reject if !isActive
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AuthError('Account is disabled or not found', 401);
  }

  // 4. Password-change interlock (ported from DAMAYAN JwtAuthGuard)
  // If user.requiresPasswordChange is true, only POST /api/auth/change-password and GET /api/auth/me may proceed
  if (user.requiresPasswordChange) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    const isAllowedMe = pathname.endsWith('/api/auth/me') && method === 'GET';
    const isAllowedChangePassword =
      pathname.endsWith('/api/auth/change-password') && method === 'POST';

    if (!isAllowedMe && !isAllowedChangePassword) {
      throw new AuthError('Password change required', 403);
    }
  }

  return { user, session, payload };
}

/**
 * Role check helper for admin-only routes.
 */
export function requireRole(user: IUser, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('Access denied: insufficient permissions', 403);
  }
}

/**
 * Sets the httpOnly session cookie on a NextResponse.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const ttlHours = getSessionTtlHours();
  const maxAgeSeconds = ttlHours * 60 * 60;

  response.cookies.set({
    name: RADISH_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

/**
 * Clears the session cookie on a NextResponse.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: RADISH_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Creates or rotates a user session upon successful login.
 * Generates a fresh sid, upserts the single session document in MongoDB,
 * and signs a new session JWT.
 */
export async function createActiveSession(user: IUser): Promise<{ token: string; sid: string }> {
  await dbConnect();

  const sid = crypto.randomUUID();
  const ttlHours = getSessionTtlHours();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  // Upsert the single session document for this user (overwriting any previous active session)
  await Session.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      sid,
      expiresAt,
      createdAt: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  const token = await signSessionJwt({
    sub: user._id.toString(),
    role: user.role,
    sid,
  });

  return { token, sid };
}

/**
 * Terminates the user session in MongoDB.
 */
export async function terminateSession(userId: string | IUser['_id']): Promise<void> {
  await dbConnect();
  await Session.deleteOne({ userId });
}
