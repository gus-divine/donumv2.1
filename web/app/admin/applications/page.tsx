'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ApplicationList } from '@/components/admin/applications/ApplicationList';
import { ApplicationForm } from '@/components/admin/applications/ApplicationForm';
import { AdminApplicationEditForm } from '@/components/admin/applications/AdminApplicationEditForm';
import type { Application, ApplicationFilters } from '@/lib/api/applications';

type ViewMode = 'list' | 'view' | 'edit';

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit: canEditPage } = usePermissions('/admin/applications');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [filters, setFilters] = useState<ApplicationFilters>({});
  
  const canEdit = canEditPage('/admin/applications');
  const hasApplicantFilter = !!searchParams?.get('applicant_id');

  // Read applicant_id from URL params on mount
  useEffect(() => {
    const applicantId = searchParams?.get('applicant_id');
    if (applicantId) {
      setFilters({ applicant_id: applicantId });
    }
  }, [searchParams]);

  function handleView(application: Application) {
    console.log('[Applications Page] Switching to view mode:', { id: application.id, number: application.application_number });
    setSelectedApplication(application);
    setViewMode('view');
  }

  function handleEdit(application: Application) {
    console.log('[Applications Page] Switching to edit mode:', { id: application.id, number: application.application_number });
    setSelectedApplication(application);
    setViewMode('edit');
  }

  function handleSuccess() {
    console.log('[Applications Page] Operation successful, returning to list');
    setViewMode('list');
    setSelectedApplication(null);
  }

  function handleCancel() {
    console.log('[Applications Page] Operation cancelled, returning to list');
    setViewMode('list');
    setSelectedApplication(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {hasApplicantFilter && viewMode === 'list' && (
          <button
            onClick={() => router.push('/admin/prospects')}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back to Prospects
          </button>
        )}
        {viewMode === 'list' && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Application Management</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Process and manage loan applications.
            </p>
          </div>
        )}

        {viewMode === 'list' && (
          <ApplicationList
            onEdit={handleView}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {viewMode === 'view' && selectedApplication && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back to Applications
            </button>
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Application: {selectedApplication.applicant?.first_name && selectedApplication.applicant?.last_name
                      ? `${selectedApplication.applicant.first_name} ${selectedApplication.applicant.last_name}`
                      : selectedApplication.applicant?.name || selectedApplication.applicant?.email || selectedApplication.application_number}
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Review application details and manage status.
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleEdit(selectedApplication)}
                    className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
                  >
                    Edit Application Form
                  </button>
                )}
              </div>
            </div>
            <ApplicationForm
              application={selectedApplication}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              viewMode={true}
            />
          </div>
        )}

        {viewMode === 'edit' && selectedApplication && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back to Applications
            </button>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Edit Application: {selectedApplication.applicant?.first_name && selectedApplication.applicant?.last_name
                  ? `${selectedApplication.applicant.first_name} ${selectedApplication.applicant.last_name}`
                  : selectedApplication.applicant?.name || selectedApplication.applicant?.email || selectedApplication.application_number}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Update application information and details.
              </p>
            </div>
            <AdminApplicationEditForm
              applicationId={selectedApplication.id}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
