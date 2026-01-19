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
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid_off: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    defaulted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return colors[status] || colors.pending;
}

function getPaymentStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    missed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Loan: {loan.loan_number}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Information */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Loan Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Applicant</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{applicantName}</p>
                {loan.applicant?.email && (
                  <p className="text-xs text-[var(--text-secondary)]">{loan.applicant.email}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Application</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {loan.application?.application_number || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Principal Amount</label>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.principal_amount)}
                </p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Current Balance</label>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.current_balance)}
                </p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Interest Rate</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {formatPercent(loan.interest_rate)}
                </p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Term</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {loan.term_months} months ({loan.payment_frequency})
                </p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Next Payment</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {loan.next_payment_date ? formatDate(loan.next_payment_date) : '—'}
                </p>
                {loan.next_payment_amount && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatCurrency(loan.next_payment_amount)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Last Payment</label>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {loan.last_payment_date ? formatDate(loan.last_payment_date) : '—'}
                </p>
                {loan.last_payment_amount && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatCurrency(loan.last_payment_amount)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment History</h2>
            {loadingPayments ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">No payments recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">#</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Due Date</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Amount Due</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Principal</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Interest</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Paid</th>
                      <th className="text-left p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                      {canEdit('/admin/loans') && (
                        <th className="text-right p-3 text-xs font-semibold text-[var(--text-secondary)] uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                        <td className="p-3 text-sm text-[var(--text-primary)]">{payment.payment_number}</td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">{formatDate(payment.due_date)}</td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">{formatCurrency(payment.amount_due)}</td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">{formatCurrency(payment.principal_amount)}</td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">{formatCurrency(payment.interest_amount)}</td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">
                          {payment.amount_paid > 0 ? formatCurrency(payment.amount_paid) : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        {canEdit('/admin/loans') && (
                          <td className="p-3 text-right">
                            {payment.status !== 'paid' && (
                              <button
                                onClick={() => handleRecordPayment(payment)}
                                className="px-3 py-1 text-xs bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Documents</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Upload and manage documents related to this loan.
              </p>
            </div>
            
            {loan.applicant_id && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Loan Status</h3>
            <div className="mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(loan.status)}`}>
                {LOAN_STATUSES.find(s => s.value === loan.status)?.label || loan.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Disbursed:</span>
                <span className="text-[var(--text-primary)]">{loan.disbursed_at ? formatDate(loan.disbursed_at) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Maturity:</span>
                <span className="text-[var(--text-primary)]">{loan.maturity_date ? formatDate(loan.maturity_date) : '—'}</span>
              </div>
              {loan.paid_off_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Paid Off:</span>
                  <span className="text-[var(--text-primary)]">{formatDate(loan.paid_off_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Total Paid</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.total_paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Principal Paid</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.total_principal_paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Interest Paid</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.total_interest_paid)}
                </span>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Remaining Balance</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {formatCurrency(loan.current_balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(loan.notes || loan.internal_notes) && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Notes</h3>
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
        </div>
      </div>

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
