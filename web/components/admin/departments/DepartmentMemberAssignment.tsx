'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, type User } from '@/lib/api/users';
import { type Department } from '@/lib/api/departments';
import { assignMemberToDepartment, unassignMemberFromDepartment, getDepartmentMembers } from '@/lib/api/department-members';
import { USER_ROLES } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';

interface DepartmentMemberAssignmentProps {
  department: Department;
  onClose: () => void;
}

export function DepartmentMemberAssignment({ department, onClose }: DepartmentMemberAssignmentProps) {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedMemberIds, setAssignedMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const loadingRef = useRef(false);

  // Member roles that can be assigned to departments
  const memberRoles: string[] = ['donum_member', 'donum_prospect'];

  const loadData = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Fetch all users and department members in parallel
      const [users, departmentMembers] = await Promise.all([
        getUsers(),
        getDepartmentMembers(department.name),
      ]);
      
      // Filter to only member roles
      const memberUsers = users.filter(user => memberRoles.includes(user.role));
      
      // Get assigned member IDs
      const assignedIds = new Set(departmentMembers.map(dm => dm.member_id));

      setAllUsers(memberUsers);
      setAssignedMemberIds(assignedIds);
    } catch (err) {
      console.error('[DepartmentMemberAssignment] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [department.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleAssignment(user: User, isAssigned: boolean) {
    try {
      setSaving(true);
      setError(null);

      if (isAssigned) {
        // Unassign from department
        await unassignMemberFromDepartment(department.name, user.id);
        setAssignedMemberIds(prev => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
      } else {
        // Assign to department
        // Check if department allows this type of assignment
        const isProspect = user.role === 'donum_prospect';
        const isMember = user.role === 'donum_member';

        if (isProspect && !department.prospect_assignment_enabled) {
          setError('This department does not accept prospect/lead assignments');
          return;
        }

        if (isMember && !department.member_assignment_enabled) {
          setError('This department does not accept member assignments');
          return;
        }

        await assignMemberToDepartment({
          department_name: department.name,
          member_id: user.id,
        });

        setAssignedMemberIds(prev => {
          const next = new Set(prev);
          next.add(user.id);
          return next;
        });
      }
    } catch (err) {
      console.error('[DepartmentMemberAssignment] Error updating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  }

  // Filter users based on search term
  const filteredAssigned = allUsers.filter(user => {
    if (!assignedMemberIds.has(user.id)) return false;
    const search = searchTerm.toLowerCase();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const filteredUnassigned = allUsers.filter(user => {
    if (assignedMemberIds.has(user.id)) return false;
    
    // Filter by assignment flags
    const isProspect = user.role === 'donum_prospect';
    const isMember = user.role === 'donum_member';
    
    if (isProspect && !department.prospect_assignment_enabled) return false;
    if (isMember && !department.member_assignment_enabled) return false;

    const search = searchTerm.toLowerCase();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Manage Members - {department.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Assign members, prospects, and leads to this department. 
            {!department.prospect_assignment_enabled && (
              <span className="text-orange-600 dark:text-orange-400"> Prospect assignments disabled.</span>
            )}
            {!department.member_assignment_enabled && (
              <span className="text-orange-600 dark:text-orange-400"> Member assignments disabled.</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Search */}
      <div>
        <label htmlFor="member-search" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Search Members
        </label>
        <input
          id="member-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assigned Members */}
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Assigned Members ({filteredAssigned.length})
          </h3>
          {filteredAssigned.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No members assigned to this department
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAssigned.map((user) => (
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[var(--text-secondary)]">
                        {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAssignment(user, true)}
                    disabled={saving}
                    className="ml-3 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Members */}
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Available Members ({filteredUnassigned.length})
          </h3>
          {filteredUnassigned.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              {searchTerm 
                ? 'No matching members found' 
                : department.prospect_assignment_enabled && department.member_assignment_enabled
                  ? 'All members are assigned to this department'
                  : 'No members available (assignment type disabled for this department)'}
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[var(--text-secondary)]">
                        {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAssignment(user, false)}
                    disabled={saving}
                    className="ml-3 px-3 py-1 text-xs bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 transition-colors"
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
  );
}
