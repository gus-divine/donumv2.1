'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { PlanForm } from '@/components/admin/plans/PlanForm';
import { getPlanById, type DonumPlan } from '@/lib/api/plans';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params?.id as string;
  const { canEdit } = usePermissions('/admin/plans');
  const [plan, setPlan] = useState<DonumPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const formSubmitRef = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!planId) {
      setError('Plan ID is required');
      setLoading(false);
      return;
    }

    async function loadPlan() {
      try {
        setLoading(true);
        setError(null);
        
        const planData = await getPlanById(planId);
        
        if (!planData) {
          setError('Plan not found');
        } else {
          setPlan(planData);
        }
      } catch (err) {
        console.error('[PlanDetailPage] Error loading plan:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [planId]);

  // Check if we should start in edit mode
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true' && plan && canEdit('/admin/plans')) {
      setShowEditForm(true);
      // Remove the query parameter from URL without reloading
      router.replace(`/admin/plans/${planId}`, { scroll: false });
    }
  }, [searchParams, plan, canEdit, planId, router]);

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

  function handleEdit() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setShowEditForm(true);
  }

  function handleEditSuccess() {
    setHasUnsavedChanges(false);
    setShowEditForm(false);
    // Reload plan data
    if (planId) {
      getPlanById(planId).then(planData => {
        if (planData) setPlan(planData);
      });
    }
  }

  function handleEditCancel() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    setShowEditForm(false);
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
                <Skeleton height="2rem" width="16rem" />
                <Skeleton height="1rem" width="30rem" />
              </div>
              <Skeleton height="2rem" width="7rem" />
            </div>

            {/* Plan Information Skeleton */}
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="8rem" />
                    <Skeleton height="1.25rem" width="12rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Benefits Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="12rem" className="mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton height="1.25rem" width="1.25rem" variant="circular" />
                    <Skeleton height="1rem" width="20rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Eligibility Criteria Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton height="0.875rem" width="10rem" />
                    <Skeleton height="1rem" width="25rem" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !plan) {
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
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Plan not found'}</p>
            </div>
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
            ← Back
          </button>

          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {plan.name}
              </h1>
              {plan.description && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {plan.description}
                </p>
              )}
            </div>
            {canEdit('/admin/plans') && !showEditForm && (
              <button
                onClick={handleEdit}
                className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                Edit Plan
              </button>
            )}
          </div>

          {showEditForm && (
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Edit Plan
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Update plan information and settings
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleEditCancel}
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
                    'Update Plan'
                  )}
                </button>
              </div>
            </div>
          )}

          {!showEditForm && (
            <>
              {/* Plan Information */}
              <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Plan Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Code</span>
                    <p className="text-[var(--text-primary)] font-mono">{plan.code}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Name</span>
                    <p className="text-[var(--text-primary)]">{plan.name}</p>
                  </div>
                  {plan.description && (
                    <div className="space-y-1 md:col-span-2">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Description</span>
                      <p className="text-[var(--text-primary)]">{plan.description}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tax Deduction</span>
                    <p className="text-[var(--text-primary)]">{plan.tax_deduction_percent}%</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                    <span className={`inline-flex items-center text-xs font-medium ${
                      plan.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {plan.min_income && (
                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Minimum Income</span>
                      <p className="text-[var(--text-primary)]">${plan.min_income.toLocaleString()}</p>
                    </div>
                  )}
                  {plan.min_assets && (
                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Minimum Assets</span>
                      <p className="text-[var(--text-primary)]">${plan.min_assets.toLocaleString()}</p>
                    </div>
                  )}
                  {plan.min_age && (
                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Minimum Age</span>
                      <p className="text-[var(--text-primary)]">{plan.min_age}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Requires Charitable Intent</span>
                    <span className={`inline-flex items-center text-xs font-medium ${
                      plan.requires_charitable_intent
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {plan.requires_charitable_intent ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {plan.required_asset_types && plan.required_asset_types.length > 0 && (
                    <div className="space-y-1 md:col-span-2">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Required Asset Types</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {plan.required_asset_types.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="space-y-1 md:col-span-2">
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Benefits</span>
                      <ul className="list-disc list-inside space-y-1">
                        {plan.benefits.map((benefit, index) => (
                          <li key={index} className="text-[var(--text-primary)] text-sm">{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {showEditForm && plan && (
            <PlanForm
              plan={plan}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
              submitRef={formSubmitRef}
              onLoadingChange={setIsSaving}
              onHasChangesChange={setHasUnsavedChanges}
            />
          )}
        </div>
      </main>
    </PermissionGuard>
  );
}
