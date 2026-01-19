'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { PermissionAssignment } from '@/components/admin/departments/PermissionAssignment';
import { getDepartment, type Department } from '@/lib/api/departments';
import { Skeleton } from '@/components/ui/skeleton';

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
          <div className="max-w-6xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <Skeleton height="1.5rem" width="5rem" />
            </div>

            {/* Header Skeleton */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton height="1.5rem" width="20rem" />
                <Skeleton height="1rem" width="30rem" />
              </div>
              <div className="flex gap-3 shrink-0">
                <Skeleton height="2rem" width="5rem" />
                <Skeleton height="2rem" width="10rem" />
              </div>
            </div>

            {/* Permissions Table Skeleton */}
            <div className="pt-4 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[var(--core-gold)]">
                      <th className="text-left p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                      <th className="text-center p-4">
                        <Skeleton height="1rem" width="5rem" />
                      </th>
                      <th className="text-center p-4">
                        <Skeleton height="1rem" width="5rem" />
                      </th>
                      <th className="text-center p-4">
                        <Skeleton height="1rem" width="6rem" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="p-4">
                          <Skeleton height="1rem" width="16rem" />
                        </td>
                        <td className="p-4 text-center">
                          <Skeleton height="1.5rem" width="3rem" className="mx-auto" variant="rectangular" />
                        </td>
                        <td className="p-4 text-center">
                          <Skeleton height="1.5rem" width="3rem" className="mx-auto" variant="rectangular" />
                        </td>
                        <td className="p-4 text-center">
                          <Skeleton height="1.5rem" width="3rem" className="mx-auto" variant="rectangular" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
