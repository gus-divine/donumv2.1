'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { LoanDetail } from '@/components/admin/loans/LoanDetail';
import { getLoanById, type Loan } from '@/lib/api/loans';

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
        <main className="min-h-screen p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading loan details...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !loan) {
    return (
      <PermissionGuard>
        <main className="min-h-screen p-8">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back
          </button>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
            <p className="text-[var(--text-secondary)] mb-4">{error || 'Loan not found'}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Back
            </button>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <button
          onClick={handleBack}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
        >
          ← Back
        </button>
        <LoanDetail loan={loan} onBack={handleBack} onLoanUpdated={handleLoanUpdated} />
      </main>
    </PermissionGuard>
  );
}
