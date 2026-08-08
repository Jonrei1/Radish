'use client';

import { Users } from 'lucide-react';

export default function DashboardEmptyPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg">
      <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted mb-3">
        <Users className="w-6 h-6" />
      </div>
      <h2 className="text-[16px] font-bold text-text-primary mb-1 font-sans">
        No Patient Selected
      </h2>
      <p className="text-[13px] text-text-muted max-w-sm">
        Select a patient from the sidebar to view their clinical notes and recorded vital signs.
      </p>
    </div>
  );
}
