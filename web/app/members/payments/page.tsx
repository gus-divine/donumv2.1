'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getLoans, type Loan } from '@/lib/api/loans';
import { getLoanPayments, type LoanPayment } from '@/lib/api/loans';
import { DollarSign, Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MemberPaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load all loans for the member
      const loansData = await getLoans({ applicant_id: user.id });
      setLoans(loansData);
      
      // Load payments for all loans
      const allPayments: LoanPayment[] = [];
      for (const loan of loansData) {
        try {
          const loanPayments = await getLoanPayments(loan.id);
          allPayments.push(...loanPayments);
        } catch (err) {
          console.error(`Error loading payments for loan ${loan.id}:`, err);
        }
      }
      
      // Sort by due date
      allPayments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setPayments(allPayments);
      
      // Set first loan as selected if available
      if (loansData.length > 0 && !selectedLoanId) {
        setSelectedLoanId(loansData[0].id);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-[var(--core-blue)]" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-[var(--core-gold)]" />;
      case 'scheduled':
      case 'pending':
        return <Clock className="w-5 h-5 text-[var(--core-blue)]" />;
      default:
        return <Clock className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-[var(--core-blue)]';
      case 'overdue':
        return 'text-[var(--core-gold)]';
      case 'scheduled':
      case 'pending':
        return 'text-[var(--core-blue)]';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  const filteredPayments = selectedLoanId
    ? payments.filter(p => p.loan_id === selectedLoanId)
    : payments;

  const upcomingPayments = filteredPayments.filter(p => ['scheduled', 'pending'].includes(p.status));
  const overduePayments = filteredPayments.filter(p => p.status === 'overdue');
  const paidPayments = filteredPayments.filter(p => p.status === 'paid');

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="20rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
          </div>

          {/* Payments List Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border border-[var(--border)] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton height="2.5rem" width="2.5rem" variant="circular" />
                    <div className="space-y-2">
                      <Skeleton height="1rem" width="12rem" />
                      <Skeleton height="0.875rem" width="10rem" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton height="1rem" width="8rem" />
                    <Skeleton height="0.875rem" width="6rem" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-l-4 border-red-500 pl-4 py-2">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Payments</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            View and track your loan payments
          </p>
        </div>

        {/* Loan Filter */}
        {loans.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Filter by Loan
            </label>
            <select
              value={selectedLoanId || ''}
              onChange={(e) => setSelectedLoanId(e.target.value || null)}
              className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] text-sm"
            >
              <option value="">All Loans</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.loan_number} - {loan.plan?.name || 'Loan'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 border-l-4 border-[var(--core-blue)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-[var(--core-blue)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{upcomingPayments.length}</p>
          </div>
          <div className="p-4 border-l-4 border-[var(--core-gold)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-[var(--core-gold)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{overduePayments.length}</p>
          </div>
          <div className="p-4 border-l-4 border-[var(--core-blue)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--core-blue)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Paid</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{paidPayments.length}</p>
          </div>
        </div>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center border border-[var(--border)] rounded-lg">
            <DollarSign className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">No payments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => {
              const loan = loans.find(l => l.id === payment.loan_id);
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === 'overdue'
                        ? 'bg-[var(--core-gold)]/10'
                        : payment.status === 'paid'
                        ? 'bg-[var(--core-blue)]/10'
                        : 'bg-[var(--core-blue)]/10'
                    }`}>
                      {getStatusIcon(payment.status)}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        Payment #{payment.payment_number}
                        {loan && (
                          <span className="text-sm text-[var(--text-secondary)] ml-2">
                            - {loan.loan_number}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Due {formatDate(payment.due_date)}
                        {payment.paid_date && (
                          <span className="ml-2">• Paid {formatDate(payment.paid_date)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(payment.amount_due)}
                    </p>
                    <p className={`text-xs ${getStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </p>
                    {payment.amount_paid > 0 && payment.amount_paid !== payment.amount_due && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Paid: {formatCurrency(payment.amount_paid)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
