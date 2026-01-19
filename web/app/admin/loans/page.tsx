'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { LoanList } from '@/components/admin/loans/LoanList';
import type { LoanFilters } from '@/lib/api/loans';

export default function LoansPage() {
  const [filters, setFilters] = useState<LoanFilters>({});

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Loan Management</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            View and manage loans. Click on a loan to see details and payment history.
          </p>
        </div>
        <LoanList filters={filters} onFiltersChange={setFilters} />
      </main>
    </PermissionGuard>
  );
}
