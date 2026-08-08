import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionJwt, RADISH_SESSION_COOKIE } from '@/lib/auth/jwt';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RADISH_SESSION_COOKIE)?.value;

  if (token) {
    const payload = await verifySessionJwt(token);
    if (payload) {
      if (payload.role === 'ADMIN') {
        redirect('/admin/accounts');
      } else {
        redirect('/dashboard');
      }
    }
  }

  redirect('/login');
}
