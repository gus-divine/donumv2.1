'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  getApplications, 
  type Application, 
  deleteApplication, 
  type ApplicationFilters,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS
} from '@/lib/api/applications';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Select } from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { getDepartments } from '@/lib/api/departments';
import type { Department } from '@/lib/api/departments';
import { getUsers, type User } from '@/lib/api/users';
import { approveApplication, rejectApplication } from '@/lib/api/applications';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApplicationListProps {
  onEdit: (application: Application) => void;
  filters?: ApplicationFilters;
  onFiltersChange?: (filters: ApplicationFilters) => void;
}

export function ApplicationList({ onEdit, filters, onFiltersChange }: ApplicationListProps) {
  const { session, loading: authLoading } = useAuth();
  const { canEdit, canDelete } = usePermissions('/admin/applications');
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [displayApplications, setDisplayApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; applicationNumber: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.search || '');
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [statusFilter, setStatusFilter] = useState<ApplicationFilters['status']>(filters?.status);
  const [departmentFilter, setDepartmentFilter] = useState<string>(filters?.assigned_departments?.[0] || 'all');
  const [staffFilter, setStaffFilter] = useState<string>(filters?.primary_staff_id || 'all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [expandedApplicants, setExpandedApplicants] = useState<Set<string>>(new Set());
  const [applicantAppCounts, setApplicantAppCounts] = useState<Record<string, number>>({});
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  
  // Sorting state
  type SortField = 'application_number' | 'applicant' | 'status' | 'requested_amount' | 'submitted_at';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadApplications = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const currentFilters: ApplicationFilters = {
        search: searchTerm || undefined,
        status: statusFilter,
        assigned_departments: departmentFilter && departmentFilter !== 'all' ? [departmentFilter] : undefined,
        assigned_staff: filters?.assigned_staff,
        primary_staff_id: staffFilter && staffFilter !== 'all' ? staffFilter : filters?.primary_staff_id,
        applicant_id: filters?.applicant_id, // Include applicant_id filter from props
      };
      
      const data = await getApplications(currentFilters);
      
      // Store all applications
      setAllApplications(data);
      
      // Calculate counts per applicant
      const counts: Record<string, number> = {};
      data.forEach(app => {
        const applicantId = app.applicant_id;
        if (applicantId) {
          counts[applicantId] = (counts[applicantId] || 0) + 1;
        }
      });
      setApplicantAppCounts(counts);
      
      // If filtering by specific applicant_id, show all applications
      // Otherwise, group by applicant and show only latest per applicant
      if (currentFilters.applicant_id) {
        setDisplayApplications(data);
      } else {
        // Group by applicant_id and get latest application per applicant
        const groupedByApplicant = new Map<string, Application[]>();
        data.forEach(app => {
          const applicantId = app.applicant_id;
          if (!applicantId) return;
          if (!groupedByApplicant.has(applicantId)) {
            groupedByApplicant.set(applicantId, []);
          }
          groupedByApplicant.get(applicantId)!.push(app);
        });

        // Sort applications within each group by created_at (newest first)
        groupedByApplicant.forEach((apps, applicantId) => {
          apps.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Newest first
          });
        });

        // Build display list: latest per applicant + expanded applicants' all apps
        const displayApps: Application[] = [];
        groupedByApplicant.forEach((apps, applicantId) => {
          if (expandedApplicants.has(applicantId)) {
            // Show all applications for expanded applicants
            displayApps.push(...apps);
          } else {
            // Show only latest application
            displayApps.push(apps[0]);
          }
        });

        // Apply sorting
        displayApps.sort((a, b) => {
          let comparison = 0;
          
          switch (sortField) {
            case 'application_number':
              comparison = a.application_number.localeCompare(b.application_number);
              break;
            case 'applicant':
              const aName = a.applicant?.name || a.applicant?.first_name || a.applicant?.email || '';
              const bName = b.applicant?.name || b.applicant?.first_name || b.applicant?.email || '';
              comparison = aName.localeCompare(bName);
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
            case 'requested_amount':
              const aAmount = a.requested_amount || 0;
              const bAmount = b.requested_amount || 0;
              comparison = aAmount - bAmount;
              break;
            case 'submitted_at':
            default:
              const dateA = new Date(a.submitted_at || a.created_at).getTime();
              const dateB = new Date(b.submitted_at || b.created_at).getTime();
              comparison = dateA - dateB;
              break;
          }
          
          return sortDirection === 'asc' ? comparison : -comparison;
        });

        setDisplayApplications(displayApps);
      }
      
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
    } catch (err) {
      console.error('[ApplicationList] Error loading applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, statusFilter, departmentFilter, filters?.assigned_staff, filters?.primary_staff_id, filters?.applicant_id, expandedApplicants, onFiltersChange]);

  useEffect(() => {
    if (!authLoading && session) {
      loadDepartments();
      loadApplications();
    } else if (!authLoading && !session) {
      setError('You must be authenticated to view applications');
      setLoading(false);
    }
  }, [authLoading, session, loadApplications]);

  // Update display when expansion state changes (without reloading from API)
  useEffect(() => {
    if (filters?.applicant_id || allApplications.length === 0) {
      return; // Don't recalculate if filtering by applicant or no data
    }

    // Group by applicant_id
    const groupedByApplicant = new Map<string, Application[]>();
    allApplications.forEach(app => {
      const applicantId = app.applicant_id;
      if (!applicantId) return;
      if (!groupedByApplicant.has(applicantId)) {
        groupedByApplicant.set(applicantId, []);
      }
      groupedByApplicant.get(applicantId)!.push(app);
    });

    // Sort applications within each group by created_at (newest first)
    groupedByApplicant.forEach((apps) => {
      apps.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    });

    // Build display list: latest per applicant + expanded applicants' all apps
    const displayApps: Application[] = [];
    groupedByApplicant.forEach((apps, applicantId) => {
      if (expandedApplicants.has(applicantId)) {
        displayApps.push(...apps);
      } else {
        displayApps.push(apps[0]);
      }
    });

    // Apply sorting
    displayApps.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'application_number':
          comparison = a.application_number.localeCompare(b.application_number);
          break;
        case 'applicant':
          const aName = a.applicant?.name || a.applicant?.first_name || a.applicant?.email || '';
          const bName = b.applicant?.name || b.applicant?.first_name || b.applicant?.email || '';
          comparison = aName.localeCompare(bName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'requested_amount':
          const aAmount = a.requested_amount || 0;
          const bAmount = b.requested_amount || 0;
          comparison = aAmount - bAmount;
          break;
        case 'submitted_at':
        default:
          const dateA = new Date(a.submitted_at || a.created_at).getTime();
          const dateB = new Date(b.submitted_at || b.created_at).getTime();
          comparison = dateA - dateB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setDisplayApplications(displayApps);
  }, [expandedApplicants, allApplications, filters?.applicant_id, sortField, sortDirection]);

  const loadDepartments = useCallback(async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('[ApplicationList] Error loading departments:', err);
      setDepartments([]);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const allUsers = await getUsers();
      // Filter to only staff roles
      const staffRoles = ['donum_staff', 'donum_admin', 'donum_super_admin'];
      const staffUsers = allUsers.filter(user => staffRoles.includes(user.role));
      setStaff(staffUsers);
    } catch (err) {
      console.error('[ApplicationList] Error loading staff:', err);
      setStaff([]);
    }
  }, []);

  function handleDeleteClick(id: string, applicationNumber: string) {
    setDeleteTarget({ id, applicationNumber });
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setShowDeleteConfirm(false);
    try {
      setDeletingId(deleteTarget.id);
      await deleteApplication(deleteTarget.id);
      await loadApplications();
      setDeleteTarget(null);
    } catch (err) {
      console.error('[ApplicationList] Error deleting application:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete application');
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

  function handleStatusFilterChange(value: string) {
    if (value === 'all') {
      setStatusFilter(undefined);
    } else {
      setStatusFilter(value as ApplicationFilters['status']);
    }
  }

  function handleDepartmentFilterChange(value: string) {
    setDepartmentFilter(value);
  }

  function handleStaffFilterChange(value: string) {
    setStaffFilter(value);
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter(undefined);
    setDepartmentFilter('all');
    setStaffFilter('all');
    setExpandedApplicants(new Set());
  }

  async function handleQuickApprove(applicationId: string) {
    if (!canEdit('/admin/applications')) {
      setErrorMessage('You do not have permission to approve applications');
      return;
    }

    setProcessingAppId(applicationId);
    setError(null);
    try {
      await approveApplication(applicationId);
      await loadApplications();
    } catch (err) {
      console.error('[ApplicationList] Error approving application:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve application');
    } finally {
      setProcessingAppId(null);
    }
  }

  async function handleQuickReject(applicationId: string) {
    if (!canEdit('/admin/applications')) {
      setErrorMessage('You do not have permission to reject applications');
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || !reason.trim()) {
      return;
    }

    setProcessingAppId(applicationId);
    setError(null);
    try {
      await rejectApplication(applicationId, reason.trim());
      await loadApplications();
    } catch (err) {
      console.error('[ApplicationList] Error rejecting application:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setProcessingAppId(null);
    }
  }

  function toggleApplicantExpansion(applicantId: string) {
    setExpandedApplicants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicantId)) {
        newSet.delete(applicantId);
      } else {
        newSet.add(applicantId);
      }
      return newSet;
    });
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  }

  // Pagination calculations
  const totalPages = Math.ceil(displayApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = displayApplications.slice(startIndex, endIndex);

  function formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getStatusColor(status: string): string {
    const color = APPLICATION_STATUS_COLORS[status as keyof typeof APPLICATION_STATUS_COLORS] || 'gray';
    const colorMap: Record<string, string> = {
      gray: 'text-gray-600 dark:text-gray-400',
      blue: 'text-blue-600 dark:text-blue-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      orange: 'text-orange-600 dark:text-orange-400',
      green: 'text-green-600 dark:text-green-400',
      red: 'text-red-600 dark:text-red-400',
    };
    return colorMap[color] || colorMap.gray;
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">
          {authLoading ? 'Authenticating...' : 'Loading applications...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={loadApplications}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Applicant Filter Banner */}
      {filters?.applicant_id && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm text-blue-800 dark:text-blue-300">
                Showing applications for selected prospect
              </span>
            </div>
            <button
              onClick={() => {
                if (onFiltersChange) {
                  const newFilters: ApplicationFilters = { ...filters };
                  delete newFilters.applicant_id;
                  onFiltersChange(newFilters);
                }
                setSearchTerm('');
                setLocalSearchTerm('');
                // Also clear URL param
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('applicant_id');
                  window.history.replaceState({}, '', url.toString());
                }
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--surface)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                id="application-search"
                name="application-search"
                type="text"
                placeholder="Search applications by number or applicant name..."
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
            id="application-status-filter"
            name="application-status-filter"
            value={statusFilter || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...APPLICATION_STATUSES.map(status => ({
                value: status.value,
                label: status.label
              }))
            ]}
            className="w-40"
          />

          {/* Department Filter */}
          <Select
            id="application-department-filter"
            name="application-department-filter"
            value={departmentFilter}
            onChange={(e) => handleDepartmentFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map(dept => ({
                value: dept.name,
                label: dept.name
              }))
            ]}
            className="w-40"
          />

          {/* Staff Filter */}
          <Select
            id="application-staff-filter"
            name="application-staff-filter"
            value={staffFilter}
            onChange={(e) => handleStaffFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Staff' },
              ...staff.map(s => ({
                value: s.id,
                label: s.name || s.first_name || s.email
              }))
            ]}
            className="w-48"
          />

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
          >
            Clear Filters
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadApplications}
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

      {/* Applications Table */}
      {displayApplications.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || statusFilter || (departmentFilter && departmentFilter !== 'all') || (staffFilter && staffFilter !== 'all')
              ? 'No applications found matching your filters.'
              : 'No applications found. Applications will appear here once created.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th 
                  className="text-left p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] select-none"
                  onClick={() => handleSort('application_number')}
                >
                  <div className="flex items-center gap-2">
                    Application #
                    {sortField === 'application_number' && (
                      <span className="text-[var(--text-secondary)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] select-none"
                  onClick={() => handleSort('applicant')}
                >
                  <div className="flex items-center gap-2">
                    Applicant
                    {sortField === 'applicant' && (
                      <span className="text-[var(--text-secondary)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortField === 'status' && (
                      <span className="text-[var(--text-secondary)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] select-none"
                  onClick={() => handleSort('requested_amount')}
                >
                  <div className="flex items-center gap-2">
                    Requested Amount
                    {sortField === 'requested_amount' && (
                      <span className="text-[var(--text-secondary)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Departments</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Primary Staff</th>
                <th 
                  className="text-left p-4 text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] select-none"
                  onClick={() => handleSort('submitted_at')}
                >
                  <div className="flex items-center gap-2">
                    Submitted
                    {sortField === 'submitted_at' && (
                      <span className="text-[var(--text-secondary)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApplications.map((application, index) => {
                const applicantId = application.applicant_id;
                const appCount = applicantId ? applicantAppCounts[applicantId] || 1 : 1;
                const isExpanded = applicantId ? expandedApplicants.has(applicantId) : false;
                const hasMoreApps = !filters?.applicant_id && applicantId && appCount > 1 && !isExpanded;
                
                // Determine if this is part of an expanded group (not the first one in the group)
                // Check if previous application in the list has the same applicant_id
                const prevApp = index > 0 ? paginatedApplications[index - 1] : null;
                const isFirstInGroup = !prevApp || prevApp.applicant_id !== applicantId;
                const isGroupedApp = isExpanded && applicantId && !isFirstInGroup;

                return (
                  <tr 
                    key={application.id} 
                    className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] ${
                      isGroupedApp 
                        ? 'bg-[var(--surface)]/50 border-l-4 border-l-[var(--core-blue)]' 
                        : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${isGroupedApp ? 'pl-6' : ''}`}>
                        {hasMoreApps && (
                          <button
                            onClick={() => applicantId && toggleApplicantExpansion(applicantId)}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title={`Show all ${appCount} applications for this applicant`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        {isExpanded && applicantId && isFirstInGroup && (
                          <button
                            onClick={() => toggleApplicantExpansion(applicantId)}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Show only latest application"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        {isGroupedApp && (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <div className="w-0.5 h-4 bg-[var(--core-blue)]"></div>
                          </div>
                        )}
                        <button
                          onClick={() => onEdit(application)}
                          className={`font-mono text-sm text-[var(--core-blue)] hover:text-[var(--core-blue-light)] hover:underline transition-colors ${
                            isGroupedApp ? 'text-[var(--text-secondary)]' : ''
                          }`}
                        >
                          {application.application_number}
                        </button>
                        {hasMoreApps && (
                          <span className="text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-lg">
                            +{appCount - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {application.applicant?.name || application.applicant?.first_name || application.applicant?.email || 'Unknown'}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {application.applicant?.email}
                        </div>
                      </div>
                    </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(application.status)}`}>
                      {APPLICATION_STATUSES.find(s => s.value === application.status)?.label || application.status}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {formatCurrency(application.requested_amount)}
                  </td>
                  <td className="p-4">
                    {application.assigned_departments && application.assigned_departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {application.assigned_departments.slice(0, 2).map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                          >
                            {dept}
                          </span>
                        ))}
                        {application.assigned_departments.length > 2 && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            +{application.assigned_departments.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--text-secondary)]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {application.primary_staff?.name || application.primary_staff?.first_name || '-'}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {formatDate(application.submitted_at)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Actions for Pending Applications */}
                      {canEdit('/admin/applications') && application.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleQuickApprove(application.id)}
                            disabled={processingAppId === application.id}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Approve Application"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickReject(application.id)}
                            disabled={processingAppId === application.id}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reject Application"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {canEdit('/admin/applications') && (
                        <button
                          onClick={() => onEdit(application)}
                          className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg"
                        >
                          View
                        </button>
                      )}
                      {canDelete('/admin/applications') && (
                        <button
                          onClick={() => handleDeleteClick(application.id, application.application_number)}
                          disabled={deletingId === application.id}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {deletingId === application.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                      {!canEdit('/admin/applications') && !canDelete('/admin/applications') && (
                        <span className="text-xs text-[var(--text-secondary)]">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {displayApplications.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">
              Showing {startIndex + 1} to {Math.min(endIndex, displayApplications.length)} of {displayApplications.length} applications
            </span>
            <Select
              id="items-per-page"
              name="items-per-page"
              value={itemsPerPage.toString()}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: '10', label: '10 per page' },
                { value: '25', label: '25 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
              ]}
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg border border-[var(--border)] transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[var(--core-blue)] text-white border-[var(--core-blue)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Application"
          message={`Are you sure you want to delete application "${deleteTarget.applicationNumber}"? This action cannot be undone.`}
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
