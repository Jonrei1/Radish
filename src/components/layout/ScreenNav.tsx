'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FileText, Activity } from 'lucide-react';

const TABS = [
  { id: 'notes', label: 'Notes', path: '/notes', icon: FileText },
  { id: 'vitals', label: 'Vital Signs', path: '/vitals', icon: Activity },
] as const;

export function ScreenNav({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const basePath = `/dashboard/${patientId}`;

  const isActive = (tab: (typeof TABS)[number]) => {
    return pathname.startsWith(`${basePath}${tab.path}`);
  };

  const handleTabHover = useCallback(
    (tabId: string) => {
      if (tabId === 'notes') {
        queryClient.prefetchQuery({
          queryKey: ['notes', patientId],
          queryFn: () => apiRequest(`/patients/${patientId}/notes`),
        });
      } else if (tabId === 'vitals') {
        queryClient.prefetchQuery({
          queryKey: ['vitals', patientId, 1, 20],
          queryFn: () => apiRequest(`/patients/${patientId}/vitals?page=1&limit=20`),
        });
      }
    },
    [queryClient, patientId]
  );

  return (
    <nav className="flex items-center gap-1.5 bg-surface border-b border-border px-4 @max-[1100px]:px-2.5 h-[52px] flex-shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={`${basePath}${tab.path}`}
            prefetch={true}
            onMouseEnter={() => handleTabHover(tab.id)}
            aria-label={tab.label}
            title={tab.label}
            className={cn(
              'group h-8 text-[12px] font-medium rounded-btn border whitespace-nowrap transition-all duration-300 ease-in-out flex-shrink-0 cursor-pointer flex items-center justify-start overflow-hidden px-3.5',
              active
                ? 'bg-accent text-white border-accent shadow-[0_4px_12px_rgba(10,110,95,0.25)]'
                : 'bg-surface-2 text-text-secondary border-border hover:bg-surface-3 hover:border-border-strong hover:text-text-primary'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="ml-1.5 whitespace-nowrap inline-block">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
