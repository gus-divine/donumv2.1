'use client';

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
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 ${disabled ? 'opacity-60' : ''}`}>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        Terms & Conditions
        {disabled && (
          <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">(Prospect must accept)</span>
        )}
      </h2>
      
      <div className="space-y-3">
        <label className={`flex items-start ${disabled ? 'cursor-not-allowed' : ''}`}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => !disabled && onTermsChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 mr-2"
            required={!disabled}
          />
          <span className={disabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}>
            I accept the <a href="/terms" className="text-[var(--core-blue)] hover:underline">Terms of Service</a> <span className="text-red-500">*</span>
            {disabled && <span className="ml-2 text-xs">(Prospect must check this)</span>}
          </span>
        </label>

        <label className={`flex items-start ${disabled ? 'cursor-not-allowed' : ''}`}>
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => !disabled && onPrivacyChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 mr-2"
            required={!disabled}
          />
          <span className={disabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}>
            I accept the <a href="/privacy" className="text-[var(--core-blue)] hover:underline">Privacy Policy</a> <span className="text-red-500">*</span>
            {disabled && <span className="ml-2 text-xs">(Prospect must check this)</span>}
          </span>
        </label>
      </div>
    </div>
  );
}
