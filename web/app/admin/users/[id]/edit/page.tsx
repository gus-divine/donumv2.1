'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { UserForm } from '@/components/admin/users/UserForm';
import { getUser, type User } from '@/lib/api/users';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRef } from 'react';

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { canEdit } = usePermissions('/admin/users');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formSubmitRef = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    async function loadUser() {
      try {
        setLoading(true);
        setError(null);
        
        const userData = await getUser(userId);
        
        if (!userData) {
          setError('User not found');
        } else {
          setUser(userData);
        }
      } catch (err) {
        console.error('[EditUserPage] Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  function handleBack() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    router.back();
  }

  function handleSuccess() {
    router.push(`/admin/users/${userId}`);
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    router.back();
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading user...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !user) {
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
              <p className="text-[var(--text-secondary)] mb-4">{error || 'User not found'}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

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
                Edit User
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Update user information and settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => formSubmitRef.current?.click()}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                    Saving...
                  </span>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </div>
          <UserForm
            user={user}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            submitRef={formSubmitRef}
            onLoadingChange={setIsSaving}
            onHasChangesChange={setHasUnsavedChanges}
            showActions={false}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
