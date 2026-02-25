'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function UserPortalPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (role === 'donum_prospect') router.replace('/user/prospect/dashboard');
    else if (role === 'donum_member') router.replace('/user/member/dashboard');
    else router.replace('/user/prospect/dashboard');
  }, [role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="animate-pulse text-[var(--text-secondary)]">Loading...</div>
    </div>
  );
}
