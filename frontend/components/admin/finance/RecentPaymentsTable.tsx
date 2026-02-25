'use client';

import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { formatCurrency, type RecentPayment } from '@/lib/api/finance';

interface RecentPaymentsTableProps {
  payments: RecentPayment[];
}

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (payments.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Payments
        </h3>
        <div className="text-center py-8 text-[var(--text-secondary)]">
          No recent payments
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Recent Payments
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">
                Date Paid
              </th>
              <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">
                Loan Number
              </th>
              <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">
                Borrower
              </th>
              <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">
                Amount Paid
              </th>
              <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">
                Payment Method
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                onClick={() => router.push(`/admin/loans/${payment.loan_id}`)}
                className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
              >
                <td className="p-4 text-sm text-[var(--text-primary)]">
                  {formatDate(payment.paid_date)}
                </td>
                <td className="p-4 text-sm text-[var(--text-primary)] font-medium">
                  {payment.loan_number}
                </td>
                <td className="p-4 text-sm text-[var(--text-primary)]">
                  {payment.borrower_name}
                </td>
                <td className="p-4 text-sm text-[var(--text-primary)] font-medium">
                  {formatCurrency(payment.amount_paid)}
                </td>
                <td className="p-4 text-sm text-[var(--text-secondary)]">
                  {payment.payment_method || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
