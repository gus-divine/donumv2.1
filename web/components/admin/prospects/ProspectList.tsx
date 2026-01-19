'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, type User, type UserFilters } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
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
  const [prospects, setProspects] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [staffAssignments, setStaffAssignments] = useState<Record<string, any[]>>({});
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [prospectDepartments, setProspectDepartments] = useState<Record<string, string[]>>({});
  const loadingRef = useRef(false);

  // Prospect roles that should be shown in this list
  const prospectRoles: string[] = ['donum_prospect'];

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
        status: statusFilter,
        department: filters?.department,
      };
      
      const allUsers = await getUsers(currentFilters);
      
      // Filter to only prospect roles
      const prospectUsers = allUsers.filter(user => prospectRoles.includes(user.role));
      
      setProspects(prospectUsers);

      // Load application counts and staff assignments for each prospect
      const counts: Record<string, number> = {};
      const assignments: Record<string, any[]> = {};
      
      // Load all staff users once (including admins and super admins who can also be assigned)
      const allUsersForStaff = await getUsers();
      const allStaffUsers = allUsersForStaff.filter(user => 
        user.role === 'donum_staff' || 
        user.role === 'donum_admin' || 
        user.role === 'donum_super_admin'
      );
      setStaffUsers(allStaffUsers);
      
      const departmentsMap: Record<string, string[]> = {};
      
      await Promise.all(
        prospectUsers.map(async (prospect) => {
          try {
            const [applications, prospectAssignments] = await Promise.all([
              getApplications({ applicant_id: prospect.id }),
              getProspectStaffAssignments(prospect.id).catch(() => [])
            ]);
            counts[prospect.id] = applications.length;
            assignments[prospect.id] = prospectAssignments.filter(a => a.is_active);
            
            // Get departments from assigned staff members
            const activeAssignments = prospectAssignments.filter(a => a.is_active);
            const assignedStaffIds = activeAssignments.map(a => a.staff_id);
            const assignedStaff = allStaffUsers.filter(s => assignedStaffIds.includes(s.id));
            
            // Collect all unique departments from assigned staff
            const deptSet = new Set<string>();
            assignedStaff.forEach(staff => {
              if (staff.departments && Array.isArray(staff.departments)) {
                staff.departments.forEach(dept => deptSet.add(dept));
              }
            });
            departmentsMap[prospect.id] = Array.from(deptSet);
          } catch (err) {
            console.error(`[ProspectList] Error loading data for prospect ${prospect.id}:`, err);
            counts[prospect.id] = 0;
            assignments[prospect.id] = [];
            departmentsMap[prospect.id] = [];
          }
        })
      );
      setApplicationCounts(counts);
      setStaffAssignments(assignments);
      setProspectDepartments(departmentsMap);
      
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
  }, [searchTerm, statusFilter, filters?.department, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadProspects();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view prospects');
      setLoading(false);
    }
  }, [authLoading, session, loadProspects]);

  function handleViewProspect(prospect: User) {
    // Navigate to prospect detail page
    router.push(`/admin/prospects/${prospect.id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
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
            {searchTerm || statusFilter
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
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Applications</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Departments</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Staff</th>
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
                    onClick={() => handleViewProspect(prospect)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-primary)]">{name}</div>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">{prospect.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center text-xs font-medium ${
                        prospect.status === 'active'
                          ? 'text-green-600 dark:text-green-400'
                          : prospect.status === 'inactive'
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {prospect.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {appCount > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/applications?applicant_id=${prospect.id}`);
                          }}
                          className="font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:underline transition-colors"
                        >
                          {appCount}
                        </button>
                      ) : (
                        <span className="text-[var(--text-secondary)]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {prospectDepartments[prospect.id] && prospectDepartments[prospect.id].length > 0
                        ? prospectDepartments[prospect.id].join(', ')
                        : '-'}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {(() => {
                        const assignments = staffAssignments[prospect.id] || [];
                        if (assignments.length === 0) {
                          return <span className="text-[var(--text-secondary)]">-</span>;
                        }
                        const staffNames = assignments
                          .map(assignment => {
                            const staff = staffUsers.find(s => s.id === assignment.staff_id);
                            return staff?.name || 
                                   (staff?.first_name || staff?.last_name
                                     ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                                     : staff?.email || 'Unknown');
                          })
                          .filter(Boolean);
                        return (
                          <div className="space-y-1">
                            {staffNames.map((name, idx) => (
                              <div key={idx} className="text-sm">
                                {assignments[idx]?.is_primary && (
                                  <span className="text-xs text-[var(--text-secondary)] mr-1">•</span>
                                )}
                                {name}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
