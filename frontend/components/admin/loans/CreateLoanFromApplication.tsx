'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLoan, getLoansByApplicationId, type CreateLoanInput, type Loan, type PaymentFrequency } from '@/lib/api/loans';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { type Application, fundApplication } from '@/lib/api/applications';
import { type ApplicationPlan } from '@/lib/api/application-plans';
import { Select } from '@/components/ui/select';

interface CreateLoanFromApplicationProps {
  application: Application;
  applicationPlan: ApplicationPlan | null;
  onSuccess: (loan: Loan) => void;
  onCancel?: () => void;
}

const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export function CreateLoanFromApplication({ 
  application, 
  applicationPlan,
  onSuccess,
  onCancel 
}: CreateLoanFromApplicationProps) {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/loans');
  const [existingLoans, setExistingLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('0.05'); // Default 5%
  const [termMonths, setTermMonths] = useState('60'); // Default 5 years
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [markAsFunded, setMarkAsFunded] = useState(true); // Auto-mark application as funded when loan is created

  useEffect(() => {
    async function checkExistingLoans() {
      try {
        const loans = await getLoansByApplicationId(application.id);
        setExistingLoans(loans);
        
        // Pre-fill form with plan data if available
        if (applicationPlan?.custom_loan_amount) {
          setPrincipalAmount(applicationPlan.custom_loan_amount.toString());
        } else if (application.requested_amount) {
          setPrincipalAmount(application.requested_amount.toString());
        }
        
        if (applicationPlan?.custom_terms?.interest_rate) {
          setInterestRate(applicationPlan.custom_terms.interest_rate.toString());
        }
        
        if (applicationPlan?.custom_terms?.duration) {
          setTermMonths(applicationPlan.custom_terms.duration.toString());
        }
        
        if (applicationPlan?.custom_terms?.payment_schedule) {
          const freq = applicationPlan.custom_terms.payment_schedule as PaymentFrequency;
          if (freq && ['monthly', 'quarterly', 'annually'].includes(freq)) {
            setPaymentFrequency(freq);
          }
        }
      } catch (err) {
        console.error('[CreateLoanFromApplication] Error checking loans:', err);
        setError(err instanceof Error ? err.message : 'Failed to check existing loans');
      } finally {
        setLoading(false);
      }
    }

    checkExistingLoans();
  }, [application.id, applicationPlan]);

  if (!canEdit('/admin/loans')) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-400 text-sm">
          You do not have permission to create loans.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-[var(--text-secondary)]">
        Loading...
      </div>
    );
  }

  if (existingLoans.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          This application already has {existingLoans.length} loan{existingLoans.length !== 1 ? 's' : ''} associated with it.
        </p>
        <div className="space-y-2">
          {existingLoans.map((loan) => (
            <div
              key={loan.id}
              className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-b-0 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => router.push(`/admin/loans/${loan.id}`)}
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{loan.loan_number}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(loan.principal_amount)} • {loan.status}
                </p>
              </div>
              <span className="text-xs text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:underline transition-colors">
                View →
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }
    setError(null);

    const principal = parseFloat(principalAmount);
    const interest = parseFloat(interestRate);
    const term = parseInt(termMonths);

    if (isNaN(principal) || principal <= 0) {
      setError('Please enter a valid principal amount');
      return;
    }

    if (isNaN(interest) || interest < 0 || interest > 1) {
      setError('Interest rate must be between 0 and 1 (e.g., 0.05 for 5%)');
      return;
    }

    if (isNaN(term) || term <= 0) {
      setError('Please enter a valid loan term in months');
      return;
    }

    try {
      setCreating(true);

      const loanInput: CreateLoanInput = {
        application_id: application.id,
        applicant_id: application.applicant_id,
        plan_code: applicationPlan?.plan_code || null,
        principal_amount: principal,
        interest_rate: interest,
        term_months: term,
        payment_frequency: paymentFrequency,
        assigned_departments: application.assigned_departments || [],
        assigned_staff: application.assigned_staff || [],
        primary_staff_id: application.primary_staff_id || null,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        loan_terms: applicationPlan?.custom_terms || {},
      };

      const newLoan = await createLoan(loanInput);
      
      // Optionally mark application as funded when loan is created
      if (markAsFunded && application.status === 'approved') {
        try {
          await fundApplication(application.id);
        } catch (err) {
          console.error('[CreateLoanFromApplication] Error marking application as funded:', err);
          // Don't fail the loan creation if funding update fails
        }
      }
      
      onSuccess(newLoan);
    } catch (err) {
      console.error('[CreateLoanFromApplication] Error creating loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to create loan');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {applicationPlan && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            <strong>Plan:</strong> {applicationPlan.plan_code} • 
            {applicationPlan.custom_loan_amount && (
              <span> Suggested amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(applicationPlan.custom_loan_amount)}</span>
            )}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="principalAmount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Principal Amount *
            </label>
            <input
              id="principalAmount"
              type="number"
              step="0.01"
              min="0"
              required
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="interestRate" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Interest Rate *
            </label>
            <input
              id="interestRate"
              type="number"
              step="0.0001"
              min="0"
              max="1"
              required
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="0.05 (5%)"
            />
            <p className="text-xs text-[var(--text-secondary)]">
              Enter as decimal (e.g., 0.05 for 5%)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="termMonths" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Term (Months) *
            </label>
            <input
              id="termMonths"
              type="number"
              min="1"
              required
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="paymentFrequency" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Payment Frequency *
            </label>
            <Select
              id="paymentFrequency"
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
              options={PAYMENT_FREQUENCIES}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Notes (Visible to Applicant)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
            placeholder="Loan notes visible to the applicant..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="internalNotes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Internal Notes (Staff Only)
          </label>
          <textarea
            id="internalNotes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
            placeholder="Internal notes for staff only..."
          />
        </div>

        {application.status === 'approved' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <input
              type="checkbox"
              id="markAsFunded"
              checked={markAsFunded}
              onChange={(e) => setMarkAsFunded(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="markAsFunded" className="text-sm text-blue-800 dark:text-blue-400 cursor-pointer">
              Mark application as funded when loan is created
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                Creating...
              </span>
            ) : (
              'Create Loan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
