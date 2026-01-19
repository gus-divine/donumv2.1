'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ProspectList } from '@/components/admin/prospects/ProspectList';
import type { UserFilters } from '@/lib/api/users';

export default function ProspectsPage() {
  const [filters, setFilters] = useState<UserFilters>({});

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prospect Management</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            View and manage prospects. Click on a prospect to see their applications.
          </p>
        </div>
        <ProspectList filters={filters} onFiltersChange={setFilters} />
      </main>
    </PermissionGuard>
  );
}
