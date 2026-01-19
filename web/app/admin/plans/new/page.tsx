'use client';

import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { PlanForm } from '@/components/admin/plans/PlanForm';
import { useState, useRef } from 'react';

export default function CreatePlanPage() {
  const router = useRouter();
  const formSubmitRef = useRef<HTMLButtonElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleSuccess() {
    router.push('/admin/plans');
  }

  function handleCancel() {
    router.back();
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Create New Plan
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Create a new Donum plan template with custom requirements and settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
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
                  'Create Plan'
                )}
              </button>
            </div>
          </div>
          <PlanForm
            plan={null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            submitRef={formSubmitRef}
            onLoadingChange={setIsSaving}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
