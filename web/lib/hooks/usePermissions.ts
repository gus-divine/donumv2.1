'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserAccessiblePages, canUserAccessPage, type UserRole, type PagePermission } from '@/lib/permissions';

interface UsePermissionsResult {
  permissions: PagePermission[];
  canView: (pagePath: string) => boolean;
  canEdit: (pagePath: string) => boolean;
  canDelete: (pagePath: string) => boolean;
  loading: boolean;
}

/**
 * Hook to get user permissions for the current page
 * @param pagePath - Optional page path to check. If not provided, uses current pathname
 */
export function usePermissions(pagePath?: string): UsePermissionsResult {
  const { role, departments, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (authLoading || !role) {
        return;
      }

      try {
        const pages = await getUserAccessiblePages(role as UserRole, departments || []);
        setPermissions(pages);
      } catch (error) {
        console.error('[usePermissions] Error loading permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [role, departments, authLoading]);

  function canView(path: string): boolean {
    if (!role) return false;
    
    // Super admins and admins can view everything
    if (role === 'donum_super_admin' || role === 'donum_admin') {
      return true;
    }

    const perm = permissions.find(p => p.pagePath === path);
    return perm?.canView ?? false;
  }

  function canEdit(path: string): boolean {
    if (!role) return false;
    
    // Super admins and admins can edit everything
    if (role === 'donum_super_admin' || role === 'donum_admin') {
      return true;
    }

    const perm = permissions.find(p => p.pagePath === path);
    return perm?.canEdit ?? false;
  }

  function canDelete(path: string): boolean {
    if (!role) return false;
    
    // Super admins and admins can delete everything
    if (role === 'donum_super_admin' || role === 'donum_admin') {
      return true;
    }

    const perm = permissions.find(p => p.pagePath === path);
    return perm?.canDelete ?? false;
  }

  return {
    permissions,
    canView,
    canEdit,
    canDelete,
    loading: loading || authLoading,
  };
}
