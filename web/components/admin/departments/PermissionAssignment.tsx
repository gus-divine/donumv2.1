'use client';

import { useState, useEffect } from 'react';
import { getDepartmentPermissions, updateDepartmentPermissions, ADMIN_PAGES, type Department } from '@/lib/api/departments';

interface PermissionAssignmentProps {
  department: Department;
  onClose: () => void;
}

interface PagePermission {
  page_path: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function PermissionAssignment({ department, onClose }: PermissionAssignmentProps) {
  const [permissions, setPermissions] = useState<Record<string, PagePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [department.name]);

  async function loadPermissions() {
    try {
      setLoading(true);
      setError(null);
      const existing = await getDepartmentPermissions(department.name);
      
      const permMap: Record<string, PagePermission> = {};
      ADMIN_PAGES.forEach((page) => {
        const existingPerm = existing.find((p) => p.page_path === page.path);
        permMap[page.path] = {
          page_path: page.path,
          can_view: existingPerm?.can_view || false,
          can_edit: existingPerm?.can_edit || false,
          can_delete: existingPerm?.can_delete || false,
        };
      });
      
      setPermissions(permMap);
    } catch (err) {
      console.error('[PermissionAssignment] Error loading permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  function updatePermission(pagePath: string, field: 'can_view' | 'can_edit' | 'can_delete', value: boolean) {
    setPermissions((prev) => ({
      ...prev,
      [pagePath]: {
        ...prev[pagePath],
        [field]: value,
        can_edit: field === 'can_view' && !value ? false : prev[pagePath]?.can_edit || false,
        can_delete: field === 'can_view' && !value ? false : prev[pagePath]?.can_delete || false,
      },
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      const permArray = Object.values(permissions);
      await updateDepartmentPermissions(department.name, permArray);
      onClose();
    } catch (err) {
      console.error('[PermissionAssignment] Error saving permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--text-secondary)]">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header with Actions */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Permissions for {department.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure which pages this department can access and what actions they can perform.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                Saving...
              </span>
            ) : (
              'Save Permissions'
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 border-l-4 border-red-500 pl-4 py-2">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Permissions Table */}
      <div className="pt-4 pb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[var(--core-gold)]">
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Page</th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--text-primary)]">View</th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--text-primary)]">Edit</th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--text-primary)]">Delete</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_PAGES.map((page, index) => {
                const perm = permissions[page.path] || {
                  page_path: page.path,
                  can_view: false,
                  can_edit: false,
                  can_delete: false,
                };

                return (
                  <tr 
                    key={page.path} 
                    className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${
                      index === ADMIN_PAGES.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="p-4 text-sm font-medium text-[var(--text-primary)]">{page.label}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => updatePermission(page.path, 'can_view', !perm.can_view)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:ring-offset-2 ${
                          perm.can_view ? 'bg-[var(--core-blue)]' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            perm.can_view ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => perm.can_view && updatePermission(page.path, 'can_edit', !perm.can_edit)}
                        disabled={!perm.can_view}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:ring-offset-2 ${
                          perm.can_view
                            ? perm.can_edit
                              ? 'bg-[var(--core-blue)]'
                              : 'bg-gray-300 dark:bg-gray-600'
                            : 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            perm.can_edit ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => perm.can_view && updatePermission(page.path, 'can_delete', !perm.can_delete)}
                        disabled={!perm.can_view}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:ring-offset-2 ${
                          perm.can_view
                            ? perm.can_delete
                              ? 'bg-[var(--core-blue)]'
                              : 'bg-gray-300 dark:bg-gray-600'
                            : 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            perm.can_delete ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
