'use client';

import { useState } from 'react';
import { updateLoan, updatePayment, type Loan, type LoanPayment } from '@/lib/api/loans';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface RecordPaymentFormProps {
  loan: Loan;
  payment: LoanPayment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordPaymentForm({ loan, payment, onSuccess, onCancel }: RecordPaymentFormProps) {
  const { canEdit } = usePermissions('/admin/loans');
  const [amountPaid, setAmountPaid] = useState(payment.amount_due.toString());
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit('/admin/loans')) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-400 text-sm">
          You do not have permission to record payments.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (amount > payment.amount_due + payment.late_fee + payment.penalty_amount) {
      setError(`Payment amount cannot exceed total due (${formatCurrency(payment.amount_due + payment.late_fee + payment.penalty_amount)})`);
      return;
    }

    try {
      setLoading(true);

      // Record the payment
      await updatePayment(payment.id, {
        status: 'paid',
        amount_paid: amount,
        paid_date: paidDate,
        payment_method: paymentMethod || undefined,
        payment_reference: paymentReference || undefined,
        payment_notes: notes || undefined,
      });

      // Update loan totals
      const newTotalPaid = loan.total_paid + amount;
      const newCurrentBalance = Math.max(0, loan.current_balance - amount);
      
      // Calculate principal vs interest (simplified - assumes proportional payment)
      const principalRatio = payment.principal_amount / payment.amount_due;
      const interestRatio = payment.interest_amount / payment.amount_due;
      const principalPaid = amount * principalRatio;
      const interestPaid = amount * interestRatio;

      const newTotalPrincipalPaid = loan.total_principal_paid + principalPaid;
      const newTotalInterestPaid = loan.total_interest_paid + interestPaid;

      // Update loan
      await updateLoan(loan.id, {
        total_paid: newTotalPaid,
        current_balance: newCurrentBalance,
        total_principal_paid: newTotalPrincipalPaid,
        total_interest_paid: newTotalInterestPaid,
        last_payment_date: paidDate,
        last_payment_amount: amount,
      });

      onSuccess();
    } catch (err) {
      console.error('[RecordPaymentForm] Error recording payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  const totalDue = payment.amount_due + payment.late_fee + payment.penalty_amount;
  const remainingBalance = totalDue - parseFloat(amountPaid || '0');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Payment Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">Payment #</span>
            <p className="font-medium text-[var(--text-primary)]">{payment.payment_number}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Due Date</span>
            <p className="font-medium text-[var(--text-primary)]">
              {new Date(payment.due_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Amount Due</span>
            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payment.amount_due)}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Principal</span>
            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payment.principal_amount)}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Interest</span>
            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payment.interest_amount)}</p>
          </div>
          {payment.late_fee > 0 && (
            <div>
              <span className="text-[var(--text-secondary)]">Late Fee</span>
              <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payment.late_fee)}</p>
            </div>
          )}
          {payment.penalty_amount > 0 && (
            <div>
              <span className="text-[var(--text-secondary)]">Penalty</span>
              <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payment.penalty_amount)}</p>
            </div>
          )}
          <div className="col-span-2 pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Total Due</span>
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(totalDue)}</p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="amountPaid" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Amount Paid *
        </label>
        <input
          id="amountPaid"
          type="number"
          step="0.01"
          min="0"
          max={totalDue}
          required
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="0.00"
        />
        {remainingBalance > 0 && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Remaining balance: {formatCurrency(remainingBalance)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="paidDate" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Payment Date *
        </label>
        <input
          id="paidDate"
          type="date"
          required
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Payment Method
        </label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
        >
          <option value="">Select method...</option>
          <option value="check">Check</option>
          <option value="wire_transfer">Wire Transfer</option>
          <option value="ach">ACH</option>
          <option value="credit_card">Credit Card</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="paymentReference" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Reference Number
        </label>
        <input
          id="paymentReference"
          type="text"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="Check number, transaction ID, etc."
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="Additional notes about this payment..."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}
