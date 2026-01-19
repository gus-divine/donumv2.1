'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, type User } from '@/lib/api/users';
import { 
  assignStaffToProspect, 
  unassignStaffFromProspect, 
  getProspectStaffAssignments,
  updateProspectStaffAssignment,
  type ProspectStaffAssignment 
} from '@/lib/api/prospect-staff-assignments';
import { getMemberDepartments } from '@/lib/api/department-members';
import { USER_ROLES } from '@/lib/api/users';
import { AlertCircle, Building2 } from 'lucide-react';

interface ProspectStaffAssignmentProps {
  prospectId: string;
  prospectName?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ProspectStaffAssignment({ 
  prospectId, 
  prospectName,
  onClose,
  onUpdate 
}: ProspectStaffAssignmentProps) {
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [availableStaff, setAvailableStaff] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<ProspectStaffAssignment[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<Set<string>>(new Set());
  const [primaryStaffId, setPrimaryStaffId] = useState<string | null>(null);
  const [prospectDepartments, setProspectDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const loadingRef = useRef(false);

  // Staff roles that can be assigned to prospects
  const staffRoles: string[] = ['donum_super_admin', 'donum_admin', 'donum_staff'];

  const loadData = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Fetch prospect's assigned departments first
      const departments = await getMemberDepartments(prospectId);
      setProspectDepartments(departments);

      // Fetch all users and prospect staff assignments in parallel
      const [users, prospectAssignments] = await Promise.all([
        getUsers(),
        getProspectStaffAssignments(prospectId),
      ]);
      
      // Filter to only staff roles
      const staffUsers = users.filter(user => staffRoles.includes(user.role));
      
      // Filter staff to only show those from assigned departments
      // Super admins and admins can always be assigned (they have access to all departments)
      const filteredStaff = staffUsers.filter(staff => {
        // Super admins and admins can always be assigned
        if (staff.role === 'donum_super_admin' || staff.role === 'donum_admin') {
          return true;
        }
        
        // For regular staff, only show if they're in one of the prospect's assigned departments
        if (departments.length === 0) {
          return false; // No departments assigned, so no staff available
        }
        
        // Check if staff's departments intersect with prospect's assigned departments
        return staff.departments && staff.departments.some(dept => departments.includes(dept));
      });
      
      // Get assigned staff IDs and primary staff
      const assignedIds = new Set(prospectAssignments.map(a => a.staff_id));
      const primary = prospectAssignments.find(a => a.is_primary)?.staff_id || null;

      setAllStaff(staffUsers);
      setAvailableStaff(filteredStaff);
      setAssignments(prospectAssignments);
      setAssignedStaffIds(assignedIds);
      setPrimaryStaffId(primary);
    } catch (err) {
      console.error('[ProspectStaffAssignment] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [prospectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleAssignment(user: User, isAssigned: boolean) {
    try {
      setSaving(true);
      setError(null);

      if (isAssigned) {
        // Unassign staff from prospect
        await unassignStaffFromProspect(prospectId, user.id);
        setAssignedStaffIds(prev => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        if (primaryStaffId === user.id) {
          setPrimaryStaffId(null);
        }
      } else {
        // Assign staff to prospect
        await assignStaffToProspect({
          prospect_id: prospectId,
          staff_id: user.id,
          is_primary: false,
        });

        setAssignedStaffIds(prev => {
          const next = new Set(prev);
          next.add(user.id);
          return next;
        });
      }

      // Reload data to get updated assignments
      await loadData();
      onUpdate?.();
    } catch (err) {
      console.error('[ProspectStaffAssignment] Error updating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePrimary(staffId: string, isPrimary: boolean) {
    try {
      setSaving(true);
      setError(null);

      const assignment = assignments.find(a => a.staff_id === staffId);
      if (!assignment) {
        setError('Assignment not found');
        return;
      }

      await updateProspectStaffAssignment(assignment.id, {
        is_primary: !isPrimary,
      });

      setPrimaryStaffId(isPrimary ? null : staffId);
      
      // Reload data to get updated assignments
      await loadData();
      onUpdate?.();
    } catch (err) {
      console.error('[ProspectStaffAssignment] Error updating primary:', err);
      setError(err instanceof Error ? err.message : 'Failed to update primary staff');
    } finally {
      setSaving(false);
    }
  }

  // Filter staff based on search term
  const filteredAssigned = allStaff.filter(user => {
    if (!assignedStaffIds.has(user.id)) return false;
    const search = searchTerm.toLowerCase();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const filteredUnassigned = allStaff.filter(user => {
    if (assignedStaffIds.has(user.id)) return false;
    const search = searchTerm.toLowerCase();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--background)] p-6 rounded-lg shadow-lg">
          <p className="text-[var(--text-primary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Assign Staff to Prospect
            </h2>
            {prospectName && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {prospectName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Department Assignment Warning */}
        {prospectDepartments.length === 0 && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Department Assignment Required
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                  This prospect must be assigned to a department before staff can be assigned. 
                  Staff members can only be assigned from departments that the prospect belongs to.
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  Please assign this prospect to a department first, then return to assign staff members.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Departments Info */}
        {prospectDepartments.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Assigned Departments:</span>
              <span className="text-sm text-blue-700 dark:text-blue-400">{prospectDepartments.join(', ')}</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Only staff members from these departments can be assigned to this prospect.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="p-6 border-b border-[var(--border)]">
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={prospectDepartments.length === 0}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assigned Staff */}
            <div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                Assigned Staff ({filteredAssigned.length})
              </h3>
              {filteredAssigned.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">
                  {searchTerm ? 'No matching assigned staff found' : 'No staff assigned'}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAssigned.map((user) => {
                    const isPrimary = primaryStaffId === user.id;
                    return (
                      <div
                        key={user.id}
                        className={`p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] ${
                          isPrimary ? 'ring-2 ring-[var(--core-blue)]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                  : 'No name'}
                              </p>
                              {isPrimary && (
                                <span className="text-xs bg-[var(--core-blue)] text-white px-2 py-0.5 rounded-lg">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                              {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                            </p>
                            {user.departments && user.departments.length > 0 && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {user.departments.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-3">
                            {!isPrimary && (
                              <button
                                onClick={() => handleTogglePrimary(user.id, false)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 transition-colors"
                                title="Set as primary"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleAssignment(user, true)}
                              disabled={saving}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Staff */}
            <div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                Available Staff ({filteredUnassigned.length})
              </h3>
              {filteredUnassigned.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">
                  {searchTerm ? 'No matching staff found' : 'All staff are assigned'}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUnassigned.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'No name'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                        </p>
                        {user.departments && user.departments.length > 0 && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.departments.join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleAssignment(user, false)}
                        disabled={saving || prospectDepartments.length === 0}
                        className="ml-3 px-3 py-1 text-xs bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
