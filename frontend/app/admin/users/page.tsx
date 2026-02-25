'use client';

import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { UserList } from '@/components/admin/users/UserList';
import type { User, UserFilters } from '@/lib/api/users';
import { useState } from 'react';

export default function UsersPage() {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/users');
  const [filters, setFilters] = useState<UserFilters>({});

  function handleCreate() {
    router.push('/admin/users/new');
  }

  function handleEdit(user: User) {
    router.push(`/admin/users/${user.id}/edit`);
  }

  function handleViewDetails(user: User) {
    router.push(`/admin/users/${user.id}`);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Manage users, roles, and department assignments.
            </p>
          </div>
          {canEdit('/admin/users') && (
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              + Create User
            </button>
          )}
        </div>

        <UserList
          onEdit={handleEdit}
          onViewDetails={handleViewDetails}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </main>
    </PermissionGuard>
  );
}
