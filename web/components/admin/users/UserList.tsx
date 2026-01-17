'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getUsers, type User, deleteUser, type UserFilters } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES, USER_STATUSES } from '@/lib/api/users';

interface UserListProps {
  onEdit: (user: User) => void;
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
}

export function UserList({ onEdit, filters, onFiltersChange }: UserListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit, canDelete } = usePermissions('/admin/users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [roleFilter, setRoleFilter] = useState<UserFilters['role']>(filters?.role);
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const loadingRef = useRef(false);

  const loadUsers = useCallback(async () => {
    if (loadingRef.current) {
      console.log('[UserList] Already loading, skipping duplicate call');
      return;
    }

    try {
      console.log('[UserList] Loading users...', { filters });
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
      console.log('[UserList] Users loaded:', { count: data.length });
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
    if (!authLoading && session) {
      loadUsers();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view users');
      setLoading(false);
    }
  }, [authLoading, session, loadUsers]);

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      console.log('[UserList] Delete cancelled by user');
      return;
    }

    try {
      console.log('[UserList] Deleting user:', { id, email });
      setDeletingId(id);
      await deleteUser(id);
      console.log('[UserList] User deleted, reloading list...');
      await loadUsers();
    } catch (err) {
      console.error('[UserList] Error deleting user:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value === '' ? undefined : value as UserFilters['role']);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value === '' ? undefined : value as UserFilters['status']);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Search
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Email, name, company..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
          />
        </div>
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter || ''}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
          >
            <option value="">All Roles</option>
            {USER_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
          >
            <option value="">All Statuses</option>
            {USER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter(undefined);
              setStatusFilter(undefined);
            }}
            className="w-full px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded border border-[var(--border)]"
          >
            Clear Filters
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
                <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
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
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : user.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : user.status === 'suspended'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {USER_STATUSES.find(s => s.value === user.status)?.label || user.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.departments && user.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.departments.slice(0, 2).map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                          >
                            {dept}
                          </span>
                        ))}
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
                    <div className="flex items-center justify-end gap-2">
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
                          onClick={() => handleDelete(user.id, user.email)}
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
    </div>
  );
}
