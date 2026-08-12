'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { usePatientStore } from '@/stores/patientStore';
import { apiRequest } from '@/lib/api';
import { initials } from '@/lib/patient-utils';
import { Menu, PlusCircle } from 'lucide-react';

export function Topbar() {
  const { user, clear } = useAuthStore();
  const { toggleSidebar } = useUiStore();
  const { activePatient } = usePatientStore();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}
    }
    clear();
    window.location.replace('/login');
  };

  const userInitials = user ? initials(user.firstName, user.lastName) : '??';

  return (
    <header className="@container h-[var(--topbar-h)] bg-surface border-b border-border flex items-center px-4 @max-[1023px]:px-3 gap-3 sticky top-0 z-[200] shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        className="w-8 h-8 bg-transparent border-transparent hover:bg-surface-2 hover:border-border transition-all duration-150 inline-flex items-center justify-center rounded-btn cursor-pointer shrink-0"
      >
        <Menu className="w-[18px] h-[18px] text-text-secondary" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 @min-[1024px]:w-[var(--sidebar-w)] flex-shrink-0 overflow-hidden">
        <div className="w-[22px] h-[22px] bg-accent rounded-[5px] flex items-center justify-center flex-shrink-0">
          <PlusCircle size={12} color="white" strokeWidth={3} />
        </div>
        <span className="text-[16px] font-bold tracking-[0.5px] whitespace-nowrap text-text-primary @max-[1023px]:hidden">
          RADISH{' '}
          <small className="text-[9px] font-semibold text-text-muted tracking-[1px] uppercase mt-[3px]">
            EMR
          </small>
        </span>
      </div>

      {/* Active patient chip (centered) */}
      {activePatient && (
        <div
          onClick={() => router.push(`/dashboard/${activePatient.id}/notes`)}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-2 border border-accent rounded-full px-3.5 py-1 @max-[767px]:px-1.5 @max-[767px]:py-1 cursor-pointer shadow-sm z-10"
        >
          <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-bold">
            {initials(activePatient.firstName, activePatient.lastName)}
          </div>
          <span className="text-[11px] font-semibold text-text-primary @max-[767px]:hidden">
            {activePatient.lastName}, {activePatient.firstName}
          </span>
          <span className="font-mono text-[9px] text-text-muted @max-[767px]:hidden">
            #{activePatient.patientCode}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Right zone */}
      <div className="flex items-center gap-2 shrink-0">
        {/* User name + avatar */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border shrink-0 @max-[1023px]:pl-0 @max-[1023px]:ml-0 @max-[1023px]:border-l-0">
          <div className="flex flex-col items-end leading-tight justify-center @max-[1023px]:hidden">
            <span className="text-[12px] font-semibold text-text-primary mb-1">
              {user ? `${user.firstName} ${user.lastName}` : ''}
            </span>
            {user && (
              <span
                className={`inline-flex items-center justify-center px-1.5 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider border ${
                  user.role === 'DOCTOR'
                    ? 'bg-accent-light text-text-primary border-accent'
                    : user.role === 'NURSE'
                    ? 'bg-blue-bg text-blue border-blue-border'
                    : 'bg-purple-bg text-purple border-purple-border'
                }`}
              >
                {user.role === 'DOCTOR' ? 'Doctor' : user.role === 'NURSE' ? 'Nurse' : 'Admin'}
              </span>
            )}
            {user?.role === 'DOCTOR' && user.licenseNumber && (
              <span className="text-[10px] text-text-muted mt-0.5">
                Lic: {user.licenseNumber}
              </span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-hover text-white text-[11px] font-bold border-2 border-border flex items-center justify-center shrink-0 cursor-default">
            {userInitials}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="h-[28px] px-3 rounded-btn text-[11px] font-semibold bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary hover:border-border-strong transition-all duration-150 inline-flex items-center justify-center gap-[5px] whitespace-nowrap cursor-pointer shrink-0"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
