'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { getUser, getUsers, type User } from '@/lib/api/users';
import { getApplications, type Application } from '@/lib/api/applications';
import { getLoans, type Loan } from '@/lib/api/loans';
import { getProspectStaffAssignments, assignStaffToProspect, unassignStaffFromProspect } from '@/lib/api/prospect-staff-assignments';
import { getDepartments, type Department } from '@/lib/api/departments';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES } from '@/lib/api/users';
import { APPLICATION_STATUSES, APPLICATION_STATUS_COLORS } from '@/lib/api/applications';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// Format date helper
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return '-';
  }
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;
  const { canEdit } = usePermissions('/admin/members');
  const [member, setMember] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<any[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>('');
  const [newAssignmentStaffId, setNewAssignmentStaffId] = useState<string>('');
  const [newAssignmentNotes, setNewAssignmentNotes] = useState<string>('');
  const [loadingStaffData, setLoadingStaffData] = useState(false);
  const [showRemoveStaffConfirm, setShowRemoveStaffConfirm] = useState(false);
  const [removeStaffTarget, setRemoveStaffTarget] = useState<{ staffId: string; staffName: string } | null>(null);

  async function loadStaffData() {
    if (!memberId) return;
    
    try {
      setLoadingStaffData(true);
      const [deptsData, allUsers] = await Promise.all([
        getDepartments(),
        getUsers() // Get all users, then filter for staff roles
      ]);
      
      setDepartments(deptsData);
      // Load all staff (including admins and super admins) - we'll filter by selected department in the dropdown
      const staffUsers = allUsers.filter(user => 
        user.role === 'donum_staff' || 
        user.role === 'donum_admin' || 
        user.role === 'donum_super_admin'
      );
      setStaff(staffUsers);
    } catch (err) {
      console.error('[MemberDetailPage] Error loading staff data:', err);
    } finally {
      setLoadingStaffData(false);
    }
  }

  useEffect(() => {
    if (!memberId) {
      setError('Member ID is required');
      setLoading(false);
      return;
    }

    async function loadMember() {
      try {
        setLoading(true);
        setError(null);
        
        const [memberData, applicationsData, loansData, assignmentsData] = await Promise.all([
          getUser(memberId),
          getApplications({ applicant_id: memberId }),
          getLoans({ applicant_id: memberId }).catch(() => []),
          getProspectStaffAssignments(memberId).catch(() => [])
        ]);

        if (!memberData) {
          setError('Member not found');
        } else {
          setMember(memberData);
          setApplications(applicationsData);
          setLoans(loansData);
          setStaffAssignments(assignmentsData);
        }
      } catch (err) {
        console.error('[MemberDetailPage] Error loading member:', err);
        setError(err instanceof Error ? err.message : 'Failed to load member');
      } finally {
        setLoading(false);
      }
    }

    loadMember();
    // Also load staff data on initial page load so staff names can be displayed
    loadStaffData();
  }, [memberId]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/members');
    }
  }

  function handleViewApplication(application: Application) {
    router.push(`/admin/applications/${application.id}`);
  }

  function handleViewAllApplications() {
    router.push(`/admin/applications?applicant_id=${memberId}`);
  }

  function handleViewLoan(loan: Loan) {
    router.push(`/admin/loans/${loan.id}`);
  }

  function handleViewAllLoans() {
    router.push(`/admin/loans?applicant_id=${memberId}`);
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  async function handleAddStaffAssignment() {
    if (!newAssignmentStaffId || !memberId) return;
    
    try {
      setLoadingStaffData(true);
      await assignStaffToProspect({
        prospect_id: memberId,
        staff_id: newAssignmentStaffId,
        assignment_notes: newAssignmentNotes || undefined,
      });
      
      // Reload assignments
      const assignments = await getProspectStaffAssignments(memberId);
      setStaffAssignments(assignments);
      
      // Reset form
      setIsAddingAssignment(false);
      setSelectedAssignmentDepartment('');
      setNewAssignmentStaffId('');
      setNewAssignmentNotes('');
    } catch (err) {
      console.error('[MemberDetailPage] Error adding staff assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add staff assignment');
    } finally {
      setLoadingStaffData(false);
    }
  }

  function handleRemoveStaffAssignment(staffId: string) {
    if (!memberId) return;
    
    const assignedStaff = staff.find(s => s.id === staffId);
    const staffName = assignedStaff?.name || 
                     (assignedStaff?.first_name || assignedStaff?.last_name
                       ? `${assignedStaff.first_name || ''} ${assignedStaff.last_name || ''}`.trim()
                       : assignedStaff?.email || 'this staff member');
    
    setRemoveStaffTarget({ staffId, staffName });
    setShowRemoveStaffConfirm(true);
  }

  async function handleRemoveStaffConfirm() {
    if (!removeStaffTarget || !memberId) return;
    
    setShowRemoveStaffConfirm(false);
    try {
      setLoadingStaffData(true);
      await unassignStaffFromProspect(memberId, removeStaffTarget.staffId);
      
      // Reload assignments
      const assignments = await getProspectStaffAssignments(memberId);
      setStaffAssignments(assignments);
    } catch (err) {
      console.error('[MemberDetailPage] Error removing staff assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove staff assignment');
    } finally {
      setLoadingStaffData(false);
      setRemoveStaffTarget(null);
    }
  }

  function handleRemoveStaffCancel() {
    setShowRemoveStaffConfirm(false);
    setRemoveStaffTarget(null);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <Skeleton height="1.5rem" width="5rem" />
            </div>

            {/* Header Skeleton */}
            <div className="mb-8 flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton height="2rem" width="16rem" />
                <Skeleton height="1rem" width="30rem" />
              </div>
            </div>

            {/* Contact Information Skeleton */}
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="18rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="12rem" />
                  </div>
                ))}
              </div>
              {/* Address Subsection Skeleton */}
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <Skeleton height="1rem" width="8rem" className="mb-3" />
                <div className="space-y-2">
                  <Skeleton height="1rem" width="20rem" />
                  <Skeleton height="1rem" width="15rem" />
                </div>
              </div>
            </div>

            {/* Financial Information Skeleton */}
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="20rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="12rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Section Skeleton */}
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton height="1.5rem" width="8rem" />
                <Skeleton height="1.5rem" width="7rem" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-start justify-between py-3 border-b border-[var(--border)]">
                    <div className="flex-1 space-y-2">
                      <Skeleton height="0.875rem" width="6rem" />
                      <Skeleton height="1rem" width="12rem" />
                      <Skeleton height="0.875rem" width="10rem" />
                    </div>
                    <Skeleton height="1rem" width="5rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Loans Section Skeleton */}
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton height="1.5rem" width="8rem" />
                <div className="flex items-center gap-3">
                  <Skeleton height="1rem" width="8rem" />
                  <Skeleton height="1rem" width="7rem" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="8rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="p-4">
                          <Skeleton height="1rem" width="10rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1.5rem" width="6rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="8rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="8rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="10rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="8rem" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Applications Section Skeleton */}
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton height="1.5rem" width="12rem" />
                <div className="flex items-center gap-3">
                  <Skeleton height="1rem" width="8rem" />
                  <Skeleton height="1rem" width="12rem" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="10rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="p-4">
                          <Skeleton height="1rem" width="10rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1.5rem" width="8rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="8rem" />
                        </td>
                        <td className="p-4">
                          <Skeleton height="1rem" width="8rem" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !member) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Member Not Found</h1>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Member not found'}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const memberName = member.first_name || member.last_name
    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
    : member.email || 'Unknown';

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>

          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {memberName}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Member profile and application history.
              </p>
            </div>
          </div>

          {/* Member Information */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Email</span>
                <p className="text-[var(--text-primary)]">{member.email}</p>
              </div>
              {member.phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Phone</span>
                  <p className="text-[var(--text-primary)]">{member.phone}</p>
                </div>
              )}
              {member.cell_phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cell Phone</span>
                  <p className="text-[var(--text-primary)]">{member.cell_phone}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Role</span>
                <p className="text-[var(--text-primary)]">
                  {USER_ROLES.find(r => r.value === member.role)?.label || member.role}
                </p>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                <span className={`inline-flex items-center text-xs font-medium ${
                  member.status === 'active'
                    ? 'text-green-600 dark:text-green-400'
                    : member.status === 'inactive'
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {member.status || 'active'}
                </span>
              </div>
              {member.date_of_birth && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Date of Birth</span>
                  <p className="text-[var(--text-primary)]">{formatDate(member.date_of_birth)}</p>
                </div>
              )}
            </div>

            {(member.address_line_1 || member.city || member.state) && (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Address</h4>
                <div className="space-y-1 text-[var(--text-secondary)] text-sm">
                  {member.address_line_1 && <p>{member.address_line_1}</p>}
                  {member.address_line_2 && <p>{member.address_line_2}</p>}
                  {(member.city || member.state || member.zip_code) && (
                    <p>
                      {[member.city, member.state, member.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Financial Information */}
          {(member.annual_income || member.net_worth || member.tax_bracket || member.risk_tolerance) && (
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {member.annual_income && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Annual Income</span>
                    <p className="text-[var(--text-primary)]">{formatCurrency(member.annual_income)}</p>
                  </div>
                )}
                {member.net_worth && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Net Worth</span>
                    <p className="text-[var(--text-primary)]">{formatCurrency(member.net_worth)}</p>
                  </div>
                )}
                {member.tax_bracket && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tax Bracket</span>
                    <p className="text-[var(--text-primary)]">{member.tax_bracket}</p>
                  </div>
                )}
                {member.risk_tolerance && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Risk Tolerance</span>
                    <p className="text-[var(--text-primary)]">{member.risk_tolerance}</p>
                  </div>
                )}
                {member.marital_status && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Marital Status</span>
                    <p className="text-[var(--text-primary)]">{member.marital_status}</p>
                  </div>
                )}
                {member.dependents !== null && member.dependents !== undefined && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dependents</span>
                    <p className="text-[var(--text-primary)]">{member.dependents}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Staff Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Staff</h3>
              {canEdit('/admin/members') && !isAddingAssignment && (
                <button
                  onClick={() => {
                    setIsAddingAssignment(true);
                    loadStaffData();
                  }}
                  className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                >
                  Add Staff
                </button>
              )}
            </div>

            {/* Current Staff */}
            {staffAssignments.filter(a => a.is_active).length > 0 && (
              <div className="space-y-3">
                {staffAssignments.filter(a => a.is_active).map((assignment) => {
                  const assignedStaff = staff.find(s => s.id === assignment.staff_id);
                  const staffDept = assignedStaff?.departments?.[0] || 'Staff';
                  
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-start justify-between py-3 border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                            {staffDept}
                          </span>
                          {assignment.is_primary && (
                            <span className="text-xs text-[var(--text-secondary)]">• Primary</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                          {assignedStaff?.name || 
                           (assignedStaff?.first_name || assignedStaff?.last_name
                             ? `${assignedStaff.first_name || ''} ${assignedStaff.last_name || ''}`.trim()
                             : assignedStaff?.email || 'Unknown')}
                        </p>
                        {assignment.assigned_at && (
                          <p className="text-xs text-[var(--text-secondary)] mb-1">
                            Assigned {formatDate(assignment.assigned_at)}
                          </p>
                        )}
                        {assignment.assignment_notes && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {assignment.assignment_notes}
                          </p>
                        )}
                      </div>
                      {canEdit('/admin/members') && (
                        <button
                          onClick={() => handleRemoveStaffAssignment(assignment.staff_id)}
                          disabled={loadingStaffData}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors ml-4"
                          title="Remove staff assignment"
                        >
                          {loadingStaffData ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {staffAssignments.filter(a => a.is_active).length === 0 && !isAddingAssignment && (
              <p className="text-sm text-[var(--text-secondary)]">No staff assigned.</p>
            )}

            {/* Add Staff Form */}
            {isAddingAssignment && (
              <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="space-y-2">
                  <label htmlFor="assignment-department" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Step 1: Select Department
                  </label>
                  {loadingStaffData ? (
                    <p className="text-sm text-[var(--text-secondary)]">Loading departments...</p>
                  ) : (
                    <div className="relative">
                      <select
                        id="assignment-department"
                        value={selectedAssignmentDepartment}
                        onChange={(e) => {
                          setSelectedAssignmentDepartment(e.target.value);
                          setNewAssignmentStaffId('');
                        }}
                        className="w-full pl-3 pr-8 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-sm appearance-none"
                      >
                        <option value="">Select a department...</option>
                        {departments
                          .filter(dept => dept.is_active)
                          .map((dept) => (
                            <option key={dept.id} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedAssignmentDepartment && (
                  <div className="space-y-2">
                    <label htmlFor="assignment-staff" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Step 2: Select Staff Member
                    </label>
                    {loadingStaffData ? (
                      <p className="text-sm text-[var(--text-secondary)]">Loading staff...</p>
                    ) : (
                      <select
                        id="assignment-staff"
                        value={newAssignmentStaffId}
                        onChange={(e) => setNewAssignmentStaffId(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-sm appearance-none"
                      >
                        <option value="">Select a staff member...</option>
                        {staff
                          .filter((member) => {
                            if (member.role === 'donum_super_admin' || member.role === 'donum_admin') return true;
                            return member.departments && member.departments.includes(selectedAssignmentDepartment);
                          })
                          .filter((member) => !staffAssignments.some(a => a.staff_id === member.id && a.is_active))
                          .map((member) => {
                            const memberName = member.name || (member.first_name || member.last_name ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : member.email);
                            return (
                              <option key={member.id} value={member.id}>{memberName}</option>
                            );
                          })}
                      </select>
                    )}
                  </div>
                )}

                {selectedAssignmentDepartment && (
                  <div className="space-y-2">
                    <label htmlFor="assignment-notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="assignment-notes"
                      value={newAssignmentNotes}
                      onChange={(e) => setNewAssignmentNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                      placeholder="Add notes about this assignment..."
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAddStaffAssignment}
                    disabled={!newAssignmentStaffId || loadingStaffData}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingStaffData ? 'Adding...' : 'Add Staff'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingAssignment(false);
                      setSelectedAssignmentDepartment('');
                      setNewAssignmentStaffId('');
                      setNewAssignmentNotes('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loans Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Loans</h3>
              <div className="flex items-center gap-3">
                {loans.length > 0 && (
                  <button
                    onClick={handleViewAllLoans}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    View All ({loans.length})
                  </button>
                )}
                {canEdit('/admin/loans') && (
                  <button
                    onClick={() => router.push(`/admin/loans?applicant_id=${memberId}`)}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    Add Loan
                  </button>
                )}
              </div>
            </div>

            {loans.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No loans found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Loan Number</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Principal</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Balance</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Plan</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.slice(0, 5).map((loan) => (
                      <tr
                        key={loan.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        onClick={() => handleViewLoan(loan)}
                      >
                        <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                          {loan.loan_number}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            loan.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : loan.status === 'paid_off'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : loan.status === 'defaulted'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {loan.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">
                          {formatCurrency(loan.principal_amount)}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-primary)]">
                          {formatCurrency(loan.current_balance)}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                          {loan.plan?.name || '-'}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(loan.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loans.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleViewAllLoans}
                      className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                    >
                      View {loans.length - 5} more loans...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Applications Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Applications</h3>
              <div className="flex items-center gap-3">
                {applications.length > 0 && (
                  <button
                    onClick={handleViewAllApplications}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    View All ({applications.length})
                  </button>
                )}
                {canEdit('/admin/applications') && (
                  <button
                    onClick={() => router.push(`/admin/applications?applicant_id=${memberId}`)}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    Add Application
                  </button>
                )}
              </div>
            </div>

            {applications.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No applications found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Application ID</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Created</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((application) => (
                      <tr
                        key={application.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        onClick={() => handleViewApplication(application)}
                      >
                        <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                          {application.id.slice(0, 8)}...
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            APPLICATION_STATUS_COLORS[application.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {APPLICATION_STATUSES.find(s => s.value === application.status)?.label || application.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(application.created_at)}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(application.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {applications.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleViewAllApplications}
                      className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                    >
                      View {applications.length - 5} more applications...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Remove Staff Confirmation Dialog */}
      {removeStaffTarget && (
        <ConfirmationDialog
          isOpen={showRemoveStaffConfirm}
          title="Remove Staff Assignment"
          message={`Are you sure you want to remove ${removeStaffTarget.staffName} from this member?`}
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleRemoveStaffConfirm}
          onCancel={handleRemoveStaffCancel}
        />
      )}
    </PermissionGuard>
  );
}
