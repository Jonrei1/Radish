'use client';

import { useState, use } from 'react';
import {
  usePatientVitals,
  useCreateVitals,
  useUpdateVitals,
  useDeleteVitals,
  VitalSignRecord,
  CreateVitalsInput,
  UpdateVitalsInput,
} from '@/hooks/usePatients';
import { useAuthStore } from '@/stores/authStore';
import { VitalsHistoryTable } from '@/components/vitals/VitalsHistoryTable';
import { VitalsFormModal } from '@/components/vitals/VitalsForm';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { PrimaryBtn } from '@/components/admin/AdminShared';
import { toast } from 'sonner';

export default function VitalsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { user } = useAuthStore();

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data } = usePatientVitals(patientId, page, limit);
  const createVitals = useCreateVitals(patientId);
  const updateVitals = useUpdateVitals(patientId);
  const deleteVitals = useDeleteVitals(patientId);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalSignRecord | null>(null);
  const [confirmDeleteVital, setConfirmDeleteVital] = useState<VitalSignRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canRecord = user?.role === 'DOCTOR' || user?.role === 'ADMIN';

  const vitalsList = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const handleSave = async (values: CreateVitalsInput | (UpdateVitalsInput & { id: string })) => {
    try {
      if ('id' in values && values.id) {
        await updateVitals.mutateAsync(values as UpdateVitalsInput);
        toast.success('Vital signs updated successfully');
      } else {
        await createVitals.mutateAsync(values as CreateVitalsInput);
        toast.success('Vital signs recorded successfully');
      }
      setFormModalOpen(false);
      setEditingVital(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save vital signs';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteVital) return;
    setDeletingId(confirmDeleteVital.id);
    try {
      await deleteVitals.mutateAsync(confirmDeleteVital.id);
      toast.success('Vital signs deleted successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete vital signs';
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteVital(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1000px] w-full">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[15px] font-bold text-text-primary font-sans">
            Vital Signs Tracking
          </h2>
          <p className="text-[12px] text-text-muted">
            Track blood pressure, heart rate, respiratory rate, temperature, and SpO2.
          </p>
        </div>

        {canRecord && (
          <PrimaryBtn
            onClick={() => {
              setEditingVital(null);
              setFormModalOpen(true);
            }}
          >
            + Record Vitals
          </PrimaryBtn>
        )}
      </div>

      {/* History table */}
      <VitalsHistoryTable
        vitals={vitalsList}
        onEdit={(v) => {
          setEditingVital(v);
          setFormModalOpen(true);
        }}
        onDelete={(v) => setConfirmDeleteVital(v)}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={setPage}
        deletingId={deletingId}
      />

      {/* Form Modal */}
      <VitalsFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingVital(null);
        }}
        patientId={patientId}
        editing={editingVital}
        onSave={handleSave}
        saving={createVitals.isPending || updateVitals.isPending}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={confirmDeleteVital !== null}
        onClose={() => setConfirmDeleteVital(null)}
        onConfirm={handleDelete}
        title="Confirm Delete Vital Sign"
        message="Are you sure you want to delete this vital sign entry? It will remain visible in the history table with a strikethrough ghost treatment."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDeleting={deletingId !== null}
        intent="destructive"
        loadingLabel="Deleting…"
      />
    </div>
  );
}
