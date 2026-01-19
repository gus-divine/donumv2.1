'use client';

import { useState, useEffect } from 'react';
import { getLoanPayments, updateLoan, getLoanById, type Loan, type LoanPayment, type LoanStatus } from '@/lib/api/loans';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Select } from '@/components/ui/select';
import { RecordPaymentForm } from './RecordPaymentForm';
import DocumentList from '@/components/admin/documents/DocumentList';
import DocumentUpload from '@/components/documents/DocumentUpload';

interface LoanDetailProps {
  loan: Loan;
  onBack: () => void;
  onLoanUpdated: (loan: Loan) => void;
}

const LOAN_STATUSES: { value: LoanStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'paid_off', label: 'Paid Off' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function getStatusBadgeColor(status: LoanStatus): string {
  const colors: Record<LoanStatus, string> = {
    pending: 'text-yellow-600 dark:text-yellow-400',
    active: 'text-green-600 dark:text-green-400',
    paid_off: 'text-blue-600 dark:text-blue-400',
    defaulted: 'text-red-600 dark:text-red-400',
    cancelled: 'text-gray-600 dark:text-gray-400',
    closed: 'text-gray-600 dark:text-gray-400',
  };
  return colors[status] || colors.pending;
}

function getPaymentStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600 dark:text-yellow-400',
    scheduled: 'text-blue-600 dark:text-blue-400',
    paid: 'text-green-600 dark:text-green-400',
    overdue: 'text-red-600 dark:text-red-400',
    missed: 'text-red-600 dark:text-red-400',
    cancelled: 'text-gray-600 dark:text-gray-400',
  };
  return colors[status] || colors.pending;
}

