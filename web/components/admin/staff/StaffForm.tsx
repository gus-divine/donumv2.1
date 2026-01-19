'use client';

import { useState, useEffect } from 'react';
import { createUser, updateUser, type User, type CreateUserInput, type UpdateUserInput, USER_ROLES, USER_STATUSES } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { Select } from '@/components/ui/select';

interface StaffFormProps {
  staff?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StaffForm({ staff, onSuccess, onCancel }: StaffFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<CreateUserInput['role']>('donum_staff');
  const [status, setStatus] = useState<CreateUserInput['status']>('active');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState('en');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const depts = await getDepartments();
        setAvailableDepartments(depts);
      } catch (err) {
        console.error('[StaffForm] Error loading departments:', err);
      }
    }
    loadDepartments();
  }, []);

  useEffect(() => {
    if (staff) {
      setEmail(staff.email);
      setRole(staff.role);
      setStatus(staff.status);
      setFirstName(staff.first_name || '');
      setLastName(staff.last_name || '');
      setPhone(staff.phone || '');
      setCellPhone(staff.cell_phone || '');
      setDepartments(staff.departments || []);
      setTimezone(staff.timezone || 'America/New_York');
      setLanguage(staff.language || 'en');
      setNotes(staff.notes || '');
    }
  }, [staff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (staff) {
        const input: UpdateUserInput = {
          email,
          role,
          status,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
          cell_phone: cellPhone || undefined,
          departments: departments.length > 0 ? departments : undefined,
          timezone,
          language,
          notes: notes || undefined,
        };
        await updateUser(staff.id, input);
      } else {
        if (!password) {
          setError('Password is required for new staff members');
          setLoading(false);
          return;
        }
        const input: CreateUserInput = {
          email,
          password,
          role,
          status,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || cellPhone || undefined,
          departments: departments.length > 0 ? departments : undefined,
          timezone,
          language,
        };
        await createUser(input);
      }
      onSuccess();
    } catch (err) {
      console.error('[StaffForm] Error saving staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  }

  function handleToggleDepartment(deptName: string) {
    if (departments.includes(deptName)) {
      setDepartments(departments.filter(d => d !== deptName));
    } else {
      setDepartments([...departments, deptName]);
    }
  }

  // Filter roles to only staff-related roles
  const staffRoles = USER_ROLES.filter(r => 
    ['donum_staff', 'donum_admin', 'donum_super_admin'].includes(r.value)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Account Information */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="staff@example.com"
            />
          </div>

          {!staff && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Temporary Password *
              </label>
              <input
                id="password"
                type="password"
                required={!staff}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                They will be prompted to change this on first login.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="role" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Role *
            </label>
            <Select
              id="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as CreateUserInput['role'])}
              options={staffRoles.map((r) => ({
                value: r.value,
                label: r.label
              }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Status *
            </label>
            <Select
              id="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as CreateUserInput['status'])}
              options={USER_STATUSES.map((s) => ({
                value: s.value,
                label: s.label
              }))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="John"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="Doe"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cellPhone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Cell Phone
            </label>
            <input
              id="cellPhone"
              type="tel"
              value={cellPhone}
              onChange={(e) => setCellPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Department Assignments */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Department Assignments</h3>
        {availableDepartments.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] italic">
            No departments available. Create departments in the Departments page first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {availableDepartments.filter(dept => dept.is_active).map((dept) => {
              const deptColor = dept.color || '#6B7280';
              return (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={departments.includes(dept.name)}
                    onChange={() => handleToggleDepartment(dept.name)}
                    className="rounded border-[var(--border)] text-[var(--core-blue)] focus:ring-[var(--core-blue)]"
                  />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: deptColor }}
                  >
                    {dept.name}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional Settings */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Additional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="timezone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Timezone
            </label>
            <Select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'America/New_York', label: 'Eastern Time' },
                { value: 'America/Chicago', label: 'Central Time' },
                { value: 'America/Denver', label: 'Mountain Time' },
                { value: 'America/Los_Angeles', label: 'Pacific Time' },
                { value: 'UTC', label: 'UTC' },
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="language" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Language
            </label>
            <Select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="Internal notes about this staff member..."
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-[var(--core-blue)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--core-blue)] rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
        </button>
      </div>
    </form>
  );
}
