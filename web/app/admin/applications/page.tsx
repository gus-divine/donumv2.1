'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ApplicationList } from '@/components/admin/applications/ApplicationList';
import type { Application, ApplicationFilters } from '@/lib/api/applications';

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ApplicationFilters>({});
  
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

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {hasApplicantFilter && (
          <button
            onClick={() => router.push('/admin/prospects')}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back to Prospects
          </button>
        )}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Applications</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Process and manage loan applications.
          </p>
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
