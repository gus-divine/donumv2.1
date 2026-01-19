'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, type User, type UserFilters } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES } from '@/lib/api/users';
import { ProspectStaffAssignment } from '@/components/admin/shared/ProspectStaffAssignment';
import { getProspectStaffAssignments } from '@/lib/api/prospect-staff-assignments';
import { Select } from '@/components/ui/select';
import { getApplications } from '@/lib/api/applications';

interface ProspectListProps {
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
}

export function ProspectList({ filters, onFiltersChange }: ProspectListProps) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { canEdit } = usePermissions('/admin/prospects');
  const [prospects, setProspects] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [roleFilter, setRoleFilter] = useState<UserFilters['role']>(filters?.role);
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProspectName, setSelectedProspectName] = useState<string>('');
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const loadingRef = useRef(false);

  // Prospect roles that should be shown in this list
  const prospectRoles: string[] = ['donum_prospect', 'donum_lead', 'donum_member'];

  const loadProspects = useCallback(async () => {
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
      
      // Filter to only prospect roles
      const prospectUsers = allUsers.filter(user => prospectRoles.includes(user.role));
      
      setProspects(prospectUsers);

      // Load application counts for each prospect
      const counts: Record<string, number> = {};
      await Promise.all(
        prospectUsers.map(async (prospect) => {
          try {
            const applications = await getApplications({ applicant_id: prospect.id });
            counts[prospect.id] = applications.length;
          } catch (err) {
            console.error(`[ProspectList] Error loading applications for prospect ${prospect.id}:`, err);
            counts[prospect.id] = 0;
          }
        })
      );
      setApplicationCounts(counts);
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[ProspectList] Error loading prospects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prospects');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, roleFilter, statusFilter, filters?.department, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadProspects();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view prospects');
      setLoading(false);
    }
  }, [authLoading, session, loadProspects]);

  function handleViewApplications(prospect: User) {
    // Navigate to applications page with applicant_id filter
    router.push(`/admin/applications?applicant_id=${prospect.id}`);
  }

  function handleAssignStaff(prospect: User) {
    const name = prospect.first_name || prospect.last_name
      ? `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()
      : prospect.email;
    setSelectedProspectName(name);
    setSelectedProspectId(prospect.id);
  }

  function handleCloseAssignment() {
    setSelectedProspectId(null);
    setSelectedProspectName('');
    // Reload prospects to refresh any assignment data
    loadProspects();
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
        <p className="text-[var(--text-secondary)]">Loading prospects...</p>
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
                id="prospect-search"
                name="prospect-search"
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
            id="prospect-role-filter"
            name="prospect-role-filter"
            value={roleFilter || 'all'}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              ...USER_ROLES.filter(r => prospectRoles.includes(r.value)).map(role => ({
                value: role.value,
                label: role.label
              }))
            ]}
            className="w-40"
          />

          {/* Status Filter */}
          <Select
            id="prospect-status-filter"
            name="prospect-status-filter"
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
            onClick={loadProspects}
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

      {/* Prospects Table */}
      {prospects.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || roleFilter || statusFilter
              ? 'No prospects found matching your filters.'
              : 'No prospects found. Prospects will appear here once created.'}
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
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Applications</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Departments</th>
                {canEdit('/admin/prospects') && (
                  <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {prospects.map((prospect) => {
                const name = prospect.first_name || prospect.last_name
                  ? `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()
                  : 'No name';
                const appCount = applicationCounts[prospect.id] || 0;
                
                return (
                  <tr 
                    key={prospect.id} 
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    onClick={() => handleViewApplications(prospect)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-primary)]">{name}</div>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">{prospect.email}</td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {USER_ROLES.find(r => r.value === prospect.role)?.label || prospect.role}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        prospect.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : prospect.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {prospect.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {appCount > 0 ? (
                        <span className="font-medium text-[var(--text-primary)]">{appCount}</span>
                      ) : (
                        <span className="text-[var(--text-secondary)]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {prospect.departments && prospect.departments.length > 0
                        ? prospect.departments.join(', ')
                        : '-'}
                    </td>
                    {canEdit('/admin/prospects') && (
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignStaff(prospect);
                            }}
                            className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                          >
                            Assign Staff
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
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
          onUpdate={loadProspects}
        />
      )}
    </div>
  );
}
