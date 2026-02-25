'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ApplicationList } from '@/components/admin/applications/ApplicationList';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { Application, ApplicationFilters } from '@/lib/api/applications';

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ApplicationFilters>({});
  const { canEdit } = usePermissions('/admin/applications');
  
  const hasApplicantFilter = !!searchParams?.get('applicant_id');

  // Read applicant_id from URL params on mount
  useEffect(() => {
    const applicantId = searchParams?.get('applicant_id');
    if (applicantId) {
      setFilters({ applicant_id: applicantId });
    }
  }, [searchParams]);

  function handleView(application: Application) {
    router.push(`/admin/applications/${application.id}`);
  }

  function handleAddApplication() {
    router.push('/admin/applications/new');
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {hasApplicantFilter && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/admin/prospects');
              }
            }}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back
          </button>
        )}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Applications</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Process and manage loan applications.
            </p>
          </div>
          {canEdit('/admin/applications') && (
            <button
              onClick={handleAddApplication}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              + Add Application
            </button>
          )}
        </div>

        <ApplicationList
          onEdit={handleView}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </main>
    </PermissionGuard>
  );
}
