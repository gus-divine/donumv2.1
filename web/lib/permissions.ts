/**
 * Permission Helpers for Donum 2.1
 * Department-based permissions using department_page_permissions table
 */

import { createSupabaseClient } from './supabase/client';

export interface PagePermission {
  pagePath: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type UserRole = 
  | 'donum_prospect'
  | 'donum_lead'
  | 'donum_member'
  | 'donum_staff'
  | 'donum_admin'
  | 'donum_partner'
  | 'donum_super_admin';

/**
 * Get all pages a user can access based on their role and departments
 * @param userRole - User's role
 * @param userDepartments - User's departments array
 * @returns Array of page permissions
 */
export async function getUserAccessiblePages(
  userRole: UserRole,
  userDepartments: string[]
): Promise<PagePermission[]> {
  // Super admins and admins have access to all pages
  if (userRole === 'donum_super_admin' || userRole === 'donum_admin') {
    const allPages = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/staff',
      '/admin/members',
      '/admin/prospects',
      '/admin/applications',
      '/admin/loans',
      '/admin/departments',
      '/admin/finance',
      '/admin/system',
    ];

    return allPages.map(path => ({
      pagePath: path,
      canView: true,
      canEdit: true,
      canDelete: true,
    }));
  }

  // External users don't have admin page access
  if (['donum_member', 'donum_lead', 'donum_prospect', 'donum_partner'].includes(userRole)) {
    return [];
  }

  // Staff users get pages based on department permissions
  if (userRole === 'donum_staff' && userDepartments.length === 0) {
    return [];
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('department_page_permissions')
      .select('page_path, can_view, can_edit, can_delete')
      .in('department_name', userDepartments)
      .eq('can_view', true);

    if (error) {
      console.error('Error fetching page permissions:', error);
      return [];
    }

    // Group by page_path and combine permissions (OR logic - if any department allows it)
    const pageMap = new Map<string, PagePermission>();

    data?.forEach((perm) => {
      const existing = pageMap.get(perm.page_path);
      if (!existing) {
        pageMap.set(perm.page_path, {
          pagePath: perm.page_path,
          canView: perm.can_view,
          canEdit: perm.can_edit,
          canDelete: perm.can_delete,
        });
      } else {
        // If any department allows edit/delete, allow it
        existing.canEdit = existing.canEdit || perm.can_edit;
        existing.canDelete = existing.canDelete || perm.can_delete;
      }
    });

    return Array.from(pageMap.values());
  } catch (error) {
    console.error('Error fetching page permissions:', error);
    return [];
  }
}

/**
 * Check if a user can access a specific page
 * @param userRole - User's role
 * @param userDepartments - User's departments array
 * @param pagePath - Page path to check (e.g., '/admin/users')
 * @returns true if user can access the page
 */
export async function canUserAccessPage(
  userRole: UserRole,
  userDepartments: string[],
  pagePath: string
): Promise<boolean> {
  // Super admins and admins have access to all pages
  if (userRole === 'donum_super_admin' || userRole === 'donum_admin') {
    return true;
  }

  // External users don't have admin page access
  if (['donum_member', 'donum_lead', 'donum_prospect', 'donum_partner'].includes(userRole)) {
    return false;
  }

  // Staff users need department-based access
  if (userRole === 'donum_staff' && userDepartments.length === 0) {
    return false;
  }

  // Check department permissions
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('department_page_permissions')
      .select('can_view')
      .in('department_name', userDepartments)
      .eq('page_path', pagePath)
      .eq('can_view', true)
      .limit(1);

    if (error) {
      console.error('Error checking page permissions:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking page permissions:', error);
    return false;
  }
}

/**
 * Get permissions for a specific page
 * @param userRole - User's role
 * @param userDepartments - User's departments array
 * @param pagePath - Page path to check (e.g., '/admin/users')
 * @returns PagePermission object with canView, canEdit, canDelete
 */
export async function getPagePermissions(
  userRole: UserRole,
  userDepartments: string[],
  pagePath: string
): Promise<PagePermission | null> {
  // Super admins and admins have full access to all pages
  if (userRole === 'donum_super_admin' || userRole === 'donum_admin') {
    return {
      pagePath,
      canView: true,
      canEdit: true,
      canDelete: true,
    };
  }

  // External users don't have admin page access
  if (['donum_member', 'donum_lead', 'donum_prospect', 'donum_partner'].includes(userRole)) {
    return null;
  }

  // Staff users need department-based access
  if (userRole === 'donum_staff' && userDepartments.length === 0) {
    return null;
  }

  // Check department permissions
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('department_page_permissions')
      .select('can_view, can_edit, can_delete')
      .in('department_name', userDepartments)
      .eq('page_path', pagePath)
      .eq('can_view', true);

    if (error) {
      console.error('Error fetching page permissions:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Combine permissions from all departments (OR logic)
    // If any department allows edit/delete, allow it
    const combined: PagePermission = {
      pagePath,
      canView: true, // Already filtered by can_view = true
      canEdit: data.some(p => p.can_edit),
      canDelete: data.some(p => p.can_delete),
    };

    return combined;
  } catch (error) {
    console.error('Error fetching page permissions:', error);
    return null;
  }
}
