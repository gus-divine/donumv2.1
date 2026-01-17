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
    console.log('[Users Page] Switching to create mode');
    setSelectedUser(null);
    setViewMode('create');
  }

  function handleEdit(user: User) {
    console.log('[Users Page] Switching to edit mode:', { id: user.id, email: user.email });
    setSelectedUser(user);
    setViewMode('edit');
  }

  function handleSuccess() {
    console.log('[Users Page] Operation successful, returning to list');
    setViewMode('list');
    setSelectedUser(null);
  }

  function handleCancel() {
    console.log('[Users Page] Operation cancelled, returning to list');
    setViewMode('list');
    setSelectedUser(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Manage users, roles, and department assignments.
            </p>
          </div>
          {viewMode === 'list' && canEdit('/admin/users') && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Create User
            </button>
          )}
        </div>

        {viewMode === 'list' && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <UserList
              onEdit={handleEdit}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
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
