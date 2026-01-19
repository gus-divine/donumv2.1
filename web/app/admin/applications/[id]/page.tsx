'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ApplicationForm } from '@/components/admin/applications/ApplicationForm';
import { getApplication, type Application } from '@/lib/api/applications';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = params?.id as string;
  const { canEdit: canEditPage } = usePermissions('/admin/applications');
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        console.error('[ApplicationDetailPage] Error loading application:', err);
        setError(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        setLoading(false);
      }
    }

    loadApplication();
    // Also reload when searchParams change (e.g., refresh query param)
  }, [applicationId, searchParams]);

  function handleBack() {
    router.push('/admin/applications');
  }

  function handleEdit() {
    router.push(`/admin/applications/${applicationId}/edit`);
  }

  async function handleSuccess() {
    // Reload application data with a small delay to ensure database has updated
    if (applicationId) {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        const updatedApp = await getApplication(applicationId);
        if (updatedApp) {
          setApplication(updatedApp);
        }
      } catch (err) {
        console.error('[ApplicationDetailPage] Error reloading application:', err);
      }
    }
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading application details...</div>
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
            ← Back to Applications
          </button>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
            <p className="text-[var(--text-secondary)] mb-4">{error || 'Application not found'}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              Back to Applications
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
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back to Applications
          </button>
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {application.applicant?.first_name && application.applicant?.last_name
                    ? `${application.applicant.first_name} ${application.applicant.last_name}`
                    : application.applicant?.name || application.applicant?.email || application.application_number}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Review application details and manage status.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                >
                  Edit Application Form
                </button>
              )}
            </div>
          </div>
          <ApplicationForm
            key={`app-view-${application.id}-${application.updated_at || Date.now()}`}
            application={application}
            onSuccess={handleSuccess}
            onCancel={handleBack}
            viewMode={true}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
