'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getPortalBaseUrl } from '@/lib/subdomain';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isAdmin = role === 'donum_super_admin' || role === 'donum_admin';
    const isStaff = role === 'donum_staff';

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Staff on admin subdomain → redirect to team subdomain
    if (isStaff) {
      window.location.href = `${getPortalBaseUrl('team')}/team/dashboard`;
      return;
    }

    if (!isAdmin) {
      router.push('/auth/signin');
    }
  }, [user, role, loading, router]);

  if (loading) return fallback || null;

  const isAdmin = role === 'donum_super_admin' || role === 'donum_admin';
  if (!user || !isAdmin) return fallback || null;

  return <>{children}</>;
}
