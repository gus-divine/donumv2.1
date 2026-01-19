'use client';

import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PlanList } from '@/components/admin/plans/PlanList';
import type { DonumPlan } from '@/lib/api/plans';

export default function PlansPage() {
  const router = useRouter();
  const { canEdit } = usePermissions('/admin/plans');

  function handleCreate() {
    router.push('/admin/plans/new');
  }

  function handleEdit(plan: DonumPlan) {
    router.push(`/admin/plans/${plan.id}?edit=true`);
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Plans</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Manage Donum plan templates (Defund, Diversion, Divest) and their requirements.
            </p>
          </div>
          {canEdit('/admin/plans') && (
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              + Create Plan
            </button>
          )}
        </div>

        <PlanList 
          onEdit={handleEdit}
          onViewDetails={(plan) => router.push(`/admin/plans/${plan.id}`)}
        />
      </main>
    </PermissionGuard>
  );
}
