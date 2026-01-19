'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { MemberList } from '@/components/admin/members/MemberList';
import type { UserFilters } from '@/lib/api/users';

export default function MembersPage() {
  const [filters, setFilters] = useState<UserFilters>({});

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Member Management</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage members, prospects, and leads. Assign staff to help with their applications.
          </p>
        </div>
        <MemberList filters={filters} onFiltersChange={setFilters} />
      </main>
    </PermissionGuard>
  );
}
