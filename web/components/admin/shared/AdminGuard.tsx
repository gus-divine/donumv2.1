'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (loading) {
      return;
    }
    
    // Allow donum_super_admin, donum_admin, and donum_staff (staff need department access checked per-page)
    const isAdmin = role === 'donum_super_admin' || role === 'donum_admin';
    const isStaff = role === 'donum_staff';
    
    if (!user || (!isAdmin && !isStaff)) {
      // Redirect non-admin/staff users
      router.push('/auth/signin');
    }
  }, [user, role, loading, router]);

  // Show fallback while loading or if not admin/staff
  if (loading) {
    return fallback || null;
  }
  
  const isAdmin = role === 'donum_super_admin' || role === 'donum_admin';
  const isStaff = role === 'donum_staff';
  
  if (!user || (!isAdmin && !isStaff)) {
    return fallback || null;
  }

  // User is admin or staff, render children (page-level guards will check department access)
  return <>{children}</>;
}
