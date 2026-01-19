'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { StaffDetail } from '@/components/admin/staff/StaffDetail';
import { getUser, type User } from '@/lib/api/users';

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;
  const [staff, setStaff] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) {
      setError('Staff ID is required');
      setLoading(false);
      return;
    }

    async function loadStaff() {
      try {
        setLoading(true);
        setError(null);
        const staffData = await getUser(staffId);
        if (!staffData) {
          setError('Staff member not found');
        } else {
          // Check if it's a staff role
          const staffRoles = ['donum_staff', 'donum_admin', 'donum_super_admin'];
          if (!staffRoles.includes(staffData.role)) {
            setError('This user is not a staff member');
          } else {
            setStaff(staffData);
          }
        }
      } catch (err) {
        console.error('[StaffDetailPage] Error loading staff:', err);
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
  }, [staffId]);

  function handleBack() {
    router.push('/admin/staff');
  }

  function handleStaffUpdated(updatedStaff: User) {
    setStaff(updatedStaff);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading staff details...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !staff) {
    return (
      <PermissionGuard>
        <main className="min-h-screen p-8">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            ← Back to Staff
          </button>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
            <p className="text-[var(--text-secondary)] mb-4">{error || 'Staff member not found'}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
            >
              Back to Staff
            </button>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen p-8">
        <button
          onClick={handleBack}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
        >
          ← Back to Staff
        </button>
        <StaffDetail staff={staff} onBack={handleBack} onStaffUpdated={handleStaffUpdated} />
      </main>
    </PermissionGuard>
  );
}
