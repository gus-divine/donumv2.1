'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { getUser, getUsers, deleteUser, type User } from '@/lib/api/users';
import { getApplications, type Application } from '@/lib/api/applications';
import { getProspectStaffAssignments, assignStaffToProspect, unassignStaffFromProspect } from '@/lib/api/prospect-staff-assignments';
import { getDepartments, type Department } from '@/lib/api/departments';
import { getMemberDepartments } from '@/lib/api/department-members';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useBasePath } from '@/lib/hooks/useBasePath';
import { useAuth } from '@/lib/auth/auth-context';
import { Select } from '@/components/ui/select';
import { USER_ROLES } from '@/lib/api/users';
import { APPLICATION_STATUSES, APPLICATION_STATUS_COLORS, getApplicationTypeLabel } from '@/lib/api/applications';
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

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const basePath = useBasePath();
  const prospectId = params?.id as string;
  const { canEdit, canDelete } = usePermissions('/admin/prospects');
  const { role } = useAuth();
  const isSuperAdmin = role === 'donum_super_admin';
  const [prospect, setProspect] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
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
  const [showDeleteProspectConfirm, setShowDeleteProspectConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadStaffData() {
    if (!prospectId) return;
    
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
      console.error('[ProspectDetailPage] Error loading staff data:', err);
    } finally {
      setLoadingStaffData(false);
    }
  }

  useEffect(() => {
    if (!prospectId) {
      setError('Prospect ID is required');
      setLoading(false);
      return;
    }

    async function loadProspect() {
      try {
        setLoading(true);
        setError(null);
        
        const [prospectData, applicationsData, assignmentsData] = await Promise.all([
          getUser(prospectId),
          getApplications({ applicant_id: prospectId }),
          getProspectStaffAssignments(prospectId).catch(() => [])
        ]);

        if (!prospectData) {
          setError('Prospect not found');
        } else {
          setProspect(prospectData);
          setApplications(applicationsData);
          setStaffAssignments(assignmentsData);
        }
      } catch (err) {
        console.error('[ProspectDetailPage] Error loading prospect:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prospect');
      } finally {
        setLoading(false);
      }
    }

    loadProspect();
    // Also load staff data on initial page load so staff names can be displayed
    loadStaffData();
  }, [prospectId]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`${basePath}/prospects`);
    }
  }

  function handleViewApplication(application: Application) {
    router.push(`${basePath}/applications/${application.id}`);
  }

  function handleViewAllApplications() {
    router.push(`${basePath}/applications?applicant_id=${prospectId}`);
  }


  async function handleAddStaffAssignment() {
    if (!newAssignmentStaffId || !prospectId) return;
    
    try {
      setLoadingStaffData(true);
      await assignStaffToProspect({
        prospect_id: prospectId,
        staff_id: newAssignmentStaffId,
        assignment_notes: newAssignmentNotes || undefined,
      });
      
      // Reload assignments
      const assignments = await getProspectStaffAssignments(prospectId);
      setStaffAssignments(assignments);
      
      // Reset form
      setIsAddingAssignment(false);
      setSelectedAssignmentDepartment('');
      setNewAssignmentStaffId('');
      setNewAssignmentNotes('');
    } catch (err) {
      console.error('[ProspectDetailPage] Error adding staff assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add staff assignment');
    } finally {
      setLoadingStaffData(false);
    }
  }

  function handleRemoveStaffAssignment(staffId: string) {
    if (!prospectId) return;
    
    const assignedStaff = staff.find(s => s.id === staffId);
    const staffName = assignedStaff?.name || assignedStaff?.first_name || assignedStaff?.email || 'this staff member';
    
    setRemoveStaffTarget({ staffId, staffName });
    setShowRemoveStaffConfirm(true);
  }

  async function handleRemoveStaffConfirm() {
    if (!removeStaffTarget || !prospectId) return;
    
    setShowRemoveStaffConfirm(false);
    try {
      setLoadingStaffData(true);
      await unassignStaffFromProspect(prospectId, removeStaffTarget.staffId);
      
      // Reload assignments
      const assignments = await getProspectStaffAssignments(prospectId);
      setStaffAssignments(assignments);
    } catch (err) {
      console.error('[ProspectDetailPage] Error removing staff assignment:', err);
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

  function handleDeleteClick() {
    setShowDeleteProspectConfirm(true);
  }

  async function handleDeleteProspectConfirm() {
    if (!prospectId) return;
    setShowDeleteProspectConfirm(false);
    try {
      setDeleting(true);
      await deleteUser(prospectId);
      router.push(`${basePath}/prospects`);
    } catch (err) {
      console.error('[ProspectDetailPage] Error deleting prospect:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete prospect');
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteProspectCancel() {
    setShowDeleteProspectConfirm(false);
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
                <Skeleton height="1rem" width="20rem" />
              </div>
            </div>

            {/* Contact Information Skeleton */}
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton height="0.875rem" width="6rem" />
                    <Skeleton height="1.25rem" width="12rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Applications Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="12rem" className="mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 border border-[var(--border)] rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <Skeleton height="1.25rem" width="12rem" />
                      <Skeleton height="1.25rem" width="6rem" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton height="1rem" width="10rem" />
                      <Skeleton height="1rem" width="10rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Assignments Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="14rem" className="mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 border border-[var(--border)] rounded-lg">
                    <Skeleton height="1.25rem" width="15rem" />
                    <Skeleton height="1rem" width="12rem" className="mt-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !prospect) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back
          </button>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
            <p className="text-[var(--text-secondary)] mb-4">{error || 'Prospect not found'}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const prospectName = prospect.first_name || prospect.last_name
    ? `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()
    : prospect.email || 'Unknown';

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
                {prospectName}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Prospect profile and application history.
              </p>
            </div>
            {canDelete('/admin/prospects') && (
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Prospect'}
              </button>
            )}
          </div>

          {/* Prospect Information */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Email</span>
                <p className="text-[var(--text-primary)]">{prospect.email}</p>
              </div>
              {prospect.phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Phone</span>
                  <p className="text-[var(--text-primary)]">{prospect.phone}</p>
                </div>
              )}
              {prospect.cell_phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cell Phone</span>
                  <p className="text-[var(--text-primary)]">{prospect.cell_phone}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Role</span>
                <p className="text-[var(--text-primary)]">
                  {USER_ROLES.find(r => r.value === prospect.role)?.label || prospect.role}
                </p>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                <span className={`inline-flex items-center text-xs font-medium ${
                  prospect.status === 'active'
                    ? 'text-green-600 dark:text-green-400'
                    : prospect.status === 'inactive'
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {prospect.status || 'active'}
                </span>
              </div>
              {prospect.date_of_birth && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Date of Birth</span>
                  <p className="text-[var(--text-primary)]">{formatDate(prospect.date_of_birth)}</p>
                </div>
              )}
            </div>

            {(prospect.address_line_1 || prospect.city || prospect.state) && (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Address</h4>
                <div className="space-y-1 text-[var(--text-secondary)] text-sm">
                  {prospect.address_line_1 && <p>{prospect.address_line_1}</p>}
                  {prospect.address_line_2 && <p>{prospect.address_line_2}</p>}
                  {(prospect.city || prospect.state || prospect.zip_code) && (
                    <p>
                      {[prospect.city, prospect.state, prospect.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Staff Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Staff</h3>
              {canEdit('/admin/prospects') && !isAddingAssignment && (
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
                      {canEdit('/admin/prospects') && (
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
              <div className="mt-4 p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]" style={{ borderLeft: '4px solid var(--core-gold)' }}>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Assign staff to this prospect</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="assignment-department" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      {isSuperAdmin ? 'Department (optional)' : 'Step 1: Select Department'}
                    </label>
                    {loadingStaffData ? (
                      <p className="text-sm text-[var(--text-secondary)] py-2">Loading departments...</p>
                    ) : (
                      <Select
                        id="assignment-department"
                        value={selectedAssignmentDepartment}
                        onChange={(e) => {
                          setSelectedAssignmentDepartment(e.target.value);
                          setNewAssignmentStaffId('');
                        }}
                        options={[
                          { value: '', label: isSuperAdmin ? 'All staff' : 'Select a department...' },
                          ...departments
                            .filter(dept => dept.is_active)
                            .map((dept) => ({ value: dept.name, label: dept.name })),
                        ]}
                        className="w-full"
                      />
                    )}
                  </div>

                  {(selectedAssignmentDepartment || isSuperAdmin) && (
                    <div className="space-y-2">
                      <label htmlFor="assignment-staff" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        {isSuperAdmin && !selectedAssignmentDepartment ? 'Select Staff Member' : 'Step 2: Select Staff Member'}
                      </label>
                      {loadingStaffData ? (
                        <p className="text-sm text-[var(--text-secondary)] py-2">Loading staff...</p>
                      ) : (
                        <Select
                          id="assignment-staff"
                          value={newAssignmentStaffId}
                          onChange={(e) => setNewAssignmentStaffId(e.target.value)}
                          options={[
                            { value: '', label: 'Select a staff member...' },
                            ...staff
                              .filter((member) => {
                                if (member.role === 'donum_super_admin' || member.role === 'donum_admin') return true;
                                if (!selectedAssignmentDepartment) return true;
                                return member.departments && member.departments.includes(selectedAssignmentDepartment);
                              })
                              .filter((member) => !staffAssignments.some(a => a.staff_id === member.id && a.is_active))
                              .map((member) => {
                                const memberName = member.name || 
                                  (member.first_name || member.last_name 
                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                    : member.email);
                                const deptLabel = member.departments?.length ? ` · ${member.departments[0]}` : '';
                                return {
                                  value: member.id,
                                  label: `${memberName}${deptLabel}`,
                                };
                              }),
                          ]}
                          className="w-full"
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="assignment-notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Notes (optional)
                    </label>
                    <textarea
                      id="assignment-notes"
                      value={newAssignmentNotes}
                      onChange={(e) => setNewAssignmentNotes(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-sm"
                      rows={2}
                      placeholder="Add any notes about this assignment..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setIsAddingAssignment(false);
                        setSelectedAssignmentDepartment('');
                        setNewAssignmentStaffId('');
                        setNewAssignmentNotes('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddStaffAssignment}
                      disabled={!newAssignmentStaffId || loadingStaffData}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--core-blue)' }}
                    >
                      {loadingStaffData ? 'Adding...' : 'Add Staff'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Applications Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Applications ({applications.length})
              </h3>
              <div className="flex items-center gap-3">
                {applications.length > 0 && (
                  <button
                    onClick={handleViewAllApplications}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    View All →
                  </button>
                )}
                {canEdit('/admin/applications') && (
                  <button
                    onClick={() => router.push(`${basePath}/applications?applicant_id=${prospectId}`)}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    Add Application
                  </button>
                )}
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border)] rounded-lg">
                <p className="text-[var(--text-secondary)]">No applications found for this prospect.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Application Number</th>
                      <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Type</th>
                      <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Status</th>
                      <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Requested Amount</th>
                      <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Submitted</th>
                      <th className="text-right p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr
                        key={application.id}
                        onClick={() => handleViewApplication(application)}
                        className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <span className="font-medium text-[var(--text-primary)] font-mono text-sm">
                            {application.application_number}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] text-sm">
                          {getApplicationTypeLabel(application.application_type)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            APPLICATION_STATUS_COLORS[application.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {APPLICATION_STATUSES.find(s => s.value === application.status)?.label || application.status}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-primary)]">
                          {application.requested_amount
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(application.requested_amount)
                            : '-'}
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] text-sm">
                          {formatDate(application.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewApplication(application); }}
                              className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                            >
                              View →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          message={`Are you sure you want to remove ${removeStaffTarget.staffName} from this prospect?`}
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleRemoveStaffConfirm}
          onCancel={handleRemoveStaffCancel}
        />
      )}

      {/* Delete Prospect Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteProspectConfirm}
        title="Delete Prospect"
        message={`Are you sure you want to delete ${prospectName}? This will permanently remove their account and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteProspectConfirm}
        onCancel={handleDeleteProspectCancel}
      />
    </PermissionGuard>
  );
}
