'use client';

import { useState, useRef } from 'react';
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
  const formSubmitRef = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleCreate() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setSelectedDepartment(null);
    setViewMode('create');
  }

  function handleEdit(department: Department) {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setSelectedDepartment(department);
    setViewMode('edit');
  }

  function handleViewPermissions(department: Department) {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setSelectedDepartment(department);
    setViewMode('permissions');
  }

  function handleManageStaff(department: Department) {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setSelectedDepartment(department);
    setViewMode('staff');
  }

  function handleSuccess() {
    setViewMode('list');
    setSelectedDepartment(null);
    // Trigger refresh of department list
    setRefreshTrigger(prev => prev + 1);
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
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
            onViewDetails={(dept) => {
              if (hasUnsavedChanges) {
                const confirmed = window.confirm(
                  'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
                );
                if (!confirmed) {
                  return;
                }
              }
              setHasUnsavedChanges(false);
              router.push(`/admin/departments/${dept.id}`);
            }}
            refreshTrigger={refreshTrigger}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {viewMode === 'create' ? 'Create New Department' : 'Edit Department'}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  {viewMode === 'create' 
                    ? 'Create a new department with custom settings and permissions'
                    : 'Update department information and settings'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => formSubmitRef.current?.click()}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                      Saving...
                    </span>
                  ) : (
                    viewMode === 'edit' ? 'Update Department' : 'Create Department'
                  )}
                </button>
              </div>
            </div>
            <DepartmentForm
              department={viewMode === 'edit' ? selectedDepartment : null}
              onSuccess={() => {
                setHasUnsavedChanges(false);
                handleSuccess();
              }}
              onCancel={handleCancel}
              submitRef={formSubmitRef}
              onLoadingChange={setIsSaving}
              onHasChangesChange={setHasUnsavedChanges}
            />
          </div>
        )}

        {viewMode === 'permissions' && selectedDepartment && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-6">
              <PermissionAssignment
                department={selectedDepartment}
                onClose={handleCancel}
              />
            </div>
          </div>
        )}

        {viewMode === 'staff' && selectedDepartment && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-6">
              <DepartmentStaffAssignment
                department={selectedDepartment}
                onClose={handleCancel}
              />
            </div>
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
