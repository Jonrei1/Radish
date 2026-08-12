'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const RoleBadge = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    ADMIN: 'bg-purple-bg text-purple border-purple-border',
    DOCTOR: 'bg-accent-light text-text-primary border-accent',
    NURSE: 'bg-blue-bg text-blue border-blue-border',
  };
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-[2px] rounded-[4px] border inline-flex items-center ${
        map[role] || 'bg-surface-2 text-text-secondary border-border'
      }`}
    >
      {role}
    </span>
  );
};

export const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-[2px] rounded-[4px] border inline-flex items-center ${
      isActive
        ? 'bg-green-bg text-green border-green-border'
        : 'bg-surface-2 text-text-muted border-border'
    }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

export const PrimaryBtn = ({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="h-[28px] px-3 rounded-btn text-[11px] font-semibold bg-accent text-white border border-accent-hover shadow-btn-primary hover:bg-accent-hover hover:shadow-btn-primary-hover transition-all duration-150 inline-flex items-center justify-center gap-[5px] whitespace-nowrap min-w-[80px] cursor-pointer disabled:bg-text-muted disabled:border-border-strong disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export const SecBtn = ({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'h-[28px] px-3 rounded-btn text-[11px] font-semibold transition-all duration-150 inline-flex items-center justify-center gap-[5px] whitespace-nowrap min-w-[80px] cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed',
      danger
        ? 'bg-red-bg text-red border-red-border hover:bg-red/15 hover:border-red/80'
        : 'bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary hover:border-border-strong'
    )}
  >
    {children}
  </button>
);

export const Field = ({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
      {label}{' '}
      {required && (
        <span className="text-red font-bold text-[11px] align-top ml-[2px]">*</span>
      )}
    </label>
    {children}
  </div>
);

export const inputClassName =
  'w-full h-[34px] px-2.5 bg-surface border rounded-btn text-[13px] text-text-primary outline-none transition-all duration-150 focus:bg-surface placeholder:text-text-muted';

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination = ({ page, totalPages, onPageChange }: AdminPaginationProps) => {
  if (totalPages <= 1) return null;
  return (
    <div className="px-3.5 py-2.5 border-t border-border flex gap-2 justify-end bg-surface-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            'w-7 h-7 rounded-btn text-[11px] font-semibold cursor-pointer border flex items-center justify-center transition-all duration-150',
            p === page
              ? 'bg-accent text-white border-accent-hover shadow-btn-primary'
              : 'bg-surface text-text-secondary border-border hover:bg-surface-2 hover:border-border-strong hover:text-text-primary'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
};

export interface CreateAccountResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    role: string;
    isActive: boolean;
  };
  tempPassword: string;
  note: string;
}

export function TempPasswordToast({
  result,
  onDismiss,
}: {
  result: CreateAccountResult;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[2000] bg-surface border border-green-border rounded-card shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-5 py-4 w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex justify-between items-start mb-2.5">
        <span className="text-[13px] font-bold text-green flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
          Password Generated
        </span>
        <button
          onClick={onDismiss}
          className="w-5 h-5 rounded-btn bg-transparent border-transparent hover:bg-surface-2 hover:border-border transition-all duration-150 inline-flex items-center justify-center text-text-muted cursor-pointer text-sm leading-none"
        >
          ×
        </button>
      </div>
      <p className="text-[12px] text-text-secondary mb-2.5">
        {result.user.firstName} {result.user.lastName} ({result.user.role}) — {result.user.email}
      </p>
      <div className="bg-surface-2 border border-border rounded-btn px-3 py-2 mb-2.5">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.6px] mb-1">
          Temporary Password (shown once)
        </p>
        <code className="text-[15px] font-bold text-text-primary font-mono select-all">
          {result.tempPassword}
        </code>
      </div>
      <p className="text-[11px] text-text-muted">{result.note}</p>
    </div>
  );
}
