'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { ProspectList } from '@/components/admin/prospects/ProspectList';
import { UserForm } from '@/components/admin/users/UserForm';
import { CreateProspectChoiceModal } from '@/components/admin/prospects/CreateProspectChoiceModal';
import { InviteProspectForm } from '@/components/admin/prospects/InviteProspectForm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { UserFilters } from '@/lib/api/users';

type ViewMode = 'list' | 'create' | 'invite';

export default function TeamProspectsPage() {
  const { canEdit } = usePermissions('/admin/prospects');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({});
  const [listRefreshKey, setListRefreshKey] = useState(0);

  function handleCreate() {
    setShowChoiceModal(true);
  }

  function handleAddNow() {
    setShowChoiceModal(false);
    setViewMode('create');
  }

  function handleSendInvite() {
    setShowChoiceModal(false);
    setViewMode('invite');
  }

  function handleSuccess() {
    setViewMode('list');
    setListRefreshKey((k) => k + 1);
  }

  function handleCancel() {
    setViewMode('list');
  }

  return (
    <PermissionGuard>
      <CreateProspectChoiceModal
        isOpen={showChoiceModal}
        onAddNow={handleAddNow}
        onSendInvite={handleSendInvite}
        onCancel={() => setShowChoiceModal(false)}
      />
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        {(viewMode === 'create' || viewMode === 'invite') && (
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
          <ProspectList key={listRefreshKey} filters={filters} onFiltersChange={setFilters} />
        )}
        {viewMode === 'create' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create New Prospect</h1>
              <p className="text-sm text-[var(--text-secondary)]">Add a new prospect who came into your office.</p>
            </div>
            <UserForm user={null} onSuccess={handleSuccess} onCancel={handleCancel} defaultRole="donum_prospect" />
          </div>
        )}
        {viewMode === 'invite' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Send Invite</h1>
              <p className="text-sm text-[var(--text-secondary)]">Send an email invitation.</p>
            </div>
            <div className="max-w-md">
              <InviteProspectForm onSuccess={handleSuccess} onCancel={handleCancel} />
            </div>
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
