'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { MemberList } from '@/components/admin/members/MemberList';
import type { UserFilters } from '@/lib/api/users';

export default function MembersPage() {
  const [filters, setFilters] = useState<UserFilters>({});

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Members</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            View and manage members. Click on a member to view their details.
          </p>
        </div>
        <MemberList filters={filters} onFiltersChange={setFilters} />
      </main>
    </PermissionGuard>
  );
}
