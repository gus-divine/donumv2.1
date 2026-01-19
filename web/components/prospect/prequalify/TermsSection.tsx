'use client';

import { useId } from 'react';

interface TermsSectionProps {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onPrivacyChange: (accepted: boolean) => void;
  disabled?: boolean;
}

export function TermsSection({
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
  disabled = false,
}: TermsSectionProps) {
  const termsId = useId();
  const privacyId = useId();

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-60' : ''}`}>
      <label className={`flex items-start ${disabled ? 'cursor-not-allowed' : ''}`}>
        <input
          id={termsId}
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => !disabled && onTermsChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 mr-2"
          required={!disabled}
        />
        <span className={`text-sm ${disabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
          I accept the <a href="/terms" className="text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:underline">Terms of Service</a> <span className="text-red-500">*</span>
          {disabled && <span className="ml-2 text-xs">(Prospect must check this)</span>}
        </span>
      </label>

      <label className={`flex items-start ${disabled ? 'cursor-not-allowed' : ''}`}>
        <input
          id={privacyId}
          type="checkbox"
          checked={privacyAccepted}
          onChange={(e) => !disabled && onPrivacyChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 mr-2"
          required={!disabled}
        />
        <span className={`text-sm ${disabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
          I accept the <a href="/privacy" className="text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:underline">Privacy Policy</a> <span className="text-red-500">*</span>
          {disabled && <span className="ml-2 text-xs">(Prospect must check this)</span>}
        </span>
      </label>
    </div>
  );
}
