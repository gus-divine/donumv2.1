'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAllPlans, deletePlan, type DonumPlan } from '@/lib/api/plans';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanListProps {
  onEdit: (plan: DonumPlan) => void;
  onViewDetails?: (plan: DonumPlan) => void;
}

export function PlanList({ onEdit, onViewDetails }: PlanListProps) {
  const { canEdit, canDelete } = usePermissions('/admin/plans');
  const [plans, setPlans] = useState<DonumPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<DonumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const loadingRef = useRef(false);

  function applyFilters(plansList: DonumPlan[], search: string, status: 'all' | 'active' | 'inactive') {
    let filtered = [...plansList];

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.code.toLowerCase().includes(searchLower) ||
        plan.name.toLowerCase().includes(searchLower) ||
        (plan.description && plan.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(plan =>
        status === 'active' ? plan.is_active : !plan.is_active
      );
    }

    setFilteredPlans(filtered);
  }

  const loadPlans = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await getAllPlans(true); // Include inactive plans
      setPlans(data);
      applyFilters(data, searchTerm, statusFilter);
    } catch (err) {
      console.error('[PlanList] Error loading plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    applyFilters(plans, searchTerm, statusFilter);
  }, [plans, searchTerm, statusFilter]);

  function handleDeleteClick(id: string) {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;

    setShowDeleteConfirm(false);
    setDeletingId(deleteTargetId);
    try {
      await deletePlan(deleteTargetId);
      await loadPlans();
      setDeleteTargetId(null);
    } catch (err) {
      console.error('[PlanList] Error deleting plan:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete plan');
      setDeleteTargetId(null);
    } finally {
      setDeletingId(null);
    }
  }

  function handleDeleteCancel() {
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as 'all' | 'active' | 'inactive');
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter('all');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filters Skeleton */}
        <div className="bg-[var(--surface)] rounded-lg p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Skeleton height="2.5rem" width="100%" className="max-w-md" />
            <Skeleton height="2.5rem" width="10rem" />
            <Skeleton height="2.5rem" width="8rem" />
            <Skeleton height="2.5rem" width="8rem" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="10rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="12rem" />
                </th>
                <th className="text-left p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
                <th className="text-right p-4">
                  <Skeleton height="1rem" width="6rem" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="p-4">
                    <Skeleton height="1rem" width="12rem" />
                  </td>
                  <td className="p-4">
                    <Skeleton height="1rem" width="20rem" />
                  </td>
                  <td className="p-4">
                    <Skeleton height="1rem" width="6rem" />
                  </td>
                  <td className="p-4">
                    <Skeleton height="1.25rem" width="6rem" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                      <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[var(--surface)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                id="plan-search"
                name="plan-search"
                type="text"
                placeholder="Search plans by code, name, or description..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </form>

          {/* Status Filter */}
          <Select
            id="plan-status-filter"
            name="plan-status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            className="w-40"
          />

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded border border-[var(--border)] transition-colors"
          >
            Clear Filters
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadPlans}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Plans Table */}
      {filteredPlans.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-secondary)]">
            {searchTerm || statusFilter !== 'all'
              ? 'No plans found matching your filters.'
              : 'No plans found. Plans will appear here once created.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Name</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Description</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Tax Deduction</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                  onClick={() => onViewDetails ? onViewDetails(plan) : undefined}
                >
                  <td className="p-4">
                    <div className="font-medium text-[var(--text-primary)]">{plan.name}</div>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {plan.description || '-'}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] text-sm">
                    {plan.tax_deduction_percent}%
                  </td>
                  <td className="p-4">
                    {plan.is_active ? (
                      <span className="inline-flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-gray-600 dark:text-gray-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit('/admin/plans') && (
                        <button
                          onClick={() => onEdit(plan)}
                          className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete('/admin/plans') && (
                        <button
                          onClick={() => handleDeleteClick(plan.id)}
                          disabled={deletingId === plan.id}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      {deleteTargetId && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Plan"
          message="Are you sure you want to delete this plan? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Error Message Dialog */}
      {errorMessage && (
        <ConfirmationDialog
          isOpen={!!errorMessage}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          variant="danger"
          showCancel={false}
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}
