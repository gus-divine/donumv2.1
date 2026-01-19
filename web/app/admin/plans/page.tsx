'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PlanList } from '@/components/admin/plans/PlanList';
import { PlanForm } from '@/components/admin/plans/PlanForm';
import type { DonumPlan } from '@/lib/api/plans';

type ViewMode = 'list' | 'create' | 'edit';

export default function PlansPage() {
  const { canEdit } = usePermissions('/admin/plans');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPlan, setSelectedPlan] = useState<DonumPlan | null>(null);

  function handleCreate() {
    setSelectedPlan(null);
    setViewMode('create');
  }

  function handleEdit(plan: DonumPlan) {
    setSelectedPlan(plan);
    setViewMode('edit');
  }

  function handleSuccess() {
    setViewMode('list');
    setSelectedPlan(null);
  }

  function handleCancel() {
    setViewMode('list');
    setSelectedPlan(null);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Plans</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Manage Donum plan templates (Defund, Diversion, Divest) and their requirements.
            </p>
          </div>
          {viewMode === 'list' && canEdit('/admin/plans') && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Create Plan
            </button>
          )}
        </div>

        {viewMode === 'list' && (
          <PlanList onEdit={handleEdit} />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-4xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
              {viewMode === 'create' ? 'Create New Plan' : 'Edit Plan'}
            </h2>
            <PlanForm
              plan={viewMode === 'edit' ? selectedPlan : null}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
