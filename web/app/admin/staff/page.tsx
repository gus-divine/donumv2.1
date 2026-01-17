'use client';

import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';

export default function StaffPage() {
  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Staff Management</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Donum 2.1 — Manage staff members and their department assignments.</p>
      </main>
    </PermissionGuard>
  );
}
