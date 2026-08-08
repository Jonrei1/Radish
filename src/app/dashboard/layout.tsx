'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppLoadingScreen } from '@/components/layout/AppLoadingScreen';
import { NarrowScreenNotice } from '@/components/layout/NarrowScreenNotice';

const emptySubscribe = () => () => {};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, requiresPasswordChange } = useAuthStore();
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (requiresPasswordChange) {
      router.replace('/change-password');
      return;
    }

    if (user.role === 'ADMIN') {
      router.replace('/admin/accounts');
    }
  }, [isHydrated, user, requiresPasswordChange, router]);

  if (!isHydrated || !user || requiresPasswordChange || user.role === 'ADMIN') {
    return <AppLoadingScreen />;
  }

  return (
    <div className="h-screen overflow-hidden bg-bg font-sans flex flex-col">
      <NarrowScreenNotice />
      <Topbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">{children}</main>
      </div>
    </div>
  );
}
