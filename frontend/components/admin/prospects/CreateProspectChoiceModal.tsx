'use client';

import { useEffect } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';

interface CreateProspectChoiceModalProps {
  isOpen: boolean;
  onAddNow: () => void;
  onSendInvite: () => void;
  onCancel: () => void;
}

export function CreateProspectChoiceModal({
  isOpen,
  onAddNow,
  onSendInvite,
  onCancel,
}: CreateProspectChoiceModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--background)] rounded-lg shadow-xl w-full max-w-md border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Create Prospect
          </h2>
          <button
            onClick={onCancel}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            How would you like to add this prospect?
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onAddNow}
              className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--core-blue)] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--core-blue)]/10 flex items-center justify-center group-hover:bg-[var(--core-blue)]/20 transition-colors">
                <UserPlus className="w-5 h-5 text-[var(--core-blue)]" />
              </div>
              <div>
                <div className="font-medium text-[var(--text-primary)]">Add one now</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Create and set a temporary password. Share credentials with the prospect.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onSendInvite}
              className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--core-blue)] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--core-blue)]/10 flex items-center justify-center group-hover:bg-[var(--core-blue)]/20 transition-colors">
                <Mail className="w-5 h-5 text-[var(--core-blue)]" />
              </div>
              <div>
                <div className="font-medium text-[var(--text-primary)]">Send invite</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Send an email invite. They set their own password when they accept.
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
