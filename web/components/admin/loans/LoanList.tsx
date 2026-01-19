'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getLoans, type Loan, type LoanFilters, type LoanStatus } from '@/lib/api/loans';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Select } from '@/components/ui/select';

interface LoanListProps {
  filters?: LoanFilters;
  onFiltersChange?: (filters: LoanFilters) => void;
}

const LOAN_STATUSES: { value: LoanStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'paid_off', label: 'Paid Off' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

export function LoanList({ filters, onFiltersChange }: LoanListProps) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { canEdit } = usePermissions('/admin/loans');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | undefined>(filters?.status);
  const loadingRef = useRef(false);

  const loadLoans = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const currentFilters: LoanFilters = {
        search: searchTerm || undefined,
        status: statusFilter,
        applicant_id: filters?.applicant_id,
        application_id: filters?.application_id,
        plan_code: filters?.plan_code,
        department: filters?.department,
      };
      
      const loansData = await getLoans(currentFilters);
      setLoans(loansData);
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[LoanList] Error loading loans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load loans');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, statusFilter, filters?.applicant_id, filters?.application_id, filters?.plan_code, filters?.department, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadLoans();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view loans');
      setLoading(false);
    }
  }, [authLoading, session, loadLoans]);

  function handleViewLoan(loan: Loan) {
    router.push(`/admin/loans/${loan.id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  }

  function handleStatusFilterChange(value: string) {
    if (value === 'all') {
      setStatusFilter(undefined);
    } else {
      setStatusFilter(value as LoanStatus);
    }
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter(undefined);
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getStatusBadgeClass(status: LoanStatus): string {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'paid_off':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'defaulted':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Loading loans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[var(--surface)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                id="loan-search"
                name="loan-search"
                type="text"
                placeholder="Search by loan number or applicant name..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </form>

          {/* Status Filter */}
          <Select
            id="loan-status-filter"
            name="loan-status-filter"
            value={statusFilter || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...LOAN_STATUSES.map(status => ({
                value: status.value,
                label: status.label
              }))
            ]}
            className="w-40"
          />

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded border border-[var(--border)] transition-colors"
          >
            Clear Filters
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadLoans}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loans Table */}
      {loans.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || statusFilter
              ? 'No loans found matching your filters.'
              : 'No loans found. Loans will appear here once created from approved applications.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Loan Number</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Applicant</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Principal</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Balance</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Plan</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Next Payment</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Created</th>
                {canEdit('/admin/loans') && (
                  <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const applicantName = loan.applicant
                  ? (loan.applicant.first_name || loan.applicant.last_name
                      ? `${loan.applicant.first_name || ''} ${loan.applicant.last_name || ''}`.trim()
                      : loan.applicant.email)
                  : 'Unknown';
                
                return (
                  <tr 
                    key={loan.id} 
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    onClick={() => handleViewLoan(loan)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-primary)]">{loan.loan_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[var(--text-primary)]">{applicantName}</div>
                      {loan.applicant && (
                        <div className="text-[var(--text-secondary)] text-xs">{loan.applicant.email}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(loan.status)}`}>
                        {loan.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {formatCurrency(loan.principal_amount)}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {formatCurrency(loan.current_balance)}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {loan.plan ? loan.plan.name : '-'}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {loan.next_payment_date ? (
                        <div>
                          <div>{formatDate(loan.next_payment_date)}</div>
                          {loan.next_payment_amount && (
                            <div className="text-xs">{formatCurrency(loan.next_payment_amount)}</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {formatDate(loan.created_at)}
                    </td>
                    {canEdit('/admin/loans') && (
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLoan(loan);
                            }}
                            className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
