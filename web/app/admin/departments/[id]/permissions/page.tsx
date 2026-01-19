'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { PermissionAssignment } from '@/components/admin/departments/PermissionAssignment';
import { getDepartment, type Department } from '@/lib/api/departments';

export default function DepartmentPermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const departmentId = params?.id as string;
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!departmentId) {
      setError('Department ID is required');
      setLoading(false);
      return;
    }

    async function loadDepartment() {
      try {
        setLoading(true);
        setError(null);
        const deptData = await getDepartment(departmentId);
        if (!deptData) {
          setError('Department not found');
        } else {
          setDepartment(deptData);
        }
      } catch (err) {
        console.error('[DepartmentPermissionsPage] Error loading department:', err);
        setError(err instanceof Error ? err.message : 'Failed to load department');
      } finally {
        setLoading(false);
      }
    }

    loadDepartment();
  }, [departmentId]);

  function handleClose() {
    router.back();
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading permissions...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !department) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <h1 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h1>
              <p className="text-[var(--text-secondary)]">{error || 'Department not found'}</p>
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
            onClick={handleClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>
          <PermissionAssignment
            department={department}
            onClose={handleClose}
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
