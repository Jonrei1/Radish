'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: (
          <CheckCircle2 className="size-5 text-[var(--accent-hover)] stroke-[2.5]" />
        ),
        info: <Info className="size-5 text-[var(--blue)] stroke-[2.5]" />,
        warning: (
          <AlertTriangle className="size-5 text-[var(--amber)] stroke-[2.5]" />
        ),
        error: <XCircle className="size-5 text-[var(--red)] stroke-[2.5]" />,
        loading: (
          <Loader2 className="size-5 text-[var(--accent-hover)] stroke-[2.5] animate-spin" />
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--surface)',
          '--normal-text': 'var(--text-primary)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-card)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-card rounded-card border p-4 flex gap-3 items-center w-full font-sans ' +
            'data-[type=success]:border-[var(--accent-mid)]! data-[type=success]:bg-[var(--accent-light)]! data-[type=success]:text-[var(--accent-hover)]! ' +
            'data-[type=error]:border-[var(--red-border)]! data-[type=error]:bg-[var(--red-bg)]! data-[type=error]:text-[var(--red)]! ' +
            'data-[type=warning]:border-[var(--amber-border)]! data-[type=warning]:bg-[var(--amber-bg)]! data-[type=warning]:text-[var(--amber)]! ' +
            'data-[type=info]:border-[var(--blue-border)]! data-[type=info]:bg-[var(--blue-bg)]! data-[type=info]:text-[var(--blue)]!',
          title: 'text-inherit font-semibold text-[13px]',
          description: 'text-inherit opacity-90 text-[12px]',
          actionButton:
            'bg-accent text-white font-medium text-[12px] rounded-btn px-3 py-1',
          cancelButton:
            'bg-surface-2 text-text-secondary font-medium text-[12px] rounded-btn px-3 py-1',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
