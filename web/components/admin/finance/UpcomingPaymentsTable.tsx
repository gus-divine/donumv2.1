'use client';

import { useRouter } from 'next/navigation';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatCurrency, type UpcomingPayment } from '@/lib/api/finance';

interface UpcomingPaymentsTableProps {
  payments: UpcomingPayment[];
}

export function UpcomingPaymentsTable({ payments }: UpcomingPaymentsTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'text-red-600 dark:text-red-400';
      case 'scheduled':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Overdue';
      case 'scheduled':
        return 'Scheduled';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (payments.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Payments (Next 7 Days)
        </h3>
        <div className="text-center py-8 text-[var(--text-secondary)]">
          No upcoming payments in the next 7 days
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Upcoming Payments (Next 7 Days)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Loan Number
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Borrower
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Due Date
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Amount Due
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                onClick={() => router.push(`/admin/loans/${payment.loan_id}`)}
                className="border-b border-[var(--border)] hover:bg-[var(--background)] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 text-sm text-[var(--text-primary)] font-medium">
                  {payment.loan_number}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                  {payment.borrower_name}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                  {formatDate(payment.due_date)}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-primary)] font-medium">
                  {formatCurrency(payment.amount_due)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${getStatusColor(
                      payment.status
                    )}`}
                  >
                    {payment.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                    {getStatusLabel(payment.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
