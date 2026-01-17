'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { canUserAccessPage, type UserRole } from '@/lib/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireEdit?: boolean; // If true, requires canEdit permission, not just canView
  requireDelete?: boolean; // If true, requires canDelete permission
}

export function PermissionGuard({ 
  children, 
  fallback,
  requireEdit = false,
  requireDelete = false 
}: PermissionGuardProps) {
  const { user, role, departments, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      // Wait for auth to finish loading
      if (loading) {
        return;
      }

      // If no user, deny access
      if (!user || !role) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      // Super admins and admins always have access
      if (role === 'donum_super_admin' || role === 'donum_admin') {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // External users don't have admin access
      if (['donum_member', 'donum_lead', 'donum_prospect', 'donum_partner'].includes(role)) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      // Staff users need department-based access
      if (role === 'donum_staff') {
        if (!departments || departments.length === 0) {
          setHasAccess(false);
          setChecking(false);
          return;
        }

        try {
          const canAccess = await canUserAccessPage(
            role as UserRole,
            departments,
            pathname
          );

          if (!canAccess) {
            setHasAccess(false);
            setChecking(false);
            return;
          }

          // If requireEdit or requireDelete, check those permissions too
          // For now, we'll just check canView - can add more granular checks later
          // TODO: Add canEdit and canDelete checks when needed
          
          setHasAccess(true);
          setChecking(false);
        } catch (error) {
          console.error('[PermissionGuard] Error checking permissions:', error);
          setHasAccess(false);
          setChecking(false);
        }
        return;
      }

      // Default: deny access
      setHasAccess(false);
      setChecking(false);
    }

    checkPermission();
  }, [user, role, departments, loading, pathname]);

  // Show fallback while checking
  if (checking || loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--text-secondary)]">Checking permissions...</p>
      </div>
    );
  }

  // If no access, show access denied or redirect
  if (hasAccess === false) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Access Denied
        </h1>
        <p className="text-[var(--text-secondary)] mb-6 text-center max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="px-4 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
