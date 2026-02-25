'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { LoanList } from '@/components/admin/loans/LoanList';
import type { LoanFilters } from '@/lib/api/loans';

export default function TeamLoansPage() {
  const [filters, setFilters] = useState<LoanFilters>({});

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Loans</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            View and manage loans. Click on a loan to see details.
          </p>
        </div>
        <LoanList filters={filters} onFiltersChange={setFilters} />
      </main>
    </PermissionGuard>
  );
}
