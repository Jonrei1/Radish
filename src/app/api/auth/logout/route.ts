import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Session } from '@/models/Session';
import {
  getSessionTokenFromRequest,
  clearSessionCookie,
} from '@/lib/auth/session';
import { verifySessionJwt } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const token = getSessionTokenFromRequest(req);
    if (token) {
      const payload = await verifySessionJwt(token);
      if (payload?.sub) {
        // Delete the session document outright, invalidating the session instantly
        await Session.deleteOne({ userId: payload.sub });
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    clearSessionCookie(response);
    return response;
  }
}
