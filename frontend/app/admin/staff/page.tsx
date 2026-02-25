'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { StaffList } from '@/components/admin/staff/StaffList';
import { StaffForm } from '@/components/admin/staff/StaffForm';
import type { UserFilters, User } from '@/lib/api/users';

type ViewMode = 'list' | 'edit';

export default function StaffPage() {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/staff');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});

  function handleCreate() {
    router.push('/admin/staff/new');
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
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      setViewMode('list');
      setSelectedStaff(null);
    }
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {viewMode === 'edit' && (
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back
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
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                + Add Staff
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

        {viewMode === 'edit' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Edit Staff Member
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Update staff member information and department assignments.
              </p>
            </div>
            <StaffForm
              staff={selectedStaff}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
