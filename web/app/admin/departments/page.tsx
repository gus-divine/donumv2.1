'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { DepartmentList } from '@/components/admin/departments/DepartmentList';
import { DepartmentForm } from '@/components/admin/departments/DepartmentForm';
import { PermissionAssignment } from '@/components/admin/departments/PermissionAssignment';
import { DepartmentStaffAssignment } from '@/components/admin/departments/DepartmentStaffAssignment';
import { DepartmentMemberAssignment } from '@/components/admin/departments/DepartmentMemberAssignment';
import type { Department } from '@/lib/api/departments';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions' | 'staff' | 'members';

export default function DepartmentsPage() {
  const { canEdit } = usePermissions('/admin/departments');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  function handleCreate() {
    console.log('[Departments Page] Switching to create mode');
    setSelectedDepartment(null);
    setViewMode('create');
  }

  function handleEdit(department: Department) {
    console.log('[Departments Page] Switching to edit mode:', { id: department.id, name: department.name });
    setSelectedDepartment(department);
    setViewMode('edit');
  }

  function handleViewPermissions(department: Department) {
    console.log('[Departments Page] Switching to permissions mode:', { id: department.id, name: department.name });
    setSelectedDepartment(department);
    setViewMode('permissions');
  }

  function handleManageStaff(department: Department) {
    console.log('[Departments Page] Switching to staff management mode:', { id: department.id, name: department.name });
    setSelectedDepartment(department);
    setViewMode('staff');
  }

  function handleManageMembers(department: Department) {
    console.log('[Departments Page] Switching to member management mode:', { id: department.id, name: department.name });
    setSelectedDepartment(department);
    setViewMode('members');
  }

  function handleSuccess() {
    console.log('[Departments Page] Operation successful, returning to list');
    setViewMode('list');
    setSelectedDepartment(null);
  }

  function handleCancel() {
    console.log('[Departments Page] Operation cancelled, returning to list');
    setViewMode('list');
    setSelectedDepartment(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Department Management</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Manage departments and configure their page permissions.
            </p>
          </div>
          {viewMode === 'list' && canEdit('/admin/departments') && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Create Department
            </button>
          )}
        </div>

      {viewMode === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <DepartmentList
            onEdit={handleEdit}
            onViewPermissions={handleViewPermissions}
            onManageStaff={handleManageStaff}
            onManageMembers={handleManageMembers}
          />
        </div>
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

        {viewMode === 'members' && selectedDepartment && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <DepartmentMemberAssignment
              department={selectedDepartment}
              onClose={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
