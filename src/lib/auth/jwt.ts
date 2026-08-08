import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@/models/User';

export const RADISH_SESSION_COOKIE = 'radish_session';

export interface SessionJwtPayload {
  sub: string;
  role: UserRole;
  sid: string;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export function getSessionTtlHours(): number {
  const ttl = parseInt(process.env.SESSION_TTL_HOURS || '8', 10);
  return isNaN(ttl) || ttl <= 0 ? 8 : ttl;
}

export async function signSessionJwt(payload: {
  sub: string;
  role: UserRole;
  sid: string;
}): Promise<string> {
  const secretKey = getJwtSecretKey();
  const ttlHours = getSessionTtlHours();

  return new SignJWT({
    sub: payload.sub,
    role: payload.role,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(secretKey);
}

export async function verifySessionJwt(token: string): Promise<SessionJwtPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub !== 'string' ||
      (payload.role !== 'DOCTOR' && payload.role !== 'ADMIN') ||
      typeof payload.sid !== 'string'
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      sid: payload.sid,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
