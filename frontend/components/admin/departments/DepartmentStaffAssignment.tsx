'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, updateUser, type User } from '@/lib/api/users';
import { type Department } from '@/lib/api/departments';
import { USER_ROLES } from '@/lib/api/users';

interface DepartmentStaffAssignmentProps {
  department: Department;
  onClose: () => void;
}

export function DepartmentStaffAssignment({ department, onClose }: DepartmentStaffAssignmentProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const loadingRef = useRef(false);

  // Staff roles that can be assigned to departments
  const staffRoles: string[] = ['donum_super_admin', 'donum_admin', 'donum_staff'];

  const loadUsers = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Fetch all users (we'll filter by role client-side)
      const users = await getUsers();
      
      // Filter to only staff roles
      const staffUsers = users.filter(user => staffRoles.includes(user.role));
      
      // Separate assigned vs unassigned
      const assigned = staffUsers.filter(user => 
        user.departments && user.departments.includes(department.name)
      );
      const unassigned = staffUsers.filter(user => 
        !user.departments || !user.departments.includes(department.name)
      );

      setAllUsers(staffUsers);
      setAssignedUsers(assigned);
    } catch (err) {
      console.error('[DepartmentStaffAssignment] Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [department.name]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleToggleAssignment(user: User, isAssigned: boolean) {
    try {
      setSaving(true);
      setError(null);

      const currentDepartments = user.departments || [];
      let newDepartments: string[];

      if (isAssigned) {
        // Remove from department
        newDepartments = currentDepartments.filter(d => d !== department.name);
      } else {
        // Add to department
        if (currentDepartments.includes(department.name)) {
          return; // Already assigned
        }
        newDepartments = [...currentDepartments, department.name];
      }

      await updateUser(user.id, { departments: newDepartments });
      
      // Update local state
      if (isAssigned) {
        setAssignedUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        setAssignedUsers(prev => [...prev, { ...user, departments: newDepartments }]);
      }

      // Update allUsers to reflect the change
      setAllUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, departments: newDepartments } : u
      ));
    } catch (err) {
      console.error('[DepartmentStaffAssignment] Error updating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  }

  // Filter users based on search term
  const filteredAssigned = assignedUsers.filter(user => {
    const search = searchTerm.toLowerCase();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const filteredUnassigned = allUsers
    .filter(user => !assignedUsers.some(au => au.id === user.id))
    .filter(user => {
      const search = searchTerm.toLowerCase();
      const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = user.email.toLowerCase();
      return name.includes(search) || email.includes(search);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Manage Staff - {department.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Assign staff members to this department. Staff can belong to multiple departments.
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
        <label htmlFor="staff-search" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Search Staff
        </label>
        <input
          id="staff-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assigned Staff */}
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Assigned Staff ({filteredAssigned.length})
          </h3>
          {filteredAssigned.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No staff assigned to this department
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
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                    </p>
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

        {/* Available Staff */}
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Available Staff ({filteredUnassigned.length})
          </h3>
          {filteredUnassigned.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              {searchTerm ? 'No matching staff found' : 'All staff are assigned to this department'}
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
