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
        console.log('[StaffForm] Updating staff:', { id: staff.id, email });
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
        console.log('[StaffForm] Staff updated successfully');
      } else {
        if (!password) {
          setError('Password is required for new staff members');
          setLoading(false);
          return;
        }
        console.log('[StaffForm] Creating new staff:', { email, role });
        const input: CreateUserInput = {
          email,
          password,
          role,
          status,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
          cell_phone: cellPhone || undefined,
          departments: departments.length > 0 ? departments : undefined,
          timezone,
          language,
        };
        await createUser(input);
        console.log('[StaffForm] Staff created successfully');
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Email *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="staff@example.com"
          />
        </div>

        {!staff && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Password *
            </label>
            <input
              id="password"
              type="password"
              required={!staff}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="John"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label htmlFor="cellPhone" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Cell Phone
          </label>
          <input
            id="cellPhone"
            type="tel"
            value={cellPhone}
            onChange={(e) => setCellPhone(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      {/* Department Assignments */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Department Assignments
        </label>
        {availableDepartments.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] italic">
            No departments available. Create departments in the Departments page first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {availableDepartments.map((dept) => (
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
                <span className="text-sm font-medium text-[var(--text-primary)]">{dept.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="Internal notes about this staff member..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
        </button>
      </div>
    </form>
  );
}