export function LoanDetail({ loan, onBack, onLoanUpdated }: LoanDetailProps) {
  const { canEdit } = usePermissions('/admin/loans');
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoadingPayments(true);
        const paymentData = await getLoanPayments(loan.id);
        setPayments(paymentData);
      } catch (err) {
        console.error('[LoanDetail] Error loading payments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setLoadingPayments(false);
      }
    }

    loadPayments();
  }, [loan.id]);

  async function handleStatusChange(newStatus: LoanStatus) {
    if (!canEdit('/admin/loans')) {
      setError('You do not have permission to update loans');
      return;
    }

    try {
      setUpdatingStatus(true);
      setError(null);
      const updatedLoan = await updateLoan(loan.id, { status: newStatus });
      onLoanUpdated(updatedLoan);
    } catch (err) {
      console.error('[LoanDetail] Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update loan status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleRecordPayment(payment: LoanPayment) {
    setSelectedPayment(payment);
  }

  async function handlePaymentRecorded() {
    // Reload loan data to get updated balances
    try {
      const updatedLoan = await getLoanById(loan.id);
      if (updatedLoan) {
        onLoanUpdated(updatedLoan);
      }
    } catch (err) {
      console.error('[LoanDetail] Error reloading loan:', err);
    }

    // Reload payments list
    try {
      const paymentData = await getLoanPayments(loan.id);
      setPayments(paymentData);
    } catch (err) {
      console.error('[LoanDetail] Error reloading payments:', err);
    }

    // Close the modal
    setSelectedPayment(null);
  }

  const applicantName = loan.applicant
    ? `${loan.applicant.first_name || ''} ${loan.applicant.last_name || ''}`.trim() || loan.applicant.email
    : 'Unknown';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Loan: {loan.loan_number}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {loan.plan?.name || 'No Plan'} • Created {formatDate(loan.created_at)}
          </p>
        </div>
        {canEdit('/admin/loans') && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">Status:</span>
            <Select
              value={loan.status}
              onChange={(e) => handleStatusChange(e.target.value as LoanStatus)}
              disabled={updatingStatus}
              options={LOAN_STATUSES}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Financial Summary - Prominent at top */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Principal Amount</span>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              {formatCurrency(loan.principal_amount)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Current Balance</span>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              {formatCurrency(loan.current_balance)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total Paid</span>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              {formatCurrency(loan.total_paid)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Remaining Balance</span>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              {formatCurrency(loan.current_balance)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-[var(--border)]">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Principal Paid</span>
            <p className="text-[var(--text-primary)]">
              {formatCurrency(loan.total_principal_paid)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Interest Paid</span>
            <p className="text-[var(--text-primary)]">
              {formatCurrency(loan.total_interest_paid)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Interest Rate</span>
            <p className="text-[var(--text-primary)]">
              {formatPercent(loan.interest_rate)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Term</span>
            <p className="text-[var(--text-primary)]">
              {loan.term_months} months ({loan.payment_frequency})
            </p>
          </div>
        </div>
      </div>

      {/* Loan Information */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Loan Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Applicant</span>
            <p className="text-[var(--text-primary)]">{applicantName}</p>
            {loan.applicant?.email && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{loan.applicant.email}</p>
            )}
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Application</span>
            <p className="text-[var(--text-primary)]">
              {loan.application?.application_number || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Plan</span>
            <p className="text-[var(--text-primary)]">
              {loan.plan?.name || 'No Plan'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Disbursed</span>
            <p className="text-[var(--text-primary)]">
              {loan.disbursed_at ? formatDate(loan.disbursed_at) : '—'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Maturity Date</span>
            <p className="text-[var(--text-primary)]">
              {loan.maturity_date ? formatDate(loan.maturity_date) : '—'}
            </p>
          </div>
          {loan.paid_off_at && (
            <div className="space-y-1">
              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Paid Off</span>
              <p className="text-[var(--text-primary)]">
                {formatDate(loan.paid_off_at)}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Next Payment</span>
            <p className="text-[var(--text-primary)]">
              {loan.next_payment_date ? formatDate(loan.next_payment_date) : '—'}
            </p>
            {loan.next_payment_amount && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {formatCurrency(loan.next_payment_amount)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Last Payment</span>
            <p className="text-[var(--text-primary)]">
              {loan.last_payment_date ? formatDate(loan.last_payment_date) : '—'}
            </p>
            {loan.last_payment_amount && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {formatCurrency(loan.last_payment_amount)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment History - Full Width */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        {/* Payment History */}
        <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment History</h3>
            {loadingPayments ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">No payments recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">#</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Due Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Amount Due</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Principal</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Interest</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Paid</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                      {canEdit('/admin/loans') && (
                        <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                        <td className="p-4 text-sm text-[var(--text-primary)]">{payment.payment_number}</td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">{formatDate(payment.due_date)}</td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">{formatCurrency(payment.amount_due)}</td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">{formatCurrency(payment.principal_amount)}</td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">{formatCurrency(payment.interest_amount)}</td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">
                          {payment.amount_paid > 0 ? formatCurrency(payment.amount_paid) : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center text-xs font-medium ${getPaymentStatusBadgeColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        {canEdit('/admin/loans') && (
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              {payment.status !== 'paid' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecordPayment(payment);
                                  }}
                                  className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded transition-colors"
                                >
                                  Record Payment
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Documents */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Documents</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Upload and manage documents related to this loan.
        </p>
        
        {loan.applicant_id && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Upload New Document</h4>
            <DocumentUpload
              documentType="other"
              documentName="Loan Document"
              applicantId={loan.applicant_id}
              loanId={loan.id}
              onUploadSuccess={() => {
                // Reload could be added here if needed
              }}
            />
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Uploaded Documents</h4>
          <DocumentList
            filters={{ loan_id: loan.id }}
            showActions={true}
          />
        </div>
      </div>

      {/* Notes */}
      {(loan.notes || loan.internal_notes) && (
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Notes</h3>
          {loan.notes && (
            <div className="mb-3">
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1 block">
                Public Notes
              </label>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{loan.notes}</p>
            </div>
          )}
          {loan.internal_notes && (
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1 block">
                Internal Notes
              </label>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{loan.internal_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Recording Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Record Payment #{selectedPayment.payment_number}
              </h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <RecordPaymentForm
                loan={loan}
                payment={selectedPayment}
                onSuccess={handlePaymentRecorded}
                onCancel={() => setSelectedPayment(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
