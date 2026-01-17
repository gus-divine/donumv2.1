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
      console.log('[PermissionAssignment] Loading permissions for department:', { departmentName: department.name });
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
      
      console.log('[PermissionAssignment] Permissions loaded:', { 
        departmentName: department.name, 
        existingCount: existing.length,
        totalPages: ADMIN_PAGES.length 
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
    console.log('[PermissionAssignment] Updating permission:', { 
      departmentName: department.name, 
      pagePath, 
      field, 
      value 
    });
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
      console.log('[PermissionAssignment] Saving permissions for department:', { departmentName: department.name });
      setSaving(true);
      setError(null);
      const permArray = Object.values(permissions);
      await updateDepartmentPermissions(department.name, permArray);
      console.log('[PermissionAssignment] Permissions saved successfully');
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Permissions for {department.name}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure which pages this department can access and what actions they can perform.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-3 text-sm font-semibold text-[var(--text-primary)]">Page</th>
              <th className="text-center p-3 text-sm font-semibold text-[var(--text-primary)]">View</th>
              <th className="text-center p-3 text-sm font-semibold text-[var(--text-primary)]">Edit</th>
              <th className="text-center p-3 text-sm font-semibold text-[var(--text-primary)]">Delete</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_PAGES.map((page) => {
              const perm = permissions[page.path] || {
                page_path: page.path,
                can_view: false,
                can_edit: false,
                can_delete: false,
              };

              return (
                <tr key={page.path} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                  <td className="p-3 text-sm text-[var(--text-primary)]">{page.label}</td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_view}
                      onChange={(e) => updatePermission(page.path, 'can_view', e.target.checked)}
                      className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)]"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_edit}
                      disabled={!perm.can_view}
                      onChange={(e) => updatePermission(page.path, 'can_edit', e.target.checked)}
                      className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)] disabled:opacity-50"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_delete}
                      disabled={!perm.can_view}
                      onChange={(e) => updatePermission(page.path, 'can_delete', e.target.checked)}
                      className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)] disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}
