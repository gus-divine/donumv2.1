'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, type User, type UserFilters } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES } from '@/lib/api/users';
import { Select } from '@/components/ui/select';
import { StaffDepartmentAssignment } from './StaffDepartmentAssignment';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffListProps {
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
  onEdit?: (staff: User) => void;
}

export function StaffList({ filters, onFiltersChange, onEdit }: StaffListProps) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { canEdit } = usePermissions('/admin/staff');
  const [staff, setStaff] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [departmentFilter, setDepartmentFilter] = useState<string>(filters?.department || 'all');
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>(filters?.status);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Staff roles that should be shown in this list
  const staffRoles: string[] = ['donum_staff', 'donum_admin', 'donum_super_admin'];

  const loadDepartments = useCallback(async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('[StaffList] Error loading departments:', err);
    }
  }, []);

  const loadStaff = useCallback(async () => {
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
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
      };
      
      const allUsers = await getUsers(currentFilters);
      
      // Filter to only staff roles
      const staffUsers = allUsers.filter(user => staffRoles.includes(user.role));
      
      setStaff(staffUsers);
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[StaffList] Error loading staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, departmentFilter, statusFilter, onFiltersChange]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (!authLoading && session) {
      loadStaff();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view staff');
      setLoading(false);
    }
  }, [authLoading, session, loadStaff]);

  function handleManageDepartments(staffMember: User) {
    setSelectedStaffId(staffMember.id);
  }

  function handleCloseDepartmentAssignment() {
    setSelectedStaffId(null);
    // Reload staff to refresh department data
    loadStaff();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  }

  // Real-time search filtering with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  function handleDepartmentFilterChange(value: string) {
    setDepartmentFilter(value);
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
    setDepartmentFilter('all');
    setStatusFilter(undefined);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filters Skeleton */}
        <div className="bg-[var(--surface)] rounded-lg p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Skeleton height="2.5rem" width="100%" className="max-w-md" />
            <Skeleton height="2.5rem" width="10rem" />
            <Skeleton height="2.5rem" width="12rem" />
            <Skeleton height="2.5rem" width="8rem" />
            <Skeleton height="2.5rem" width="8rem" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="8rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="10rem" />
                </th>
                <th className="text-right p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton height="2rem" width="2rem" variant="circular" />
                      <Skeleton height="1rem" width="12rem" />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton height="1rem" width="16rem" />
                  </td>
                  <td className="p-4">
                    <Skeleton height="1.25rem" width="8rem" />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      <Skeleton height="1.25rem" width="6rem" />
                      <Skeleton height="1.25rem" width="6rem" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                id="staff-search"
                name="staff-search"
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
            id="staff-status-filter"
            name="staff-status-filter"
            value={statusFilter || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
              { value: 'suspended', label: 'Suspended' }
            ]}
            className="w-40"
          />

          {/* Department Filter */}
          <Select
            id="staff-department-filter"
            name="staff-department-filter"
            value={departmentFilter}
            onChange={(e) => handleDepartmentFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map(dept => ({
                value: dept.name,
                label: dept.name
              }))
            ]}
            className="w-48"
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
            onClick={loadStaff}
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

      {/* Staff Table */}
      {staff.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || departmentFilter !== 'all' || statusFilter
              ? 'No staff found matching your filters.'
              : 'No staff found. Staff members will appear here once created.'}
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
                {canEdit('/admin/staff') && (
                  <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {staff.map((staffMember) => {
                const name = staffMember.first_name || staffMember.last_name
                  ? `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim()
                  : 'No name';
                
                  return (
                    <tr 
                      key={staffMember.id} 
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                      onClick={() => router.push(`/admin/staff/${staffMember.id}`)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-primary)]">{name}</div>
                      </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">{staffMember.email}</td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {USER_ROLES.find(r => r.value === staffMember.role)?.label || staffMember.role}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center text-xs font-medium ${
                        staffMember.status === 'active'
                          ? 'text-green-600 dark:text-green-400'
                          : staffMember.status === 'inactive'
                          ? 'text-gray-600 dark:text-gray-400'
                          : staffMember.status === 'suspended'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {staffMember.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4">
                      {staffMember.departments && staffMember.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {staffMember.departments.map((deptName) => {
                            const dept = departments.find(d => d.name === deptName);
                            const deptColor = dept?.color || '#6B7280'; // Default gray if not found
                            return (
                              <span
                                key={deptName}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: deptColor + '20',
                                  color: deptColor
                                }}
                              >
                                {deptName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[var(--text-secondary)] text-sm">-</span>
                      )}
                    </td>
                    {canEdit('/admin/staff') && (
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleManageDepartments(staffMember)}
                            className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                          >
                            Manage Departments
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

      {/* Department Assignment Modal - Show when managing a staff member's departments */}
      {selectedStaffId && (() => {
        const selectedStaffMember = staff.find(s => s.id === selectedStaffId);
        return selectedStaffMember ? (
          <StaffDepartmentAssignment
            staff={selectedStaffMember}
            onClose={handleCloseDepartmentAssignment}
            onUpdate={loadStaff}
          />
        ) : null;
      })()}
    </div>
  );
}
