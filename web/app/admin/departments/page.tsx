'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { DepartmentList } from '@/components/admin/departments/DepartmentList';
import { DepartmentForm } from '@/components/admin/departments/DepartmentForm';
import { PermissionAssignment } from '@/components/admin/departments/PermissionAssignment';
import { DepartmentStaffAssignment } from '@/components/admin/departments/DepartmentStaffAssignment';
import type { Department } from '@/lib/api/departments';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions' | 'staff';

export default function DepartmentsPage() {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/departments');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  function handleCreate() {
    setSelectedDepartment(null);
    setViewMode('create');
  }

  function handleEdit(department: Department) {
    setSelectedDepartment(department);
    setViewMode('edit');
  }

  function handleViewPermissions(department: Department) {
    setSelectedDepartment(department);
    setViewMode('permissions');
  }

  function handleManageStaff(department: Department) {
    setSelectedDepartment(department);
    setViewMode('staff');
  }

  function handleManageMembers(department: Department) {
    setSelectedDepartment(department);
    setViewMode('members');
  }

  function handleSuccess() {
    setViewMode('list');
    setSelectedDepartment(null);
  }

  function handleCancel() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      setViewMode('list');
      setSelectedDepartment(null);
    }
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {(viewMode === 'create' || viewMode === 'edit' || viewMode === 'permissions' || viewMode === 'staff') && (
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
        )}
        {viewMode === 'list' && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Departments</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Manage departments and configure their page permissions. Click on a department to view its details.
              </p>
            </div>
            {canEdit('/admin/departments') && (
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                + Create Department
              </button>
            )}
          </div>
        )}

      {viewMode === 'list' && (
        <DepartmentList
          onEdit={handleEdit}
          onViewPermissions={handleViewPermissions}
          onManageStaff={handleManageStaff}
          onViewDetails={(dept) => router.push(`/admin/departments/${dept.id}`)}
        />
      )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
              {viewMode === 'create' ? 'Create New Department' : 'Edit Department'}
            </h2>
            <DepartmentForm
              department={viewMode === 'edit' ? selectedDepartment : null}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}

        {viewMode === 'permissions' && selectedDepartment && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <PermissionAssignment
              department={selectedDepartment}
              onClose={handleCancel}
            />
          </div>
        )}

        {viewMode === 'staff' && selectedDepartment && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <DepartmentStaffAssignment
              department={selectedDepartment}
              onClose={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
