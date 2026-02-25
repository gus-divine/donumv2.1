'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getPortalBaseUrl } from '@/lib/subdomain';

interface TeamGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TeamGuard({ children, fallback }: TeamGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isStaff = role === 'donum_staff';
    const isAdmin = role === 'donum_super_admin' || role === 'donum_admin';

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Admins on team subdomain → redirect to admin subdomain
    if (isAdmin) {
      window.location.href = `${getPortalBaseUrl('admin')}/admin/dashboard`;
      return;
    }

    if (!isStaff) {
      router.push('/auth/signin');
    }
  }, [user, role, loading, router]);

  if (loading) return fallback || null;

  const isStaff = role === 'donum_staff';
  if (!user || !isStaff) return fallback || null;

  return <>{children}</>;
}
