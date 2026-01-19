'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ProspectList } from '@/components/admin/prospects/ProspectList';
import { UserForm } from '@/components/admin/users/UserForm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { UserFilters } from '@/lib/api/users';

type ViewMode = 'list' | 'create';

export default function ProspectsPage() {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/prospects');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<UserFilters>({});

  function handleCreate() {
    setViewMode('create');
  }

  function handleSuccess() {
    setViewMode('list');
    // Reload the list will happen automatically via ProspectList's useEffect
  }

  function handleCancel() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      setViewMode('list');
    }
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {viewMode === 'create' && (
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
        )}
        
        {viewMode === 'list' && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prospects</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                View and manage prospects. Click on a prospect to view their details.
              </p>
            </div>
            {canEdit('/admin/prospects') && (
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                + Create Prospect
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <ProspectList filters={filters} onFiltersChange={setFilters} />
        )}

        {viewMode === 'create' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Create New Prospect
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Add a new prospect who came into your office. They will receive login credentials via email.
              </p>
            </div>
            <ProspectForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}

// Prospect-specific form wrapper that pre-sets role to donum_prospect
function ProspectForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  return (
    <UserForm
      user={null}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultRole="donum_prospect"
    />
  );
}
