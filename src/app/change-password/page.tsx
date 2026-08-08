'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { PlusCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, requiresPasswordChange, clear } = useAuthStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Guard: if no password change is required, redirect away
  useEffect(() => {
    if (user && !requiresPasswordChange) {
      if (user.role === 'ADMIN') {
        router.replace('/admin/accounts');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, requiresPasswordChange, router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clear();
    router.push('/login');
  };

  const handleSubmit = async () => {
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setError('Password must include uppercase, lowercase, digit, and special character.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Failed to change password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Brief success message, then redirect to login
      setTimeout(async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
          // ignore
        }
        clear();
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to change password. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-full bg-bg flex items-center justify-center font-sans py-10 px-4">
      <div className="flex flex-col items-center gap-4 w-full max-w-[400px]">
        {/* Card */}
        <div className="bg-surface border border-border rounded-card shadow-card px-9 py-10 w-full">
          {/* Logo + App name */}
          <div className="flex items-center gap-2 mb-7">
            <div className="w-[22px] h-[22px] bg-accent rounded-[5px] flex items-center justify-center flex-shrink-0">
              <PlusCircle size={12} color="white" strokeWidth={3} />
            </div>
            <span className="text-[16px] font-bold tracking-[0.5px] whitespace-nowrap text-text-primary">
              RADISH <small className="text-[9px] font-semibold text-text-muted tracking-[1px] uppercase mt-[3px]">EMR</small>
            </span>
          </div>

          {/* User identity */}
          <div className="mb-5">
            <h1 className="text-[15px] font-bold text-text-primary mb-1 mt-0">
              Change Temporary Password
            </h1>
            <p className="text-[12px] text-text-muted mt-1 mb-0">
              {user.firstName} {user.lastName} · {user.email}
            </p>
          </div>

          {/* Explanation Alert */}
          <div className="bg-amber-bg border border-amber-border rounded-card px-3 py-2.5 mb-5">
            <p className="text-[11px] text-amber m-0 leading-relaxed font-medium">
              Your account was provisioned with a temporary password. Set a permanent password to continue.
            </p>
          </div>

          {/* New Password */}
          <div className="mb-3.5">
            <label
              htmlFor="new-password"
              className="block text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-1.5"
            >
              New Password
            </label>
            <div className="relative w-full">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 12 chars, mixed case, digit, special"
                className="h-[34px] w-full px-2.5 pr-9 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none transition-all duration-150 focus:bg-surface focus:border-accent focus:shadow-accent-focus placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none w-5 h-5 flex items-center justify-center"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
                  <EyeOff size={14} />
                ) : (
                  <Eye size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-5">
            <label
              htmlFor="confirm-password"
              className="block text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative w-full">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="h-[34px] w-full px-2.5 pr-9 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none transition-all duration-150 focus:bg-surface focus:border-accent focus:shadow-accent-focus placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none w-5 h-5 flex items-center justify-center"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff size={14} />
                ) : (
                  <Eye size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Password requirements hint */}
          <div className="mb-4 px-0.5">
            <p className="text-[10px] text-text-muted m-0 leading-relaxed">
              Password requirements: at least 12 characters, one uppercase, one lowercase, one digit, one special character.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red font-semibold mb-3.5">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-[12px] text-green font-semibold mb-3.5">
              Password changed successfully. Redirecting to login…
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !newPassword || !confirmPassword}
            className={`h-[34px] w-full text-white border border-accent-hover rounded-btn text-[11px] font-semibold shadow-btn-primary transition-all duration-150 font-sans flex items-center justify-center gap-2 ${loading ? 'bg-accent-hover cursor-not-allowed' : 'bg-accent cursor-pointer hover:bg-accent-hover hover:shadow-btn-primary-hover'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Changing Password…</span>
              </>
            ) : (
              'Set New Password'
            )}
          </button>
        </div>

        {/* Sign Out button — below the card */}
        <button
          onClick={handleSignOut}
          className="sec-btn text-[11px]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
