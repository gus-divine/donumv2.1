'use client';

import { useState } from 'react';
import { updateUser, getUser, type User, type UpdateUserInput, USER_ROLES, USER_STATUSES } from '@/lib/api/users';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Select } from '@/components/ui/select';
import { StaffDepartmentAssignment } from './StaffDepartmentAssignment';

interface StaffDetailProps {
  staff: User;
  onBack: () => void;
  onStaffUpdated: (staff: User) => void;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || colors.active;
}

export function StaffDetail({ staff, onBack, onStaffUpdated }: StaffDetailProps) {
  const { canEdit } = usePermissions('/admin/staff');
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDepartmentAssignment, setShowDepartmentAssignment] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(staff.first_name || '');
  const [lastName, setLastName] = useState(staff.last_name || '');
  const [email, setEmail] = useState(staff.email);
  const [phone, setPhone] = useState(staff.phone || '');
  const [cellPhone, setCellPhone] = useState(staff.cell_phone || '');
  const [status, setStatus] = useState(staff.status);
  const [timezone, setTimezone] = useState(staff.timezone || 'America/New_York');
  const [language, setLanguage] = useState(staff.language || 'en');
  const [notes, setNotes] = useState(staff.notes || '');

  const staffName = staff.first_name || staff.last_name
    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
    : staff.email;

  async function handleSave() {
    if (!canEdit('/admin/staff')) {
      setError('You do not have permission to update staff');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const input: UpdateUserInput = {
        email,
        status,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: phone || undefined,
        cell_phone: cellPhone || undefined,
        timezone,
        language,
        notes: notes || undefined,
      };

      const updated = await updateUser(staff.id, input);
      onStaffUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('[StaffDetail] Error updating staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff');
    } finally {
      setUpdating(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setFirstName(staff.first_name || '');
    setLastName(staff.last_name || '');
    setEmail(staff.email);
    setPhone(staff.phone || '');
    setCellPhone(staff.cell_phone || '');
    setStatus(staff.status);
    setTimezone(staff.timezone || 'America/New_York');
    setLanguage(staff.language || 'en');
    setNotes(staff.notes || '');
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{staffName}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{staff.email}</p>
        </div>
        {canEdit('/admin/staff') && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Edit Staff
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 gap-6">
          {isEditing ? (
            <>
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
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Status
                </label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UpdateUserInput['status'])}
                  options={USER_STATUSES.map(s => ({ value: s.value, label: s.label }))}
                  className="w-full"
                />
              </div>
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
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</span>
                <p className="text-[var(--text-primary)]">{staffName}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</span>
                <p className="text-[var(--text-primary)]">{staff.email}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Role</span>
                <p className="text-[var(--text-primary)]">
                  {USER_ROLES.find(r => r.value === staff.role)?.label || staff.role}
                </p>
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(staff.status)}`}>
                  {staff.status || 'active'}
                </span>
              </div>
              {staff.phone && (
                <div>
                  <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone</span>
                  <p className="text-[var(--text-primary)]">{staff.phone}</p>
                </div>
              )}
              {staff.cell_phone && (
                <div>
                  <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cell Phone</span>
                  <p className="text-[var(--text-primary)]">{staff.cell_phone}</p>
                </div>
              )}
            </>
          )}
        </div>

        {isEditing && (
          <div className="mt-6 pt-6 border-t border-[var(--border)] flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updating}
              className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Department Assignments */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Department Assignments</h2>
          {canEdit('/admin/staff') && (
            <button
              onClick={() => setShowDepartmentAssignment(true)}
              className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Manage Departments
            </button>
          )}
        </div>
        {staff.departments && staff.departments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {staff.departments.map((deptName) => (
              <span
                key={deptName}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--surface-hover)] text-[var(--text-primary)]"
              >
                {deptName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-secondary)] text-sm">No departments assigned</p>
        )}
      </div>

      {/* Additional Information */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Additional Information</h2>
        <div className="grid grid-cols-2 gap-6">
          {isEditing ? (
            <>
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
              <div className="col-span-2">
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
            </>
          ) : (
            <>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Timezone</span>
                <p className="text-[var(--text-primary)]">{staff.timezone || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Language</span>
                <p className="text-[var(--text-primary)]">{staff.language || '—'}</p>
              </div>
              {staff.notes && (
                <div className="col-span-2">
                  <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</span>
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{staff.notes}</p>
                </div>
              )}
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Created</span>
                <p className="text-[var(--text-primary)]">{formatDate(staff.created_at)}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Login</span>
                <p className="text-[var(--text-primary)]">{formatDate(staff.last_login_at)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Department Assignment Modal */}
      {showDepartmentAssignment && (
        <StaffDepartmentAssignment
          staff={staff}
          onClose={() => {
            setShowDepartmentAssignment(false);
          }}
          onUpdate={async () => {
            setShowDepartmentAssignment(false);
            // Reload staff data
            try {
              const updatedStaff = await getUser(staff.id);
              if (updatedStaff) {
                onStaffUpdated(updatedStaff);
              }
            } catch (err) {
              console.error('[StaffDetail] Error reloading staff:', err);
            }
          }}
        />
      )}
    </div>
  );
}
