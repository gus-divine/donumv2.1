'use client';

import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { StaffForm } from '@/components/admin/staff/StaffForm';

export default function NewStaffPage() {
  const router = useRouter();

  function handleSuccess() {
    router.push('/admin/staff');
  }

  function handleCancel() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/staff');
    }
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

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Add New Staff Member
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a new staff member account. They will receive login credentials via email.
            </p>
          </div>

          <StaffForm
            staff={null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
