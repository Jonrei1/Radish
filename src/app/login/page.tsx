'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/spinner';
import { PlusCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, clear } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Guard: if already authenticated, check existing session via /api/auth/me
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (data.user.requiresPasswordChange) {
            router.replace('/change-password');
          } else if (data.user.role === 'ADMIN') {
            router.replace('/admin/accounts');
          } else {
            router.replace('/dashboard');
          }
          return;
        } else {
          clear();
        }
      } catch {
        clear();
      } finally {
        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router, setUser, clear]);

  const handleLogin = async () => {
    if (!email || !password || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Login failed. Check your credentials.');
        setLoading(false);
        return;
      }

      setUser(data.user);

      // Route: password change required → admin → doctor dashboard
      if (data.user.requiresPasswordChange) {
        router.replace('/change-password');
      } else if (data.user.role === 'ADMIN') {
        router.replace('/admin/accounts');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return null;
  }

  return (
    <div className="min-h-full bg-bg flex items-center justify-center font-sans overflow-hidden py-10 px-4">
      <div className="bg-surface border border-border rounded-card shadow-card px-9 py-10 w-full max-w-[400px]">
        {/* Logo + App name */}
        <div className="flex items-center gap-2 mb-7">
          <div className="w-[22px] h-[22px] bg-accent rounded-[5px] flex items-center justify-center flex-shrink-0">
            <PlusCircle size={12} color="white" strokeWidth={3} />
          </div>
          <span className="text-[16px] font-bold tracking-[0.5px] whitespace-nowrap text-text-primary">
            RADISH <small className="text-[9px] font-semibold text-text-muted tracking-[1px] uppercase mt-[3px]">EMR</small>
          </span>
        </div>

        <h1 className="text-[15px] font-bold text-text-primary mb-1">
          Sign in to your account
        </h1>
        <p className="text-[12px] text-text-muted mb-6">
          Use the credentials provided by your administrator.
        </p>

        {/* Email field */}
        <div className="mb-3.5 flex flex-col">
          <label
            htmlFor="email"
            className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@radish.local"
            className="h-[34px] w-full px-2.5 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none transition-all duration-150 focus:bg-surface focus:border-accent focus:shadow-accent-focus placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2"
          />
        </div>

        {/* Password field */}
        <div className="mb-5 flex flex-col">
          <label
            htmlFor="password"
            className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-1.5"
          >
            Password
          </label>
          <div className="relative w-full">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••••••"
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
              className="h-[34px] w-full px-2.5 pr-9 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none transition-all duration-150 focus:bg-surface focus:border-accent focus:shadow-accent-focus placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none w-5 h-5 flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[12px] text-red font-semibold mb-3.5">
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className={`h-[34px] w-full text-white border border-accent-hover rounded-btn text-[11px] font-semibold shadow-btn-primary transition-all duration-150 flex items-center justify-center gap-2 ${loading ? 'bg-accent-hover cursor-not-allowed' : 'bg-accent cursor-pointer hover:bg-accent-hover hover:shadow-btn-primary-hover'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Signing in…</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <p className="mt-5 text-[11px] text-text-muted text-center">
          Accounts are provisioned by your system administrator.
        </p>
      </div>
    </div>
  );
}
