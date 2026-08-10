'use client';

import { NoteRecord } from '@/hooks/usePatients';
import { useAuthStore } from '@/stores/authStore';
import { RoleBadge } from '@/components/admin/AdminShared';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesHistoryProps {
  notes: NoteRecord[];
  isLoading?: boolean;
  onEdit: (note: NoteRecord) => void;
  onDelete: (note: NoteRecord) => void;
  deletingId?: string | null;
}

export function NotesHistory({
  notes,
  isLoading = false,
  onEdit,
  onDelete,
  deletingId,
}: NotesHistoryProps) {
  const { user } = useAuthStore();
  const isDoctorOrAdmin = user?.role === 'DOCTOR' || user?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-4">
      {/* Series Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-text-primary font-sans flex items-center gap-2">
          <span>Clinical Notes History</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-border">
            {notes.length} total
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
        ) : notes.length === 0 ? (
          <div className="bg-surface border border-border rounded-card p-8 text-center text-[13px] text-text-muted italic shadow-card">
            No clinical notes recorded yet for this patient.
          </div>
        ) : (
          notes.map((note) => {
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
            const canModify = !note.isDeleted && (isAuthor || isDoctorOrAdmin);
            const isDeleting = deletingId === note.id;
            const isGhost = note.isDeleted || isDeleting;
            const strikeClass = isGhost
              ? 'opacity-55 grayscale blur-[0.5px] line-through decoration-text-muted/65 select-none hover:opacity-75 hover:blur-none transition-all'
              : '';

            return (
              <div
                key={note.id}
                className={cn(
                  'bg-surface border rounded-card p-4 shadow-card flex flex-col gap-3.5 transition-all duration-150',
                  isGhost
                    ? 'border-border bg-surface-2/40'
                    : 'border-border hover:border-border-strong',
                  strikeClass
                )}
              >
                {/* Note Card Header: Author, Role, Date/Time, Action Buttons */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-text-primary">
                      {note.authorSnapshot?.role === 'DOCTOR' ? 'Dr. ' : ''}
                      {note.authorSnapshot?.firstName} {note.authorSnapshot?.lastName}
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
                    {isDeleting ? (
                      <span className="text-[10px] font-semibold text-red italic">
                        Deleting…
                      </span>
                    ) : note.isDeleted ? (
                      <span className="text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-red-bg text-red border border-red-border">
                        Deleted
                      </span>
                    ) : (
                      canModify && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(note)}
                            title="Edit note"
                            aria-label="Edit note"
                            className="h-[22px] px-2 rounded text-[10px] font-semibold bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary transition-all duration-150 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(note)}
                            title="Delete note"
                            aria-label="Delete note"
                            className="h-[22px] px-2 rounded text-[10px] font-semibold bg-red-bg text-red border border-red-border hover:bg-red-bg/80 transition-all duration-150 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Delete
                          </button>
                        </div>
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
    </div>
  );
}
