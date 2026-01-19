'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { AdminApplicationEditForm } from '@/components/admin/applications/AdminApplicationEditForm';
import { getApplication, type Application } from '@/lib/api/applications';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApplicationEditPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;
  const { canEdit: canEditPage } = usePermissions('/admin/applications');
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  
  const canEdit = canEditPage('/admin/applications');

  useEffect(() => {
    if (!applicationId) {
      setError('Application ID is required');
      setLoading(false);
      return;
    }

    async function loadApplication() {
      try {
        setLoading(true);
        setError(null);
        const appData = await getApplication(applicationId);
        if (!appData) {
          setError('Application not found');
        } else {
          setApplication(appData);
        }
      } catch (err) {
        console.error('[ApplicationEditPage] Error loading application:', err);
        setError(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        setLoading(false);
      }
    }

    loadApplication();
  }, [applicationId]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/admin/applications/${applicationId}`);
    }
  }

  async function handleSuccess() {
    // Navigate back to detail page with a timestamp query param to force reload
    router.push(`/admin/applications/${applicationId}?refresh=${Date.now()}`);
  }

  async function handleCancel() {
    // Navigate back to detail page
    router.push(`/admin/applications/${applicationId}`);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <Skeleton height="1.5rem" width="5rem" />
            </div>

            {/* Header Skeleton */}
            <div className="mb-8 flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton height="2rem" width="24rem" />
                <Skeleton height="1rem" width="30rem" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton height="2rem" width="5rem" />
                <Skeleton height="2rem" width="10rem" />
              </div>
            </div>

            {/* Form Sections Skeleton */}
            {/* Personal Info Section */}
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="14rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="2.5rem" width="100%" />
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Info Section */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="14rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="10rem" />
                    <Skeleton height="2.5rem" width="100%" />
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Profile Section */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="18rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="10rem" />
                    <Skeleton height="2.5rem" width="100%" />
                  </div>
                ))}
              </div>
            </div>

            {/* Application Details Section */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="10rem" />
                    <Skeleton height="2.5rem" width="100%" />
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-1">
                <Skeleton height="0.875rem" width="8rem" />
                <Skeleton height="6rem" width="100%" />
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
              <div className="flex items-center justify-end gap-3">
                <Skeleton height="2rem" width="5rem" />
                <Skeleton height="2rem" width="10rem" />
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !application) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back
          </button>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
            <p className="text-[var(--text-secondary)] mb-4">{error || 'Application not found'}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Edit Application: {application.applicant?.first_name && application.applicant?.last_name
                  ? `${application.applicant.first_name} ${application.applicant.last_name}`
                  : application.applicant?.name || application.applicant?.email || application.application_number}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Update application information and details.
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
                onClick={async () => {
                  if (saveHandlerRef.current) {
                    try {
                      await saveHandlerRef.current();
                    } catch (err) {
                      console.error('[ApplicationEditPage] Error saving:', err);
                      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                  } else {
                    console.error('[ApplicationEditPage] Save handler is not ready!');
                    alert('Save handler is not ready. Please wait for the form to load.');
                  }
                }}
                disabled={saving || !canEdit}
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
          <AdminApplicationEditForm
            applicationId={application.id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            onSavingChange={setSaving}
            onSaveReady={(handler) => {
              saveHandlerRef.current = handler;
            }}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
