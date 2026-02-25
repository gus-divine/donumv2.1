'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Sign up is disabled. Users are created by admins.
 * Redirect to sign in.
 */
export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/signin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--text-secondary)]">Redirecting...</p>
    </div>
  );
}
