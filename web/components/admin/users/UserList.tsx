'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getUsers, type User, deleteUser, type UserFilters } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES, USER_STATUSES } from '@/lib/api/users';
import { Select } from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface UserListProps {
  onEdit: (user: User) => void;
  onViewDetails?: (user: User) => void;
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
}

function getRoleColor(role: string): string {
  // Treat donum_lead as donum_prospect
  const normalizedRole = role === 'donum_lead' ? 'donum_prospect' : role;
  const roleColors: Record<string, string> = {
    'donum_super_admin': 'text-red-600 dark:text-red-400',
    'donum_admin': 'text-purple-600 dark:text-purple-400',
    'donum_staff': 'text-blue-600 dark:text-blue-400',
    'donum_member': 'text-green-600 dark:text-green-400',
    'donum_partner': 'text-orange-600 dark:text-orange-400',
    'donum_prospect': 'text-yellow-600 dark:text-yellow-400',
  };
  return roleColors[normalizedRole] || 'text-gray-600 dark:text-gray-400';
}

export function UserList({ onEdit, onViewDetails, filters, onFiltersChange }: UserListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit, canDelete } = usePermissions('/admin/users');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [roleFilter, setRoleFilter] = useState<UserFilters['role']>(filters?.role);
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const loadingRef = useRef(false);

  const loadDepartments = useCallback(async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('[UserList] Error loading departments:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const currentFilters: UserFilters = {
        search: searchTerm || undefined,
        role: roleFilter,
        status: statusFilter,
        department: filters?.department,
      };
      
      const data = await getUsers(currentFilters);
      setUsers(data);
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[UserList] Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, roleFilter, statusFilter, filters?.department, onFiltersChange]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (!authLoading && session) {
      loadUsers();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view users');
      setLoading(false);
    }
  }, [authLoading, session, loadUsers]);

  function handleDeleteClick(id: string, email: string) {
    setDeleteTarget({ id, email });
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setShowDeleteConfirm(false);
    try {
      setDeletingId(deleteTarget.id);
      await deleteUser(deleteTarget.id);
      await loadUsers();
      setDeleteTarget(null);
    } catch (err) {
      console.error('[UserList] Error deleting user:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete user');
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  function handleDeleteCancel() {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  }

  function handleRoleFilterChange(value: string) {
    if (value === 'all') {
      setRoleFilter(undefined);
    } else {
      setRoleFilter(value as UserFilters['role']);
    }
  }

  function handleStatusFilterChange(value: string) {
    if (value === 'all') {
      setStatusFilter(undefined);
    } else {
      setStatusFilter(value as UserFilters['status']);
    }
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSearchTerm('');
    setRoleFilter(undefined);
    setStatusFilter(undefined);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">
          {authLoading ? 'Authenticating...' : 'Loading users...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={loadUsers}
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
                id="user-search"
                name="user-search"
                type="text"
                placeholder="Search by email, name, or company..."
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

          {/* Role Filter */}
          <Select
            id="user-role-filter"
            name="user-role-filter"
            value={roleFilter || 'all'}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              ...USER_ROLES.map(role => ({
                value: role.value,
                label: role.label
              }))
            ]}
            className="w-40"
          />

          {/* Status Filter */}
          <Select
            id="user-status-filter"
            name="user-status-filter"
            value={statusFilter || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...USER_STATUSES.map(status => ({
                value: status.value,
                label: status.label
              }))
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
            onClick={loadUsers}
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

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || roleFilter || statusFilter
              ? 'No users found matching your filters.'
              : 'No users found. Create your first user to get started.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Name</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Email</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Role</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Departments</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Company</th>
                <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr 
                  key={user.id} 
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                  onClick={() => onViewDetails ? onViewDetails(user) : undefined}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name || user.email}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--core-blue)] flex items-center justify-center text-white text-sm font-medium">
                          {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-[var(--text-primary)]">
                        {user.name || user.first_name || user.last_name || user.email}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">{user.email}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center text-xs font-medium ${getRoleColor(user.role)}`}>
                      {USER_ROLES.find(r => r.value === user.role)?.label || (String(user.role) === 'donum_lead' ? 'Prospect' : user.role)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center text-xs font-medium ${
                        user.status === 'active'
                          ? 'text-green-600 dark:text-green-400'
                          : user.status === 'pending'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : user.status === 'suspended'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {USER_STATUSES.find(s => s.value === user.status)?.label || user.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.departments && user.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.departments.slice(0, 2).map((deptName) => {
                          const dept = departments.find(d => d.name === deptName);
                          const deptColor = dept?.color || '#6B7280'; // Default gray if not found
                          return (
                            <span
                              key={deptName}
                              className="inline-flex items-center text-xs font-medium"
                              style={{
                                color: deptColor
                              }}
                            >
                              {deptName}
                            </span>
                          );
                        })}
                        {user.departments.length > 2 && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            +{user.departments.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--text-secondary)]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {user.company || '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit('/admin/users') && (
                        <button
                          onClick={() => onEdit(user)}
                          className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete('/admin/users') && (
                        <button
                          onClick={() => handleDeleteClick(user.id, user.email)}
                          disabled={deletingId === user.id}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          {deletingId === user.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                      {!canEdit('/admin/users') && !canDelete('/admin/users') && (
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
          title="Delete User"
          message={`Are you sure you want to delete user "${deleteTarget.email}"? This action cannot be undone.`}
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
