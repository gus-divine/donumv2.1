'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getUsers, type User, type UserFilters } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES } from '@/lib/api/users';
import { ProspectStaffAssignment } from '@/components/admin/shared/ProspectStaffAssignment';
import { getProspectStaffAssignments } from '@/lib/api/prospect-staff-assignments';
import { Select } from '@/components/ui/select';

interface MemberListProps {
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
}

export function MemberList({ filters, onFiltersChange }: MemberListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit } = usePermissions('/admin/members');
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [roleFilter, setRoleFilter] = useState<UserFilters['role']>(filters?.role);
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProspectName, setSelectedProspectName] = useState<string>('');
  const loadingRef = useRef(false);

  // Member roles that should be shown in this list (ONLY actual members, not prospects/leads)
  const memberRoles: string[] = ['donum_member'];

  const loadMembers = useCallback(async () => {
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
      
      const allUsers = await getUsers(currentFilters);
      
      // Filter to only member roles
      const memberUsers = allUsers.filter(user => memberRoles.includes(user.role));
      
      setMembers(memberUsers);
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[MemberList] Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, roleFilter, statusFilter, filters?.department, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadMembers();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view members');
      setLoading(false);
    }
  }, [authLoading, session, loadMembers]);

  function handleAssignStaff(member: User) {
    const name = member.first_name || member.last_name
      ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
      : member.email;
    setSelectedProspectName(name);
    setSelectedProspectId(member.id);
  }

  function handleCloseAssignment() {
    setSelectedProspectId(null);
    setSelectedProspectName('');
    // Reload members to refresh any assignment data
    loadMembers();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-400">{error}</p>
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
                id="member-search"
                name="member-search"
                type="text"
                placeholder="Search by name or email..."
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
            id="member-role-filter"
            name="member-role-filter"
            value={roleFilter || 'all'}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              ...USER_ROLES.filter(r => memberRoles.includes(r.value)).map(role => ({
                value: role.value,
                label: role.label
              }))
            ]}
            className="w-40"
          />

          {/* Status Filter */}
          <Select
            id="member-status-filter"
            name="member-status-filter"
            value={statusFilter || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' }
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
            onClick={loadMembers}
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

      {/* Members Table */}
      {members.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || roleFilter || statusFilter
              ? 'No members found matching your filters.'
              : 'No members found. Members will appear here once created.'}
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
                {canEdit('/admin/members') && (
                  <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {
                members.map((member) => {
                  const name = member.first_name || member.last_name
                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    : 'No name';
                  
                  return (
                    <tr key={member.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-primary)]">{name}</div>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">{member.email}</td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">
                        {USER_ROLES.find(r => r.value === member.role)?.label || member.role}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : member.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {member.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">
                        {member.departments && member.departments.length > 0
                          ? member.departments.join(', ')
                          : '-'}
                      </td>
                      {canEdit('/admin/members') && (
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAssignStaff(member)}
                              className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                            >
                              Assign Staff
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Assignment Modal */}
      {selectedProspectId && (
        <ProspectStaffAssignment
          prospectId={selectedProspectId}
          prospectName={selectedProspectName}
          onClose={handleCloseAssignment}
          onUpdate={loadMembers}
        />
      )}
    </div>
  );
}
