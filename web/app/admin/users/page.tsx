'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { UserList } from '@/components/admin/users/UserList';
import { UserForm } from '@/components/admin/users/UserForm';
import type { User, UserFilters } from '@/lib/api/users';

type ViewMode = 'list' | 'create' | 'edit';

export default function UsersPage() {
  const { canEdit } = usePermissions('/admin/users');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});

  function handleCreate() {
    setSelectedUser(null);
    setViewMode('create');
  }

  function handleEdit(user: User) {
    setSelectedUser(user);
    setViewMode('edit');
  }

  function handleSuccess() {
    setViewMode('list');
    setSelectedUser(null);
  }

  function handleCancel() {
    setViewMode('list');
    setSelectedUser(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        {(viewMode === 'create' || viewMode === 'edit') && (
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back to Users
          </button>
        )}
        {viewMode === 'list' && (
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
                className="px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
              >
                Create User
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <UserList
            onEdit={handleEdit}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-4xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
              {viewMode === 'create' ? 'Create New User' : 'Edit User'}
            </h2>
            <UserForm
              user={viewMode === 'edit' ? selectedUser : null}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
