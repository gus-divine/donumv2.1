'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { LoanDetail } from '@/components/admin/loans/LoanDetail';
import { getLoanById, type Loan } from '@/lib/api/loans';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params?.id as string;
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loanId) {
      setError('Loan ID is required');
      setLoading(false);
      return;
    }

    async function loadLoan() {
      try {
        setLoading(true);
        setError(null);
        const loanData = await getLoanById(loanId);
        if (!loanData) {
          setError('Loan not found');
        } else {
          setLoan(loanData);
        }
      } catch (err) {
        console.error('[LoanDetailPage] Error loading loan:', err);
        setError(err instanceof Error ? err.message : 'Failed to load loan');
      } finally {
        setLoading(false);
      }
    }

    loadLoan();
  }, [loanId]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/loans');
    }
  }

  function handleLoanUpdated(updatedLoan: Loan) {
    setLoan(updatedLoan);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <Skeleton height="1.5rem" width="5rem" />
            </div>

            {/* Header Skeleton */}
            <div className="mb-8">
              <Skeleton height="2rem" width="16rem" className="mb-2" />
              <Skeleton height="1rem" width="20rem" />
            </div>

            {/* Loan Information Skeleton */}
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="12rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Schedule Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="14rem" className="mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 border border-[var(--border)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton height="1.25rem" width="12rem" />
                      <Skeleton height="1.25rem" width="8rem" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton height="1rem" width="10rem" />
                      <Skeleton height="1rem" width="10rem" />
                      <Skeleton height="1rem" width="8rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
              <div className="flex items-center gap-3">
                <Skeleton height="2.5rem" width="8rem" />
                <Skeleton height="2.5rem" width="8rem" />
                <Skeleton height="2.5rem" width="8rem" />
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !loan) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleBack}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Loan not found'}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
          <LoanDetail loan={loan} onBack={handleBack} onLoanUpdated={handleLoanUpdated} />
        </div>
      </main>
    </PermissionGuard>
  );
}
