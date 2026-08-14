'use client';

import { useState, useEffect, use } from 'react';
import {
  usePatientNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  NoteRecord,
  UpdateNoteInput,
} from '@/hooks/usePatients';
import { useAuthStore } from '@/stores/authStore';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { NotesHistory, EditNoteModal } from '@/components/notes';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

// Formats a Date into the value shape a `datetime-local` input expects (local time, minute precision).
function formatLocalDatetime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function NotesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { user } = useAuthStore();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(1);

  const { data, isLoading } = usePatientNotes(patientId, page, limit);
  const createNote = useCreateNote(patientId);
  const updateNote = useUpdateNote(patientId);
  const deleteNote = useDeleteNote(patientId);

  // Composer form state
  const [notesText, setNotesText] = useState('');
  const [ordersText, setOrdersText] = useState('');
  const [noteDatetime, setNoteDatetime] = useState(() => formatLocalDatetime(new Date()));

  // Keep the displayed (read-only) datetime ticking in real time so it never goes
  // stale while the doctor stays on the page, and always matches what gets submitted.
  useEffect(() => {
    const interval = setInterval(() => {
      setNoteDatetime(formatLocalDatetime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<NoteRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isDoctor = user?.role === 'DOCTOR';

  const notesList = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit, totalPages: 1 };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesText.trim()) {
      toast.error('Notes section is required');
      return;
    }

    try {
      // Submit the exact timestamp shown in the (read-only) Date & Time field, rather than
      // re-reading the clock, so what the doctor sees always matches what gets recorded.
      await createNote.mutateAsync({
        notes: notesText.trim(),
        orders: ordersText.trim() || undefined,
        noteDatetime: new Date(noteDatetime).toISOString(),
      });

      toast.success('Clinical note recorded successfully');
      setPage(1);
      setNotesText('');
      setOrdersText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record note';
      toast.error(msg);
    }
  };

  const handleUpdateNote = async (values: UpdateNoteInput) => {
    try {
      await updateNote.mutateAsync(values);
      toast.success('Clinical note updated successfully');
      setEditingNote(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update note';
      toast.error(msg);
    }
  };

  const handleDeleteNote = async () => {
    if (!confirmDeleteNote) return;
    setDeletingId(confirmDeleteNote.id);
    try {
      await deleteNote.mutateAsync(confirmDeleteNote.id);
      toast.success('Note deleted successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete note';
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteNote(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[900px] w-full">
      {/* Clinical Notes History (with pagination) */}
      <NotesHistory
        notes={notesList}
        isLoading={isLoading}
        onEdit={(note) => setEditingNote(note)}
        onDelete={(note) => setConfirmDeleteNote(note)}
        deletingId={deletingId}
        total={meta.total}
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={handleLimitChange}
      />

      {/* New Clinical Note Composer — Visible to DOCTOR only, placed after the paginated history and excluded from pagination */}
      {isDoctor && (
        <div className="bg-surface border border-border border-l-[3px] border-l-accent rounded-card shadow-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-surface-2 border-b border-border">
            <div className="w-[26px] h-[26px] rounded-[6px] bg-surface-3 flex items-center justify-center text-[12px] flex-shrink-0">
              📝
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-text-secondary flex-1">
              New Clinical Note
            </span>
          </div>

          <form onSubmit={handleCreateNote} className="p-4 flex flex-col gap-4">
            {/* Datetime (Uneditable / Read-only) */}
            <div className="flex flex-col gap-1 max-w-[260px]">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={noteDatetime}
                readOnly
                disabled
                className="h-[34px] px-2.5 bg-surface-2 border border-border rounded-btn text-[12px] font-mono text-text-muted outline-none cursor-not-allowed select-none transition-all"
              />
            </div>

            {/* Notes Section (Required) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
                Notes <span className="text-red font-bold text-[11px]">*</span>
              </label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={4}
                required
                placeholder="Clinical observations, history, subjective & objective assessment..."
                className="w-full p-3 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:shadow-accent-focus transition-all resize-y leading-relaxed font-sans"
              />
            </div>

            {/* Orders Section (Optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
                Orders <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={ordersText}
                onChange={(e) => setOrdersText(e.target.value)}
                rows={2}
                placeholder="Physician orders, prescriptions, diagnostic requests, instructions..."
                className="w-full p-3 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:shadow-accent-focus transition-all resize-y leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={createNote.isPending || !notesText.trim()}
                className="h-[32px] px-4 rounded-btn text-[11px] font-semibold bg-accent text-white border border-accent-hover shadow-btn-primary hover:bg-accent-hover transition-all duration-150 inline-flex items-center gap-1.5 cursor-pointer disabled:bg-text-muted disabled:border-border-strong disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                {createNote.isPending ? 'Recording…' : 'Record Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Note Modal */}
      <EditNoteModal
        open={editingNote !== null}
        onClose={() => setEditingNote(null)}
        note={editingNote}
        onSave={handleUpdateNote}
        isSaving={updateNote.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={confirmDeleteNote !== null}
        onClose={() => setConfirmDeleteNote(null)}
        onConfirm={handleDeleteNote}
        title="Confirm Delete Note"
        message="Are you sure you want to delete this clinical note? The note will remain visible in the series with a strikethrough ghost treatment."
        confirmLabel="Delete Note"
        cancelLabel="Cancel"
        isDeleting={deletingId !== null}
        intent="destructive"
        loadingLabel="Deleting…"
      />
    </div>
  );
}
