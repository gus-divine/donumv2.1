'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getDepartments, type Department, deleteDepartment } from '@/lib/api/departments';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  Users, Shield, Briefcase, Headphones, Settings, ChartBar, File, Folder,
  Mail, Phone, Calendar, Star, Heart, Tag, Flag, Bell, type LucideIcon
} from 'lucide-react';

// Map icon names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  briefcase: Briefcase,
  headphones: Headphones,
  settings: Settings,
  chart: ChartBar,
  file: File,
  folder: Folder,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  star: Star,
  heart: Heart,
  tag: Tag,
  flag: Flag,
  bell: Bell,
};

interface DepartmentListProps {
  onEdit: (department: Department) => void;
  onViewPermissions: (department: Department) => void;
  onManageStaff: (department: Department) => void;
  onManageMembers: (department: Department) => void;
}

export function DepartmentList({ onEdit, onViewPermissions, onManageStaff, onManageMembers }: DepartmentListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit, canDelete } = usePermissions('/admin/departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadDepartments = useCallback(async () => {
    // Prevent duplicate simultaneous calls
    if (loadingRef.current) {
      console.log('[DepartmentList] Already loading, skipping duplicate call');
      return;
    }

    try {
      console.log('[DepartmentList] Loading departments...');
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await getDepartments();
      console.log('[DepartmentList] Departments loaded:', { count: data.length });
      setDepartments(data);
    } catch (err) {
      console.error('[DepartmentList] Error loading departments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading and ensure we have a session before fetching
    if (!authLoading && session) {
      loadDepartments();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view departments');
      setLoading(false);
    }
  }, [authLoading, session, loadDepartments]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the "${name}" department? This action cannot be undone.`)) {
      console.log('[DepartmentList] Delete cancelled by user');
      return;
    }

    try {
      console.log('[DepartmentList] Deleting department:', { id, name });
      setDeletingId(id);
      await deleteDepartment(id);
      console.log('[DepartmentList] Department deleted, reloading list...');
      await loadDepartments();
    } catch (err) {
      console.error('[DepartmentList] Error deleting department:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete department');
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">
          {authLoading ? 'Authenticating...' : 'Loading departments...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={loadDepartments}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--text-secondary)]">No departments found. Create your first department to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Description</th>
            <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Icon</th>
            <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Color</th>
            <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="font-medium text-[var(--text-primary)]">{dept.name}</span>
                </div>
              </td>
              <td className="p-4 text-[var(--text-secondary)] text-sm">
                {dept.description || '-'}
              </td>
              <td className="p-4">
                {(() => {
                  const IconComponent = ICON_MAP[dept.icon] || Users;
                  return (
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: dept.color + '20' }}
                      >
                        <IconComponent
                          className="w-4 h-4"
                          style={{ color: dept.color }}
                        />
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">{dept.icon}</span>
                    </div>
                  );
                })()}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">{dept.color}</span>
                </div>
              </td>
              <td className="p-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    dept.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {dept.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-4">
                <div className="flex items-center justify-end gap-2">
                  {canEdit('/admin/departments') && (
                    <>
                      <button
                        onClick={() => onManageStaff(dept)}
                        className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                      >
                        Manage Staff
                      </button>
                      <button
                        onClick={() => onManageMembers(dept)}
                        className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                      >
                        Manage Members
                      </button>
                      <button
                        onClick={() => onViewPermissions(dept)}
                        className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                      >
                        Permissions
                      </button>
                      <button
                        onClick={() => onEdit(dept)}
                        className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                      >
                        Edit
                      </button>
                    </>
                  )}
                  {canDelete('/admin/departments') && (
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      disabled={deletingId === dept.id}
                      className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    >
                      {deletingId === dept.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                  {!canEdit('/admin/departments') && !canDelete('/admin/departments') && (
                    <span className="text-xs text-[var(--text-secondary)]">View only</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
