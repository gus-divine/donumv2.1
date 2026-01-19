'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getDepartments, type Department, deleteDepartment } from '@/lib/api/departments';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Select } from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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
}

export function DepartmentList({ onEdit, onViewPermissions, onManageStaff }: DepartmentListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit, canDelete } = usePermissions('/admin/departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const loadingRef = useRef(false);

  function applyFilters(depts: Department[], search: string, status: 'all' | 'active' | 'inactive') {
    let filtered = [...depts];

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchLower) ||
        (dept.description && dept.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(dept =>
        status === 'active' ? dept.is_active : !dept.is_active
      );
    }

    setFilteredDepartments(filtered);
  }

  const loadDepartments = useCallback(async () => {
    // Prevent duplicate simultaneous calls
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await getDepartments();
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

  useEffect(() => {
    applyFilters(departments, searchTerm, statusFilter);
  }, [departments, searchTerm, statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as 'all' | 'active' | 'inactive');
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter('all');
  }

  function handleDeleteClick(id: string, name: string) {
    setDeleteTarget({ id, name });
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setShowDeleteConfirm(false);
    try {
      setDeletingId(deleteTarget.id);
      await deleteDepartment(deleteTarget.id);
      await loadDepartments();
      setDeleteTarget(null);
    } catch (err) {
      console.error('[DepartmentList] Error deleting department:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete department');
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  function handleDeleteCancel() {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[var(--surface)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                id="department-search"
                name="department-search"
                type="text"
                placeholder="Search departments by name or description..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </form>

          {/* Status Filter */}
          <Select
            id="department-status-filter"
            name="department-status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            className="w-40"
          />

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded border border-[var(--border)] transition-colors"
          >
            Clear Filters
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadDepartments}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Departments Table */}
      {filteredDepartments.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || statusFilter !== 'all'
              ? 'No departments found matching your filters.'
              : departments.length === 0
              ? 'No departments found. Create your first department to get started.'
              : 'No departments found matching your filters.'}
          </p>
        </div>
      ) : (
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
              {filteredDepartments.map((dept) => (
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
                      onClick={() => handleDeleteClick(dept.id, dept.name)}
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
      )}

      {/* Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Department"
          message={`Are you sure you want to delete the "${deleteTarget.name}" department? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Error Message Dialog */}
      {errorMessage && (
        <ConfirmationDialog
          isOpen={!!errorMessage}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          variant="danger"
          showCancel={false}
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}
