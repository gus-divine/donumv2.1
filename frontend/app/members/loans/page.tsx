'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getLoans, type Loan } from '@/lib/api/loans';
import { CreditCard, ArrowRight, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MemberLoansPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLoans();
    }
  }, [user]);

  const loadLoans = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const loansData = await getLoans({ applicant_id: user.id });
      setLoans(loansData);
    } catch (err) {
      console.error('Error loading loans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-600 dark:text-blue-400';
      case 'paid_off':
        return 'text-green-600 dark:text-green-400';
      case 'defaulted':
        return 'text-red-600 dark:text-red-400';
      case 'cancelled':
      case 'closed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="20rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
          </div>

          {/* Loans List Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 border border-[var(--border)] rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <Skeleton height="1.5rem" width="16rem" />
                    <Skeleton height="1rem" width="12rem" />
                  </div>
                  <Skeleton height="1.5rem" width="8rem" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="10rem" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="10rem" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="10rem" />
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">My Loans</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            View and manage all your loans
          </p>
        </div>

        {loans.length === 0 ? (
          <div className="p-8 text-center border border-[var(--border)] rounded-lg">
            <CreditCard className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">No loans found.</p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Your loans will appear here once they are created.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => (
              <div
                key={loan.id}
                onClick={() => router.push(`/members/loans/${loan.id}`)}
                className="p-6 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                      {loan.loan_number}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {loan.plan?.name || 'Loan Plan'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(loan.status)}`}>
                      {loan.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Current Balance</span>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(loan.current_balance)}</p>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Next Payment</span>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {loan.next_payment_amount ? formatCurrency(loan.next_payment_amount) : '-'}
                    </p>
                    {loan.next_payment_date && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Due {formatDate(loan.next_payment_date)}</p>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Total Paid</span>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(loan.total_paid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
