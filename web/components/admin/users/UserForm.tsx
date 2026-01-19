'use client';

import { useState, useEffect } from 'react';
import { createUser, updateUser, type User, type CreateUserInput, type UpdateUserInput, USER_ROLES, USER_STATUSES } from '@/lib/api/users';
import { Select } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface UserFormProps {
  user?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
  defaultRole?: CreateUserInput['role'];
  submitRef?: React.RefObject<HTMLButtonElement | null>;
  onLoadingChange?: (loading: boolean) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
  showActions?: boolean;
}

export function UserForm({ user, onSuccess, onCancel, defaultRole = 'donum_prospect', submitRef, onLoadingChange, onHasChangesChange, showActions = true }: UserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<CreateUserInput['role']>(defaultRole);
  const [status, setStatus] = useState<CreateUserInput['status']>('pending');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [adminLevel, setAdminLevel] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState('en');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track initial values to detect changes
  const [initialValues, setInitialValues] = useState<{
    email: string;
    role: CreateUserInput['role'];
    status: CreateUserInput['status'];
    firstName: string;
    lastName: string;
    phone: string;
    cellPhone: string;
    company: string;
    title: string;
    jobTitle: string;
    adminLevel: string;
    timezone: string;
    language: string;
    notes: string;
  } | null>(null);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (user) {
      const userEmail = user.email;
      const userRole = user.role;
      const userStatus = user.status;
      const userFirstName = user.first_name || '';
      const userLastName = user.last_name || '';
      const userPhone = user.phone || '';
      const userCellPhone = user.cell_phone || '';
      const userCompany = user.company || '';
      const userTitle = user.title || '';
      const userJobTitle = user.job_title || '';
      const userAdminLevel = user.admin_level || '';
      const userTimezone = user.timezone || 'America/New_York';
      const userLanguage = user.language || 'en';
      const userNotes = user.notes || '';

      setEmail(userEmail);
      setRole(userRole);
      setStatus(userStatus);
      setFirstName(userFirstName);
      setLastName(userLastName);
      setPhone(userPhone);
      setCellPhone(userCellPhone);
      setCompany(userCompany);
      setTitle(userTitle);
      setJobTitle(userJobTitle);
      setAdminLevel(userAdminLevel);
      setTimezone(userTimezone);
      setLanguage(userLanguage);
      setNotes(userNotes);

      setInitialValues({
        email: userEmail,
        role: userRole,
        status: userStatus,
        firstName: userFirstName,
        lastName: userLastName,
        phone: userPhone,
        cellPhone: userCellPhone,
        company: userCompany,
        title: userTitle,
        jobTitle: userJobTitle,
        adminLevel: userAdminLevel,
        timezone: userTimezone,
        language: userLanguage,
        notes: userNotes,
      });
    } else {
      // Set default role for new users
      setRole(defaultRole);
      setInitialValues({
        email: '',
        role: defaultRole,
        status: 'pending',
        firstName: '',
        lastName: '',
        phone: '',
        cellPhone: '',
        company: '',
        title: '',
        jobTitle: '',
        adminLevel: '',
        timezone: 'America/New_York',
        language: 'en',
        notes: '',
      });
    }
  }, [user, defaultRole]);

  // Check if form has unsaved changes
  const hasChanges = initialValues ? (
    email !== initialValues.email ||
    role !== initialValues.role ||
    status !== initialValues.status ||
    firstName !== initialValues.firstName ||
    lastName !== initialValues.lastName ||
    phone !== initialValues.phone ||
    cellPhone !== initialValues.cellPhone ||
    company !== initialValues.company ||
    title !== initialValues.title ||
    jobTitle !== initialValues.jobTitle ||
    adminLevel !== initialValues.adminLevel ||
    timezone !== initialValues.timezone ||
    language !== initialValues.language ||
    notes !== initialValues.notes ||
    (!user && password !== '')
  ) : false;

  // Notify parent about changes
  useEffect(() => {
    if (onHasChangesChange) {
      onHasChangesChange(hasChanges);
    }
  }, [hasChanges, onHasChangesChange]);

  // Browser beforeunload warning
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        const input: UpdateUserInput = {
          email,
          role,
          status,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
          cell_phone: cellPhone || undefined,
          company: company || undefined,
          title: title || undefined,
          job_title: jobTitle || undefined,
          admin_level: adminLevel || undefined,
          timezone,
          language,
          notes: notes || undefined,
        };
        await updateUser(user.id, input);
      // Reset initial values after successful save
      setInitialValues({
        email,
        role,
        status,
        firstName,
        lastName,
        phone,
        cellPhone,
        company,
        title,
        jobTitle,
        adminLevel,
        timezone,
        language,
        notes,
      });
      } else {
        if (!password) {
          setError('Password is required for new users');
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
          phone: phone || undefined,
          company: company || undefined,
          title: title || undefined,
          admin_level: adminLevel || undefined,
          timezone,
          language,
        };
        await createUser(input);
      }
      onSuccess();
    } catch (err) {
      console.error('[UserForm] Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {hasChanges && (
        <div className="p-4 border-l-4 border-yellow-500 rounded-lg shadow-sm mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">You have unsaved changes</p>
              <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                Please save your changes before navigating away to avoid losing your work.
              </p>
            </div>
          </div>
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
              placeholder="user@example.com"
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Temporary Password *
              </label>
              <input
                id="password"
                type="password"
                required={!user}
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
            <label htmlFor="status" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Status *
            </label>
            <Select
              id="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as CreateUserInput['status'])}
              options={USER_STATUSES}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Role {!user && '*'}
            </label>
            <Select
              id="role"
              required={!user}
              value={role}
              onChange={(e) => setRole(e.target.value as CreateUserInput['role'])}
              options={USER_ROLES}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!!defaultRole && !user}
            />
            {defaultRole && !user && (
              <p className="text-xs text-[var(--text-secondary)]">
                Role is set to Prospect for new prospects.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
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
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
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
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Professional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="company" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Company
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="Company Name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="Job Title"
            />
          </div>
        </div>
      </div>

      {/* Additional Settings - Only show for editing existing users */}
      {user && (
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Additional Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(role === 'donum_admin' || role === 'donum_super_admin') && (
              <div className="space-y-2">
                <label htmlFor="adminLevel" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Admin Level
                </label>
                <select
                  id="adminLevel"
                  value={adminLevel}
                  onChange={(e) => setAdminLevel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                >
                  <option value="">None</option>
                  <option value="super">Super</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                </select>
              </div>
            )}

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
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="Internal notes about this user..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      {showActions && (
        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--core-gold)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                {user ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              user ? 'Update User' : 'Create Prospect'
            )}
          </button>
        </div>
      )}
      {/* Hidden submit button for external trigger */}
      {submitRef && (
        <button
          ref={submitRef}
          type="submit"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
    </form>
  );
}
