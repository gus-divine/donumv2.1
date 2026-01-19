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

  const filteredDepartments = departments.filter(dept => {
    if (!dept.is_active) return false;
    const search = searchTerm.toLowerCase();
    return dept.name.toLowerCase().includes(search) ||
           (dept.description && dept.description.toLowerCase().includes(search));
  });

  const staffName = staff.first_name || staff.last_name
    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
    : staff.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--background)] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--surface)]/50 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Manage Departments
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {staffName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--core-blue)] border-t-transparent mx-auto mb-4"></div>
                <p className="text-[var(--text-secondary)] text-sm">Loading departments...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-6">
                <label htmlFor="department-search" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Search Departments
                </label>
                <div className="relative">
                  <input
                    id="department-search"
                    type="text"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Departments List */}
              <div className="space-y-2">
                {filteredDepartments.length === 0 ? (
                  <div className="text-center py-12 border border-[var(--border)] rounded-lg">
                    <p className="text-[var(--text-secondary)] text-sm">
                      {searchTerm ? 'No departments found matching your search.' : 'No departments available.'}
                    </p>
                  </div>
                ) : (
                  filteredDepartments.map((dept) => {
                    const isAssigned = assignedDepartments.includes(dept.name);
                    const deptColor = dept.color || '#6B7280';
                    
                    return (
                      <div
                        key={dept.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                          isAssigned
                            ? 'border-[var(--core-blue)] bg-[var(--core-blue)]/5'
                            : 'border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--core-blue)]/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <label className="flex items-center cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleDepartment(dept.name, isAssigned)}
                              disabled={saving}
                              className="w-4 h-4 rounded border-2 border-[var(--core-blue)] text-[var(--core-blue)] focus:ring-[var(--core-blue)] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: deptColor + '20',
                                    color: deptColor
                                  }}
                                >
                                  {dept.name}
                                </span>
                              </div>
                              {dept.description && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">{dept.description}</p>
                              )}
                            </div>
                          </label>
                        </div>
                        <button
                          onClick={() => handleToggleDepartment(dept.name, isAssigned)}
                          disabled={saving}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isAssigned
                              ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:bg-[var(--surface-hover)]'
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)] bg-[var(--surface)]/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
