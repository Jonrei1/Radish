'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import {
  RoleBadge,
  StatusBadge,
  PrimaryBtn,
  SecBtn,
  Field,
  inputClassName,
  AdminPagination,
  CreateAccountResult,
  TempPasswordToast,
} from '@/components/admin/AdminShared';
import { X } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  extension?: string;
  role: 'DOCTOR' | 'NURSE' | 'ADMIN';
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: string;
  licenseNumber?: string;
}

interface AccountsResponse {
  data: Account[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function CreateAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: CreateAccountResult) => void;
}) {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    extension: '',
    role: 'DOCTOR' as 'DOCTOR' | 'NURSE' | 'ADMIN',
    licenseNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Valid email is required.';
    }
    if (!form.firstName || form.firstName.trim().length < 2) {
      e.firstName = 'First name must be at least 2 characters.';
    } else if (form.firstName.length > 30) {
      e.firstName = 'First name must not exceed 30 characters.';
    }
    if (!form.lastName || form.lastName.trim().length < 2) {
      e.lastName = 'Last name must be at least 2 characters.';
    } else if (form.lastName.length > 30) {
      e.lastName = 'Last name must not exceed 30 characters.';
    }
    if (form.middleName && form.middleName.length > 30) {
      e.middleName = 'Middle name must not exceed 30 characters.';
    }
    if (form.extension && form.extension.length > 10) {
      e.extension = 'Extension must not exceed 10 characters.';
    }
    if (form.role === 'DOCTOR' && !form.licenseNumber?.trim()) {
      e.licenseNumber = 'License number is required for doctors.';
    } else if (form.licenseNumber && form.licenseNumber.length > 30) {
      e.licenseNumber = 'License number must not exceed 30 characters.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await apiRequest<CreateAccountResult>('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || undefined,
          extension: form.extension.trim() || undefined,
          role: form.role,
          ...(form.role === 'DOCTOR' && {
            licenseNumber: form.licenseNumber.trim() || undefined,
          }),
        }),
      });
      toast.success('Account created successfully');
      onCreated(result);
      onClose();
      setForm({
        email: '',
        firstName: '',
        lastName: '',
        middleName: '',
        extension: '',
        role: 'DOCTOR',
        licenseNumber: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      setErrors({ submit: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[500] flex items-center justify-center animate-in fade-in duration-150"
    >
      <div className="bg-surface border border-border rounded-[10px] w-[500px] max-h-[80vh] overflow-y-auto shadow-modal">
        {/* Modal header */}
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-border">
          <h2 className="text-[15px] font-bold flex-1 text-text-primary">Create User Account</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-btn bg-transparent border-transparent hover:bg-surface-2 hover:border-border transition-all duration-150 inline-flex items-center justify-center text-text-muted cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-[18px] py-[18px]">
          {errors.submit && (
            <div className="bg-red-bg border border-red-border rounded-btn px-3 py-2 mb-3.5 text-[12px] text-red font-medium">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <input
                className={cn(
                  inputClassName,
                  errors.firstName
                    ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                    : 'border-border focus:border-accent focus:shadow-accent-focus'
                )}
                value={form.firstName}
                onChange={set('firstName')}
                maxLength={30}
              />
              {errors.firstName && <p className="text-[12px] text-red mt-1">{errors.firstName}</p>}
            </Field>
            <Field label="Last Name" required>
              <input
                className={cn(
                  inputClassName,
                  errors.lastName
                    ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                    : 'border-border focus:border-accent focus:shadow-accent-focus'
                )}
                value={form.lastName}
                onChange={set('lastName')}
                maxLength={30}
              />
              {errors.lastName && <p className="text-[12px] text-red mt-1">{errors.lastName}</p>}
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label="Middle Name">
              <input
                className={cn(
                  inputClassName,
                  errors.middleName
                    ? 'border-red-border focus:border-red-border'
                    : 'border-border focus:border-accent focus:shadow-accent-focus'
                )}
                value={form.middleName}
                onChange={set('middleName')}
                maxLength={30}
                placeholder="Optional"
              />
              {errors.middleName && <p className="text-[12px] text-red mt-1">{errors.middleName}</p>}
            </Field>
            <Field label="Ext.">
              <input
                className={cn(inputClassName, 'border-border focus:border-accent focus:shadow-accent-focus')}
                value={form.extension}
                onChange={set('extension')}
                maxLength={10}
                placeholder="Jr."
              />
            </Field>
          </div>

          <Field label="Email Address" required>
            <input
              className={cn(
                inputClassName,
                errors.email
                  ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                  : 'border-border focus:border-accent focus:shadow-accent-focus'
              )}
              type="email"
              value={form.email}
              onChange={set('email')}
            />
            {errors.email && <p className="text-[12px] text-red mt-1">{errors.email}</p>}
          </Field>

          <Field label="Role" required>
            <select
              value={form.role}
              onChange={set('role')}
              className={cn(
                inputClassName,
                'cursor-pointer focus:border-accent focus:shadow-accent-focus border-border'
              )}
            >
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>

          {form.role === 'DOCTOR' && (
            <div className="mb-3.5">
              <Field label="License No." required>
                <input
                  className={cn(
                    inputClassName,
                    errors.licenseNumber
                      ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus:border-accent focus:shadow-accent-focus'
                  )}
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  maxLength={30}
                  placeholder="e.g. DOC-12345"
                />
                {errors.licenseNumber && (
                  <p className="text-[12px] text-red mt-1">{errors.licenseNumber}</p>
                )}
              </Field>
            </div>
          )}

          <p className="text-[11px] text-text-muted mt-2">
            A 16-character temporary password will be generated. Share it securely — it is shown only once.
          </p>
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-2 px-[18px] py-3 border-t border-border">
          <SecBtn onClick={onClose}>Cancel</SecBtn>
          <PrimaryBtn onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function EditAccountDialog({
  account,
  onClose,
  onUpdated,
}: {
  account: Account;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState(() => ({
    firstName: account.firstName,
    lastName: account.lastName,
    middleName: account.middleName || '',
    extension: account.extension || '',
    role: account.role,
    licenseNumber: account.licenseNumber || '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName || form.firstName.trim().length < 2) {
      e.firstName = 'First name must be at least 2 characters.';
    } else if (form.firstName.length > 30) {
      e.firstName = 'First name must not exceed 30 characters.';
    }
    if (!form.lastName || form.lastName.trim().length < 2) {
      e.lastName = 'Last name must be at least 2 characters.';
    } else if (form.lastName.length > 30) {
      e.lastName = 'Last name must not exceed 30 characters.';
    }
    if (form.middleName && form.middleName.length > 30) {
      e.middleName = 'Middle name must not exceed 30 characters.';
    }
    if (form.role === 'DOCTOR' && !form.licenseNumber?.trim()) {
      e.licenseNumber = 'License number is required for doctors.';
    } else if (form.licenseNumber && form.licenseNumber.length > 30) {
      e.licenseNumber = 'License number must not exceed 30 characters.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiRequest(`/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || null,
          extension: form.extension.trim() || null,
          role: form.role,
          ...(form.role === 'DOCTOR' && {
            licenseNumber: form.licenseNumber.trim() || null,
          }),
        }),
      });
      toast.success('Account updated successfully');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update account';
      setErrors({ submit: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[500] flex items-center justify-center animate-in fade-in duration-150"
    >
      <div className="bg-surface border border-border rounded-[10px] w-[500px] max-h-[80vh] overflow-y-auto shadow-modal">
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-border">
          <h2 className="text-[15px] font-bold flex-1 text-text-primary">Edit User Account</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-btn bg-transparent border-transparent hover:bg-surface-2 hover:border-border transition-all duration-150 inline-flex items-center justify-center text-text-muted cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-[18px] py-[18px]">
          {errors.submit && (
            <div className="bg-red-bg border border-red-border rounded-btn px-3 py-2 mb-3.5 text-[12px] text-red font-medium">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <input
                className={cn(
                  inputClassName,
                  errors.firstName
                    ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                    : 'border-border focus:border-accent focus:shadow-accent-focus'
                )}
                value={form.firstName}
                onChange={set('firstName')}
                maxLength={30}
              />
              {errors.firstName && <p className="text-[12px] text-red mt-1">{errors.firstName}</p>}
            </Field>
            <Field label="Last Name" required>
              <input
                className={cn(
                  inputClassName,
                  errors.lastName
                    ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                    : 'border-border focus:border-accent focus:shadow-accent-focus'
                )}
                value={form.lastName}
                onChange={set('lastName')}
                maxLength={30}
              />
              {errors.lastName && <p className="text-[12px] text-red mt-1">{errors.lastName}</p>}
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label="Middle Name">
              <input
                className={cn(inputClassName, 'border-border focus:border-accent focus:shadow-accent-focus')}
                value={form.middleName}
                onChange={set('middleName')}
                maxLength={30}
                placeholder="Optional"
              />
            </Field>
            <Field label="Ext.">
              <input
                className={cn(inputClassName, 'border-border focus:border-accent focus:shadow-accent-focus')}
                value={form.extension}
                onChange={set('extension')}
                maxLength={10}
                placeholder="Jr."
              />
            </Field>
          </div>

          <Field label="Role" required>
            <select
              value={form.role}
              onChange={set('role')}
              className={cn(
                inputClassName,
                'cursor-pointer focus:border-accent focus:shadow-accent-focus border-border'
              )}
            >
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>

          {form.role === 'DOCTOR' && (
            <div className="mb-3.5">
              <Field label="License No." required>
                <input
                  className={cn(
                    inputClassName,
                    errors.licenseNumber
                      ? 'border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus:border-accent focus:shadow-accent-focus'
                  )}
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  maxLength={30}
                />
                {errors.licenseNumber && (
                  <p className="text-[12px] text-red mt-1">{errors.licenseNumber}</p>
                )}
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-[18px] py-3 border-t border-border">
          <SecBtn onClick={onClose}>Cancel</SecBtn>
          <PrimaryBtn onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [tempResult, setTempResult] = useState<CreateAccountResult | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AccountsResponse>({
    queryKey: ['accounts', page],
    queryFn: () => apiRequest<AccountsResponse>(`/accounts?page=${page}&limit=20`),
    staleTime: 10000,
  });

  const accounts = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const handleDelete = async () => {
    if (!confirmDeleteAccount) return;
    setDeletingId(confirmDeleteAccount.id);
    try {
      await apiRequest(`/accounts/${confirmDeleteAccount.id}`, { method: 'DELETE' });
      toast.success('Account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete account';
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteAccount(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to reset this user's password? Their current password and active session will be invalidated immediately."
      )
    )
      return;
    setResettingId(id);
    try {
      const res = await apiRequest<CreateAccountResult>(`/accounts/${id}/reset-password`, {
        method: 'POST',
      });
      toast.success('Password reset successfully');
      handleCreated(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to reset password';
      toast.error(msg);
    } finally {
      setResettingId(null);
    }
  };

  const handleCreated = (result: CreateAccountResult) => {
    setTempResult(result);
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    setTimeout(() => setTempResult(null), 60000);
  };

  return (
    <>
      {/* Page header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-text-primary mb-1">User Accounts</h1>
          <p className="text-[12px] text-text-muted">
            {meta.total} account{meta.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <PrimaryBtn onClick={() => setModalOpen(true)}>+ New Account</PrimaryBtn>
      </div>

      {/* Accounts table card */}
      <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-2 border-b border-border">
          <div className="w-[26px] h-[26px] rounded-icon bg-surface-3 flex items-center justify-center text-[12px] flex-shrink-0">
            👤
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-text-secondary flex-1">
            All Staff Accounts
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.6px] text-text-secondary border-b border-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-b-0 animate-pulse">
                  <td className="px-2.5 py-3">
                    <Skeleton width={120} height={12} borderRadius={4} />
                  </td>
                  <td className="px-2.5 py-3">
                    <Skeleton width={160} height={12} borderRadius={4} />
                  </td>
                  <td className="px-2.5 py-3">
                    <Skeleton width={50} height={16} borderRadius={4} />
                  </td>
                  <td className="px-2.5 py-3">
                    <Skeleton width={45} height={16} borderRadius={4} />
                  </td>
                  <td className="px-2.5 py-3">
                    <Skeleton width={70} height={12} borderRadius={4} />
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="flex gap-1.5">
                      <Skeleton width={92} height={24} borderRadius={6} />
                      <Skeleton width={48} height={24} borderRadius={6} />
                    </div>
                  </td>
                </tr>
              ))
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[13px] text-text-muted">
                  No accounts found.
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-surface-3 transition-colors border-b border-border last:border-b-0"
                >
                  <td className="px-2.5 py-2 text-[12px] text-text-secondary font-medium">
                    {account.lastName}, {account.firstName}
                    {account.middleName ? ` ${account.middleName[0]}.` : ''}
                    {account.extension ? ` ${account.extension}` : ''}
                  </td>
                  <td className="px-2.5 py-2 text-[12px] text-text-secondary">{account.email}</td>
                  <td className="px-2.5 py-2">
                    <RoleBadge role={account.role} />
                  </td>
                  <td className="px-2.5 py-2">
                    <StatusBadge isActive={account.isActive} />
                  </td>
                  <td className="px-2.5 py-2 text-[11px] text-text-muted font-mono">
                    {new Date(account.createdAt).toLocaleDateString('en-PH')}
                  </td>
                  <td className="px-2.5 py-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <SecBtn onClick={() => setEditAccount(account)}>Edit</SecBtn>
                      <SecBtn onClick={() => handleResetPassword(account.id)}>
                        {resettingId === account.id ? 'Resetting…' : 'Reset Password'}
                      </SecBtn>
                      <SecBtn
                        onClick={() => setConfirmDeleteAccount(account)}
                        danger
                        disabled={
                          account.role === 'ADMIN' &&
                          accounts.filter((a) => a.role === 'ADMIN' && a.isActive).length <= 1
                        }
                      >
                        Delete
                      </SecBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <AdminPagination
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modals */}
      <CreateAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
      {editAccount && (
        <EditAccountDialog
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}
        />
      )}

      <DeleteConfirmModal
        open={confirmDeleteAccount !== null}
        onClose={() => setConfirmDeleteAccount(null)}
        onConfirm={handleDelete}
        title="Confirm Delete Account"
        message={
          confirmDeleteAccount
            ? `Are you sure you want to delete ${confirmDeleteAccount.firstName} ${confirmDeleteAccount.lastName} (${confirmDeleteAccount.role})? This action cannot be undone.`
            : 'Delete this account?'
        }
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        isDeleting={deletingId !== null}
        intent="destructive"
        loadingLabel="Deleting…"
      />

      {/* Temp password toast */}
      {tempResult && (
        <TempPasswordToast result={tempResult} onDismiss={() => setTempResult(null)} />
      )}
    </>
  );
}
