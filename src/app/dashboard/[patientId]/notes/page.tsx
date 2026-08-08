'use client';

import { useState, use } from 'react';
import { usePatientNotes, useCreateNote, useDeleteNote, NoteRecord } from '@/hooks/usePatients';
import { useAuthStore } from '@/stores/authStore';
import { RoleBadge } from '@/components/admin/AdminShared';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { user } = useAuthStore();

  const { data, isLoading } = usePatientNotes(patientId);
  const createNote = useCreateNote(patientId);
  const deleteNote = useDeleteNote(patientId);

  // Composer form state
  const [notesText, setNotesText] = useState('');
  const [ordersText, setOrdersText] = useState('');
  const [noteDatetime, setNoteDatetime] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });

  const [confirmDeleteNote, setConfirmDeleteNote] = useState<NoteRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isDoctor = user?.role === 'DOCTOR';
  const isAdmin = user?.role === 'ADMIN';

  const notesList = data?.data || [];

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesText.trim()) {
      toast.error('Notes section is required');
      return;
    }

    try {
      await createNote.mutateAsync({
        notes: notesText.trim(),
        orders: ordersText.trim() || undefined,
        noteDatetime: noteDatetime ? new Date(noteDatetime).toISOString() : undefined,
      });

      toast.success('Clinical note recorded successfully');
      setNotesText('');
      setOrdersText('');
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setNoteDatetime(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record note';
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
      {/* Pinned Composer Card — Visible to DOCTOR only */}
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
            {/* Datetime picker */}
            <div className="flex flex-col gap-1 max-w-[260px]">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={noteDatetime}
                onChange={(e) => setNoteDatetime(e.target.value)}
                className="h-[34px] px-2.5 bg-surface border border-border rounded-btn text-[12px] font-mono text-text-primary outline-none focus:border-accent focus:shadow-accent-focus transition-all"
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

      {/* Series Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-text-primary font-sans flex items-center gap-2">
          <span>Clinical Notes History</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-border">
            {notesList.length} total
          </span>
        </h2>
        <span className="text-[11px] text-text-muted">Arranged newest to oldest</span>
      </div>

      {/* Notes Series List (Newest → Oldest) */}
      <div className="flex flex-col gap-3.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3 shadow-card animate-pulse"
            >
              <div className="flex justify-between items-center">
                <Skeleton width={140} height={14} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} />
              </div>
              <Skeleton width="100%" height={48} borderRadius={6} />
            </div>
          ))
        ) : notesList.length === 0 ? (
          <div className="bg-surface border border-border rounded-card p-8 text-center text-[13px] text-text-muted italic shadow-card">
            No clinical notes recorded yet for this patient.
          </div>
        ) : (
          notesList.map((note) => {
            const dt = new Date(note.noteDatetime);
            const dateStr = dt.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = dt.toLocaleTimeString('en-PH', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const isAuthor = user && note.authorId === user.id;
            const canDelete = !note.isDeleted && (isAuthor || isAdmin);
            const isGhost = note.isDeleted;
            const strikeClass = isGhost
              ? 'opacity-55 grayscale blur-[0.5px] line-through decoration-text-muted/65 select-none hover:opacity-75 hover:blur-none transition-all'
              : '';

            return (
              <div
                key={note.id}
                className={cn(
                  'bg-surface border rounded-card p-4 shadow-card flex flex-col gap-3.5 transition-all duration-150',
                  isGhost ? 'border-border bg-surface-2/40' : 'border-border hover:border-border-strong',
                  strikeClass
                )}
              >
                {/* Note Card Header: Author, Role, Date/Time, Delete */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-text-primary">
                      Dr. {note.authorSnapshot?.firstName} {note.authorSnapshot?.lastName}
                    </span>
                    <RoleBadge role={note.authorSnapshot?.role || 'DOCTOR'} />
                    {note.authorSnapshot?.licenseNumber && (
                      <span className="text-[10px] font-mono text-text-muted bg-surface-2 border border-border px-1.5 py-[1px] rounded">
                        Lic: {note.authorSnapshot.licenseNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-text-muted">
                      {dateStr} · {timeStr}
                    </span>
                    {isGhost ? (
                      <span className="text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-red-bg text-red border border-red-border">
                        Deleted
                      </span>
                    ) : (
                      canDelete && (
                        <button
                          onClick={() => setConfirmDeleteNote(note)}
                          title="Delete note"
                          aria-label="Delete note"
                          className="h-[24px] px-2 rounded text-[10px] font-semibold bg-red-bg text-red border border-red-border hover:bg-red-bg/80 transition-all duration-150 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-text-muted">
                    Notes
                  </span>
                  <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
                    {note.notes}
                  </p>
                </div>

                {/* Orders Section (Omitted if empty) */}
                {note.orders && note.orders.trim() !== '' && (
                  <div className="flex flex-col gap-1 bg-surface-2 border border-border rounded-btn p-3 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-accent">
                      Orders
                    </span>
                    <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                      {note.orders}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
