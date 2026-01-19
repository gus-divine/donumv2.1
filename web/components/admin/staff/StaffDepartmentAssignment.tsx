'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDepartments, type Department } from '@/lib/api/departments';
import { updateUser, type User } from '@/lib/api/users';
import { X } from 'lucide-react';

interface StaffDepartmentAssignmentProps {
  staff: User;
  onClose: () => void;
  onUpdate?: () => void;
}

export function StaffDepartmentAssignment({ staff, onClose, onUpdate }: StaffDepartmentAssignmentProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>(staff.departments || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const loadingRef = useRef(false);

  const loadDepartments = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('[StaffDepartmentAssignment] Error loading departments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  async function handleToggleDepartment(departmentName: string, isAssigned: boolean) {
    try {
      setSaving(true);
      setError(null);

      const currentDepartments = assignedDepartments;
      let newDepartments: string[];

      if (isAssigned) {
        // Remove from department
        newDepartments = currentDepartments.filter(d => d !== departmentName);
      } else {
        // Add to department
        if (currentDepartments.includes(departmentName)) {
          return; // Already assigned
        }
        newDepartments = [...currentDepartments, departmentName];
      }

      await updateUser(staff.id, { departments: newDepartments });
      setAssignedDepartments(newDepartments);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('[StaffDepartmentAssignment] Error updating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      await updateUser(staff.id, { departments: assignedDepartments });
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (err) {
      console.error('[StaffDepartmentAssignment] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const filteredDepartments = departments.filter(dept => {
    const search = searchTerm.toLowerCase();
    return dept.name.toLowerCase().includes(search) ||
           (dept.description && dept.description.toLowerCase().includes(search));
  });

  const staffName = staff.first_name || staff.last_name
    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
    : staff.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--background)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Manage Departments for {staffName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Assign or remove departments for this staff member
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-[var(--text-secondary)]">Loading departments...</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                />
              </div>

              {/* Departments List */}
              <div className="space-y-3">
                {filteredDepartments.length === 0 ? (
                  <p className="text-[var(--text-secondary)] text-center py-8">
                    {searchTerm ? 'No departments found matching your search.' : 'No departments available.'}
                  </p>
                ) : (
                  filteredDepartments.map((dept) => {
                    const isAssigned = assignedDepartments.includes(dept.name);
                    return (
                      <div
                        key={dept.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          isAssigned
                            ? 'border-[var(--core-blue)] bg-[var(--core-blue)]/5'
                            : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors"
                              style={{
                                backgroundColor: isAssigned ? 'var(--core-blue)' : 'transparent',
                                borderColor: 'var(--core-blue)'
                              }}
                              onClick={() => handleToggleDepartment(dept.name, isAssigned)}
                            >
                              {isAssigned && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-[var(--text-primary)]">{dept.name}</h3>
                              {dept.description && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">{dept.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleDepartment(dept.name, isAssigned)}
                          disabled={saving}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isAssigned
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-[var(--core-blue)] text-white hover:bg-[var(--core-blue-light)]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
