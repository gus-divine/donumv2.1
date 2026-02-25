'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/api/applications';

interface StatusSelectProps {
  value: ApplicationStatus;
  onChange: (value: ApplicationStatus) => void;
  disabled?: boolean;
}

const getStatusColor = (status: ApplicationStatus): string => {
  switch (status) {
    case 'funded':
      return 'text-[var(--core-gold)]';
    case 'approved':
      return 'text-green-600 dark:text-green-400';
    case 'rejected':
      return 'text-red-600 dark:text-red-400';
    case 'under_review':
    case 'document_collection':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'submitted':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-[var(--text-primary)]';
  }
};

export function StatusSelect({ value, onChange, disabled = false }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedStatus = APPLICATION_STATUSES.find(s => s.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`pl-2.5 pr-2.5 py-1.5 text-xs font-medium border border-[var(--border)] rounded-full bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(value)}`}
      >
        <span>{selectedStatus?.label || value}</span>
        <ChevronDown className={`w-3 h-3 text-[var(--text-secondary)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[180px] max-h-60 overflow-auto">
          {APPLICATION_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => {
                onChange(status.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[var(--surface-hover)] transition-colors first:rounded-t-lg last:rounded-b-lg ${getStatusColor(status.value)} ${
                value === status.value ? 'bg-[var(--surface-hover)]' : ''
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
