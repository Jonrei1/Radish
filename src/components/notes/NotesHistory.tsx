'use client';

import { NoteRecord } from '@/hooks/usePatients';
import { useAuthStore } from '@/stores/authStore';
import { RoleBadge } from '@/components/admin/AdminShared';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesHistoryProps {
  notes: NoteRecord[];
  isLoading?: boolean;
  onEdit: (note: NoteRecord) => void;
  onDelete: (note: NoteRecord) => void;
  deletingId?: string | null;
  total?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
}

const PAGE_SIZE_OPTIONS = [1, 5, 10, 20, 50];

/** Builds a compact page list with ellipsis markers, e.g. [1, '…', 4, 5, 6, '…', 12] */
function getPageRange(page: number, totalPages: number): (number | '…')[] {
  const siblingCount = 1;
  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2 siblings + 2 ellipses

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const range: (number | '…')[] = [1];

  if (showLeftEllipsis) {
    range.push('…');
  } else if (leftSibling > 1) {
    range.push(2);
  }

  for (let p = Math.max(leftSibling, 2); p <= Math.min(rightSibling, totalPages - 1); p++) {
    range.push(p);
  }

  if (showRightEllipsis) {
    range.push('…');
  } else if (rightSibling < totalPages) {
    range.push(totalPages - 1);
  }

  range.push(totalPages);

  return Array.from(new Set(range.filter((v) => v !== '…' ) as number[]))
    .sort((a, b) => a - b)
    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);
}

export function NotesHistory({
  notes,
  isLoading = false,
  onEdit,
  onDelete,
  deletingId,
  total,
  page = 1,
  totalPages = 1,
  onPageChange,
  limit,
  onLimitChange,
}: NotesHistoryProps) {
  const { user } = useAuthStore();
  const isDoctorOrAdmin = user?.role === 'DOCTOR' || user?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-4">
      {/* Series Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[15px] font-bold text-text-primary font-sans flex items-center gap-2">
          <span>Clinical Notes History</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-border">
            {total ?? notes.length} total
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {onLimitChange && (
            <div className="relative flex items-center">
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                aria-label="Notes per page"
                className="h-8 pl-3 pr-7 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-secondary outline-none cursor-pointer appearance-none hover:border-border-strong hover:text-text-primary focus:border-accent transition-all duration-150"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / page
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-text-muted absolute right-2.5 pointer-events-none" />
            </div>
          )}
          <span className="text-[11px] text-text-muted">Arranged newest to oldest</span>
        </div>
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
                  <div className="flex flex-col gap-1">
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
                    <span className="font-mono text-[11px] font-bold text-text-secondary">
                      {dateStr} · {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
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

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          {/* Prev arrow */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="w-10 h-10 rounded-xl border border-border bg-surface text-text-secondary flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-surface-2 hover:border-border-strong hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers with ellipsis */}
          {getPageRange(page, totalPages).map((p, idx) =>
            p === '…' ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-10 h-10 flex items-center justify-center text-text-muted"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'w-10 h-10 rounded-xl text-[13px] font-bold cursor-pointer border flex items-center justify-center transition-all duration-150',
                  p === page
                    ? 'bg-accent text-white border-accent-hover shadow-btn-primary'
                    : 'bg-surface text-text-secondary border-border hover:bg-surface-2 hover:border-border-strong hover:text-text-primary'
                )}
              >
                {p}
              </button>
            )
          )}

          {/* Next arrow */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="w-10 h-10 rounded-xl border border-border bg-surface text-text-secondary flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-surface-2 hover:border-border-strong hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
