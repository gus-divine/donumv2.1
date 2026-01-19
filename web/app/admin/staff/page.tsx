'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { StaffList } from '@/components/admin/staff/StaffList';
import { StaffForm } from '@/components/admin/staff/StaffForm';
import type { UserFilters, User } from '@/lib/api/users';

type ViewMode = 'list' | 'create' | 'edit';

export default function StaffPage() {
  const { canEdit } = usePermissions('/admin/staff');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});

  function handleCreate() {
    setSelectedStaff(null);
    setViewMode('create');
  }

  function handleEdit(staff: User) {
    setSelectedStaff(staff);
    setViewMode('edit');
  }

  function handleSuccess() {
    setViewMode('list');
    setSelectedStaff(null);
  }

  function handleCancel() {
    setViewMode('list');
    setSelectedStaff(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        {(viewMode === 'create' || viewMode === 'edit') && (
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back to Staff
          </button>
        )}
        {viewMode === 'list' && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Staff</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Manage staff members and their department assignments. Assign staff to departments to control access and permissions.
              </p>
            </div>
            {canEdit('/admin/staff') && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
              >
                Add Staff
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <StaffList
            onEdit={handleEdit}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-4xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
              {viewMode === 'create' ? 'Add New Staff Member' : 'Edit Staff Member'}
            </h2>
            <StaffForm
              staff={viewMode === 'edit' ? selectedStaff : null}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
