'use client';

import { useState, useEffect } from 'react';
import { NoteRecord, UpdateNoteInput } from '@/hooks/usePatients';
import { X } from 'lucide-react';

interface EditNoteModalProps {
  open: boolean;
  onClose: () => void;
  note: NoteRecord | null;
  onSave: (values: UpdateNoteInput) => void;
  isSaving?: boolean;
}

function EditNoteDialog({
  onClose,
  note,
  onSave,
  isSaving = false,
}: {
  onClose: () => void;
  note: NoteRecord;
  onSave: (values: UpdateNoteInput) => void;
  isSaving?: boolean;
}) {
  const [notesText, setNotesText] = useState(note.notes || '');
  const [ordersText, setOrdersText] = useState(note.orders || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesText.trim()) {
      setError('Notes section is required');
      return;
    }
    setError(null);
    onSave({
      id: note.id,
      notes: notesText.trim(),
      orders: ordersText.trim(),
    });
  };

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

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[500] flex items-center justify-center animate-in fade-in duration-150 p-4"
    >
      <div className="bg-surface border border-border rounded-[10px] w-[540px] max-h-[85vh] overflow-y-auto shadow-modal flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-border bg-surface-2">
          <div className="w-[26px] h-[26px] rounded-[6px] bg-surface-3 flex items-center justify-center text-[12px] flex-shrink-0">
            📝
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-text-primary">
              Edit Clinical Note
            </h2>
            <div className="text-[11px] font-mono text-text-muted mt-0.5">
              {dateStr} · {timeStr}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-6 h-6 rounded-btn bg-transparent border-transparent hover:bg-surface-3 transition-all duration-150 inline-flex items-center justify-center text-text-muted cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-[18px] flex flex-col gap-4">
          {error && (
            <div className="p-2.5 rounded bg-red-bg border border-red-border text-red text-[12px]">
              {error}
            </div>
          )}

          {/* Notes Section */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
              Notes <span className="text-red font-bold text-[11px]">*</span>
            </label>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={5}
              required
              placeholder="Clinical observations, history, subjective & objective assessment..."
              className="w-full p-3 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:shadow-accent-focus transition-all resize-y leading-relaxed font-sans"
            />
          </div>

          {/* Orders Section */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]">
              Orders <span className="text-text-muted font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={ordersText}
              onChange={(e) => setOrdersText(e.target.value)}
              rows={3}
              placeholder="Physician orders, prescriptions, diagnostic requests, instructions..."
              className="w-full p-3 bg-surface border border-border rounded-btn text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:shadow-accent-focus transition-all resize-y leading-relaxed font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-[28px] px-3 rounded-btn text-[11px] font-semibold bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !notesText.trim()}
              className="h-[28px] px-3.5 rounded-btn text-[11px] font-semibold bg-accent text-white border border-accent-hover shadow-btn-primary hover:bg-accent-hover transition-all duration-150 inline-flex items-center gap-1.5 cursor-pointer disabled:bg-text-muted disabled:border-border-strong disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditNoteModal({
  open,
  onClose,
  note,
  onSave,
  isSaving = false,
}: EditNoteModalProps) {
  if (!open || !note) return null;

  return (
    <EditNoteDialog
      key={note.id}
      onClose={onClose}
      note={note}
      onSave={onSave}
      isSaving={isSaving}
    />
  );
}
