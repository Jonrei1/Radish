import { useAuthStore } from '@/stores/authStore';

export function normalizeApiPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/api/')) {
    return path;
  }
  if (path.startsWith('/api?')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `/api${path}`;
  }
  return `/api/${path}`;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = normalizeApiPath(path);

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  }

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().clear();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }

    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
