'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePatients, PatientRecord } from '@/hooks/usePatients';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { StatusBadge, SecBtn, AdminPagination } from '@/components/admin/AdminShared';
import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function PatientAccountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate';
    patient: PatientRecord;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = usePatients(debouncedSearch, page, 20, true);
  const patients = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, patient } = confirmAction;

    if (type === 'deactivate') {
      setDeactivatingId(patient.id);
      try {
        await apiRequest(`/patients/${patient.id}/deactivate`, { method: 'PATCH' });
        toast.success('Patient deactivated successfully');
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to deactivate patient';
        toast.error(msg);
      } finally {
        setDeactivatingId(null);
        setConfirmAction(null);
      }
    } else {
      setReactivatingId(patient.id);
      try {
        await apiRequest(`/patients/${patient.id}/reactivate`, { method: 'PATCH' });
        toast.success('Patient reactivated successfully');
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to reactivate patient';
        toast.error(msg);
      } finally {
        setReactivatingId(null);
        setConfirmAction(null);
      }
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-text-primary mb-1">Patient Accounts</h1>
          <p className="text-[12px] text-text-muted">
            {meta.total} patient{meta.total !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="flex items-center gap-2 h-[34px] bg-surface border border-border rounded-btn px-3 w-[260px] focus-within:border-accent focus-within:shadow-accent-focus transition-all">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient code or name…"
            className="flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted font-sans"
          />
          {isLoading && search.length > 0 && <Spinner size="xs" className="text-text-muted shrink-0" />}
        </div>
      </div>

      {/* Patients table card */}
      <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-2 border-b border-border">
          <div className="w-[26px] h-[26px] rounded-icon bg-surface-3 flex items-center justify-center text-[12px] flex-shrink-0">
            👥
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-text-secondary flex-1">
            All Patients
          </span>
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {['Code', 'Name', 'Sex', 'Status', 'Registered Date', 'Actions'].map((h) => (
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
                    <Skeleton width={80} height={12} borderRadius={4} />
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
                    </div>
                  </td>
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[13px] text-text-muted">
                  No patients found.
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-surface-3 transition-colors border-b border-border last:border-b-0"
                >
                  <td className="px-2.5 py-2 text-[12px] text-text-primary font-mono font-medium">
                    #{patient.patientCode}
                  </td>
                  <td className="px-2.5 py-2 text-[12px] text-text-secondary font-medium">
                    {patient.lastName}, {patient.firstName}
                    {patient.middleName ? ` ${patient.middleName[0]}.` : ''}
                    {patient.extension ? ` ${patient.extension}` : ''}
                  </td>
                  <td className="px-2.5 py-2 text-[12px] text-text-secondary capitalize">
                    {patient.sex.toLowerCase()}
                  </td>
                  <td className="px-2.5 py-2">
                    <StatusBadge isActive={patient.isActive ?? true} />
                  </td>
                  <td className="px-2.5 py-2 text-[11px] text-text-muted font-mono">
                    {new Date(patient.createdAt).toLocaleDateString('en-PH')}
                  </td>
                  <td className="px-2.5 py-2">
                    <div className="flex gap-1.5">
                      {patient.isActive ? (
                        <SecBtn
                          onClick={() => setConfirmAction({ type: 'deactivate', patient })}
                          danger
                        >
                          {deactivatingId === patient.id ? 'Deactivating…' : 'Deactivate'}
                        </SecBtn>
                      ) : (
                        <SecBtn onClick={() => setConfirmAction({ type: 'reactivate', patient })}>
                          {reactivatingId === patient.id ? 'Reactivating…' : 'Reactivate'}
                        </SecBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <AdminPagination
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      </div>

      <DeleteConfirmModal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmAction}
        title={confirmAction?.type === 'deactivate' ? 'Confirm Deactivate' : 'Confirm Reactivate'}
        message={
          confirmAction?.type === 'deactivate'
            ? 'Are you sure you want to deactivate this patient record? They will no longer be visible in standard searches.'
            : 'Are you sure you want to reactivate this patient record? They will be visible again in standard searches.'
        }
        confirmLabel={confirmAction?.type === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        cancelLabel="Cancel"
        isDeleting={!!deactivatingId || !!reactivatingId}
        intent={confirmAction?.type === 'deactivate' ? 'destructive' : 'primary'}
        loadingLabel={confirmAction?.type === 'deactivate' ? 'Deactivating...' : 'Reactivating...'}
      />
    </>
  );
}
