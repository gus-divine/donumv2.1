'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { session, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && role) {
      // Redirect to the appropriate sub-portal based on role
      if (role === 'donum_prospect') {
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (!path.startsWith('/user/prospect') && !path.startsWith('/user/member')) {
          router.replace('/user/prospect/dashboard');
        }
      } else if (role === 'donum_member') {
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (!path.startsWith('/user/member')) {
          router.replace('/user/member/dashboard');
        }
      } else if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push('/auth/signin');
      } else if (role === 'donum_partner') {
        router.push('/auth/signin');
      }
    }

    if (!loading && !session) {
      router.push('/auth/signin?redirect=' + encodeURIComponent('/user/prospect/dashboard'));
    }
  }, [session, role, loading, router]);

  if (loading || !session) return null;

  return <>{children}</>;
}
