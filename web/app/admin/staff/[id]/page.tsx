'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { getUser, getUsers, updateUser, type User, type UpdateUserInput } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { getStaffProspectAssignments, type ProspectStaffAssignment } from '@/lib/api/prospect-staff-assignments';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES } from '@/lib/api/users';
import { Select } from '@/components/ui/select';

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

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;
  const { canEdit } = usePermissions('/admin/staff');
  const [staff, setStaff] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>('');
  const [newAssignmentStaffId, setNewAssignmentStaffId] = useState<string>('');
  const [newAssignmentNotes, setNewAssignmentNotes] = useState<string>('');
  const [loadingStaffData, setLoadingStaffData] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [staffAssignments, setStaffAssignments] = useState<ProspectStaffAssignment[]>([]);
  const [assignedProspects, setAssignedProspects] = useState<User[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<User[]>([]);

  async function loadStaffData() {
    if (!staffId) return;
    
    try {
      setLoadingStaffData(true);
      const deptsData = await getDepartments();
      setDepartments(deptsData);
    } catch (err) {
      console.error('[StaffDetailPage] Error loading staff data:', err);
    } finally {
      setLoadingStaffData(false);
    }
  }

  useEffect(() => {
    if (!staffId) {
      setError('Staff ID is required');
      setLoading(false);
      return;
    }

    async function loadStaff() {
      try {
        setLoading(true);
        setError(null);
        
        const [staffData, assignmentsData] = await Promise.all([
          getUser(staffId),
          getStaffProspectAssignments(staffId).catch(() => [])
        ]);
        
        if (!staffData) {
          setError('Staff member not found');
        } else {
          // Check if it's a staff role
          const staffRoles = ['donum_staff', 'donum_admin', 'donum_super_admin'];
          if (!staffRoles.includes(staffData.role)) {
            setError('This user is not a staff member');
          } else {
            setStaff(staffData);
            setStaffAssignments(assignmentsData);
            
            // Load prospect and member details
            if (assignmentsData.length > 0) {
              const prospectIds = assignmentsData.map(a => a.prospect_id);
              const allUsers = await getUsers();
              const assignedUsers = allUsers.filter(u => prospectIds.includes(u.id));
              
              setAssignedProspects(assignedUsers.filter(u => u.role === 'donum_prospect' || u.role === 'donum_lead'));
              setAssignedMembers(assignedUsers.filter(u => u.role === 'donum_member'));
            }
          }
        }
      } catch (err) {
        console.error('[StaffDetailPage] Error loading staff:', err);
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
    loadStaffData();
  }, [staffId]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/staff');
    }
  }

  async function handleAddDepartment() {
    if (!selectedAssignmentDepartment || !staff) return;
    
    try {
      setUpdating(true);
      const currentDepartments = staff.departments || [];
      if (!currentDepartments.includes(selectedAssignmentDepartment)) {
        const updatedDepartments = [...currentDepartments, selectedAssignmentDepartment];
        const input: UpdateUserInput = {
          departments: updatedDepartments
        };
        const updated = await updateUser(staff.id, input);
        setStaff(updated);
        setSelectedAssignmentDepartment('');
        setNewAssignmentNotes('');
      }
    } catch (err) {
      console.error('[StaffDetailPage] Error adding department:', err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleRemoveDepartment(deptName: string) {
    if (!staff) return;
    
    try {
      setUpdating(true);
      const currentDepartments = staff.departments || [];
      const updatedDepartments = currentDepartments.filter(d => d !== deptName);
      const input: UpdateUserInput = {
        departments: updatedDepartments
      };
      const updated = await updateUser(staff.id, input);
      setStaff(updated);
    } catch (err) {
      console.error('[StaffDetailPage] Error removing department:', err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading staff details...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !staff) {
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
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Staff member not found'}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const staffName = staff.first_name || staff.last_name
    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
    : staff.email;

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
                {staffName}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Staff member profile and department assignments.
              </p>
            </div>
          </div>

          {/* Staff Information */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Email</span>
                <p className="text-[var(--text-primary)]">{staff.email}</p>
              </div>
              {staff.phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Phone</span>
                  <p className="text-[var(--text-primary)]">{staff.phone}</p>
                </div>
              )}
              {staff.cell_phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cell Phone</span>
                  <p className="text-[var(--text-primary)]">{staff.cell_phone}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Role</span>
                <p className="text-[var(--text-primary)]">
                  {USER_ROLES.find(r => r.value === staff.role)?.label || staff.role}
                </p>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                <span className={`inline-flex items-center text-xs font-medium ${
                  staff.status === 'active'
                    ? 'text-green-600 dark:text-green-400'
                    : staff.status === 'inactive'
                    ? 'text-gray-600 dark:text-gray-400'
                    : staff.status === 'suspended'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {staff.status || 'active'}
                </span>
              </div>
              {staff.timezone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Timezone</span>
                  <p className="text-[var(--text-primary)]">{staff.timezone}</p>
                </div>
              )}
              {staff.language && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Language</span>
                  <p className="text-[var(--text-primary)]">{staff.language}</p>
                </div>
              )}
            </div>

            {(staff.address_line_1 || staff.city || staff.state) && (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Address</h4>
                <div className="space-y-1 text-[var(--text-secondary)] text-sm">
                  {staff.address_line_1 && <p>{staff.address_line_1}</p>}
                  {staff.address_line_2 && <p>{staff.address_line_2}</p>}
                  {(staff.city || staff.state || staff.zip_code) && (
                    <p>
                      {[staff.city, staff.state, staff.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Department Assignments */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Departments</h3>
              {canEdit('/admin/staff') && !isAddingAssignment && (
                <button
                  onClick={() => {
                    setIsAddingAssignment(true);
                    loadStaffData();
                  }}
                  className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                >
                  Add Department
                </button>
              )}
            </div>

            {/* Current Departments */}
            {staff.departments && staff.departments.length > 0 && (
              <div className="space-y-3">
                {staff.departments.map((deptName) => {
                  const dept = departments.find(d => d.name === deptName);
                  const deptColor = dept?.color || '#6B7280';
                  
                  return (
                    <div
                      key={deptName}
                      className="flex items-start justify-between py-3 border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="flex-1">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: deptColor + '20',
                            color: deptColor
                          }}
                        >
                          {deptName}
                        </span>
                      </div>
                      {canEdit('/admin/staff') && (
                        <button
                          onClick={() => handleRemoveDepartment(deptName)}
                          disabled={updating}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(!staff.departments || staff.departments.length === 0) && !isAddingAssignment && (
              <p className="text-sm text-[var(--text-secondary)]">No departments assigned.</p>
            )}

            {/* Add Department Form */}
            {isAddingAssignment && (
              <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border)]">
                {loadingStaffData ? (
                  <p className="text-sm text-[var(--text-secondary)]">Loading departments...</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Select departments to assign
                    </p>
                    {departments.filter(dept => dept.is_active).length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)] italic">
                        No departments available. Create departments in the Departments page first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {departments
                          .filter(dept => dept.is_active)
                          .map((dept) => {
                            const isAssigned = staff.departments?.includes(dept.name);
                            const deptColor = dept.color || '#6B7280';
                            
                            return (
                              <label
                                key={dept.id}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                                  isAssigned
                                    ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
                                    : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedAssignmentDepartment === dept.name}
                                  onChange={() => {
                                    setSelectedAssignmentDepartment(
                                      selectedAssignmentDepartment === dept.name ? '' : dept.name
                                    );
                                  }}
                                  disabled={isAssigned}
                                  className="rounded border-[var(--border)] text-[var(--core-blue)] focus:ring-[var(--core-blue)] disabled:opacity-50"
                                />
                                <span 
                                  className="text-sm font-medium"
                                  style={{ color: isAssigned ? undefined : deptColor }}
                                >
                                  {dept.name}
                                  {isAssigned && ' (already assigned)'}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleAddDepartment}
                        disabled={!selectedAssignmentDepartment || updating}
                        className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? 'Adding...' : 'Add Department'}
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingAssignment(false);
                          setSelectedAssignmentDepartment('');
                          setNewAssignmentNotes('');
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Prospects Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Assigned Prospects</h3>
              {assignedProspects.length > 0 && (
                <button
                  onClick={() => router.push('/admin/prospects')}
                  className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                >
                  View All ({assignedProspects.length})
                </button>
              )}
            </div>

            {assignedProspects.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No prospects assigned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Email</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedProspects.slice(0, 5).map((prospect) => {
                      const assignment = staffAssignments.find(a => a.prospect_id === prospect.id);
                      const prospectName = prospect.first_name || prospect.last_name
                        ? `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()
                        : 'No name';
                      
                      return (
                        <tr
                          key={prospect.id}
                          className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                          onClick={() => router.push(`/admin/prospects/${prospect.id}`)}
                        >
                          <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                            {prospectName}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            {prospect.email}
                          </td>
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
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            {assignment ? formatDate(assignment.assigned_at) : '-'}
                            {assignment?.is_primary && (
                              <span className="ml-2 text-xs text-[var(--core-blue)]">(Primary)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {assignedProspects.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push('/admin/prospects')}
                      className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                    >
                      View {assignedProspects.length - 5} more prospects...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Assigned Members</h3>
              {assignedMembers.length > 0 && (
                <button
                  onClick={() => router.push(`/admin/members?staff_id=${staffId}`)}
                  className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                >
                  View All ({assignedMembers.length})
                </button>
              )}
            </div>

            {assignedMembers.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No members assigned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Email</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedMembers.slice(0, 5).map((member) => {
                      const assignment = staffAssignments.find(a => a.prospect_id === member.id);
                      const memberName = member.first_name || member.last_name
                        ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                        : 'No name';
                      
                      return (
                        <tr
                          key={member.id}
                          className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                          onClick={() => router.push(`/admin/members/${member.id}`)}
                        >
                          <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                            {memberName}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            {member.email}
                          </td>
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
                          <td className="p-4 text-sm text-[var(--text-secondary)]">
                            {assignment ? formatDate(assignment.assigned_at) : '-'}
                            {assignment?.is_primary && (
                              <span className="ml-2 text-xs text-[var(--core-blue)]">(Primary)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {assignedMembers.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push('/admin/members')}
                      className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                    >
                      View {assignedMembers.length - 5} more members...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Information */}
          {(staff.notes || staff.created_at || staff.last_login_at) && (
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {staff.notes && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Notes</span>
                    <p className="text-[var(--text-primary)] whitespace-pre-wrap">{staff.notes}</p>
                  </div>
                )}
                {staff.created_at && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Created</span>
                    <p className="text-[var(--text-primary)]">{formatDate(staff.created_at)}</p>
                  </div>
                )}
                {staff.last_login_at && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Last Login</span>
                    <p className="text-[var(--text-primary)]">{formatDate(staff.last_login_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </PermissionGuard>
  );
}
