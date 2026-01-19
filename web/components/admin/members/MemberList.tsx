'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, type User, type UserFilters } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { getProspectStaffAssignments } from '@/lib/api/prospect-staff-assignments';
import { Select } from '@/components/ui/select';
import { getApplications } from '@/lib/api/applications';

interface MemberListProps {
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
}

export function MemberList({ filters, onFiltersChange }: MemberListProps) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [staffAssignments, setStaffAssignments] = useState<Record<string, any[]>>({});
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [memberDepartments, setMemberDepartments] = useState<Record<string, string[]>>({});
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
        status: statusFilter,
        department: filters?.department,
      };
      
      const allUsers = await getUsers(currentFilters);
      
      // Filter to only member roles
      const memberUsers = allUsers.filter(user => memberRoles.includes(user.role));
      
      setMembers(memberUsers);

      // Load all staff users once (including admins and super admins who can also be assigned)
      const allUsersForStaff = await getUsers();
      const allStaffUsers = allUsersForStaff.filter(user => 
        user.role === 'donum_staff' || 
        user.role === 'donum_admin' || 
        user.role === 'donum_super_admin'
      );
      setStaffUsers(allStaffUsers);

      // Load application counts, staff assignments, and departments for each member
      const counts: Record<string, number> = {};
      const assignments: Record<string, any[]> = {};
      const departmentsMap: Record<string, string[]> = {};
      
      await Promise.all(
        memberUsers.map(async (member) => {
          try {
            const [applications, memberAssignments] = await Promise.all([
              getApplications({ applicant_id: member.id }),
              getProspectStaffAssignments(member.id).catch(() => [])
            ]);
            counts[member.id] = applications.length;
            assignments[member.id] = memberAssignments.filter(a => a.is_active);
            
            // Get departments from assigned staff members
            const activeAssignments = memberAssignments.filter(a => a.is_active);
            const assignedStaffIds = activeAssignments.map(a => a.staff_id);
            const assignedStaff = allStaffUsers.filter(s => assignedStaffIds.includes(s.id));
            
            // Collect all unique departments from assigned staff
            const deptSet = new Set<string>();
            assignedStaff.forEach(staff => {
              if (staff.departments && Array.isArray(staff.departments)) {
                staff.departments.forEach(dept => deptSet.add(dept));
              }
            });
            departmentsMap[member.id] = Array.from(deptSet);
          } catch (err) {
            console.error(`[MemberList] Error loading data for member ${member.id}:`, err);
            counts[member.id] = 0;
            assignments[member.id] = [];
            departmentsMap[member.id] = [];
          }
        })
      );
      setApplicationCounts(counts);
      setStaffAssignments(assignments);
      setMemberDepartments(departmentsMap);
      
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
  }, [searchTerm, statusFilter, filters?.department, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadMembers();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view members');
      setLoading(false);
    }
  }, [authLoading, session, loadMembers]);

  function handleViewMember(member: User) {
    router.push(`/admin/members/${member.id}`);
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
            {searchTerm || statusFilter
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
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Applications</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Departments</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Staff</th>
              </tr>
            </thead>
            <tbody>
              {
                members.map((member) => {
                  const name = member.first_name || member.last_name
                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    : 'No name';
                  
                  const appCount = applicationCounts[member.id] || 0;
                  
                  return (
                    <tr 
                      key={member.id} 
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                      onClick={() => handleViewMember(member)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-primary)]">{name}</div>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">{member.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center text-xs font-medium ${
                          member.status === 'active'
                            ? 'text-green-600 dark:text-green-400'
                            : member.status === 'inactive'
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {member.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">
                        {appCount > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/applications?applicant_id=${member.id}`);
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
                        {memberDepartments[member.id] && memberDepartments[member.id].length > 0
                          ? memberDepartments[member.id].join(', ')
                          : '-'}
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-sm">
                        {(() => {
                          const assignments = staffAssignments[member.id] || [];
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
                })
              }
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
