-- Migration: Add admin helper function and fix prospect_staff_assignments policies
-- Date: 2026-01-18
-- Description: 
--   - Creates is_admin_helper function (similar to is_super_admin_helper) to bypass RLS
--   - Updates prospect_staff_assignments policies to use helper functions
-- =====================================================

-- Create helper function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role user_role;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT role INTO v_role
  FROM public.donum_accounts
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_role = 'donum_admin', false);
END;
$$;

-- Ensure function is owned by postgres
ALTER FUNCTION public.is_admin_helper(UUID) OWNER TO postgres;

-- Grant execute permissions
REVOKE EXECUTE ON FUNCTION public.is_admin_helper(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_helper(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin_helper(UUID) TO authenticated;

-- Now update the policies to use the helper function for admin checks
-- Drop existing policies
DROP POLICY IF EXISTS "staff_create_prospect_assignments" ON public.prospect_staff_assignments;
DROP POLICY IF EXISTS "staff_update_prospect_assignments" ON public.prospect_staff_assignments;
DROP POLICY IF EXISTS "staff_delete_prospect_assignments" ON public.prospect_staff_assignments;

-- Recreate create policy using helper function for admin check
CREATE POLICY staff_create_prospect_assignments ON public.prospect_staff_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            -- Admins can create any assignment (using helper function to bypass RLS)
            public.is_admin_helper((SELECT auth.uid())::UUID)
            OR
            -- Regular staff need department membership and edit permissions
            EXISTS (
                SELECT 1
                FROM public.donum_accounts u
                WHERE u.id = ((SELECT auth.uid())::UUID)
                    AND u.role = 'donum_staff'
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_page_permissions dpp
                        WHERE dpp.department_name = ANY(u.departments)
                            AND dpp.page_path IN ('/admin/members', '/admin/applications')
                            AND dpp.can_edit = true
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_members dm
                        WHERE dm.member_id = prospect_id
                            AND dm.department_name = ANY(u.departments)
                            AND dm.is_active = true
                    )
            )
        )
    );

-- Recreate update policy
CREATE POLICY staff_update_prospect_assignments ON public.prospect_staff_assignments
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            -- Admins can update any assignment (using helper function to bypass RLS)
            public.is_admin_helper((SELECT auth.uid())::UUID)
            OR
            -- Regular staff need department membership and edit permissions
            EXISTS (
                SELECT 1
                FROM public.donum_accounts u
                WHERE u.id = ((SELECT auth.uid())::UUID)
                    AND u.role = 'donum_staff'
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_page_permissions dpp
                        WHERE dpp.department_name = ANY(u.departments)
                            AND dpp.page_path IN ('/admin/members', '/admin/applications')
                            AND dpp.can_edit = true
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_members dm
                        WHERE dm.member_id = prospect_id
                            AND dm.department_name = ANY(u.departments)
                            AND dm.is_active = true
                    )
            )
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            -- Admins can update any assignment (using helper function to bypass RLS)
            public.is_admin_helper((SELECT auth.uid())::UUID)
            OR
            -- Regular staff need department membership and edit permissions
            EXISTS (
                SELECT 1
                FROM public.donum_accounts u
                WHERE u.id = ((SELECT auth.uid())::UUID)
                    AND u.role = 'donum_staff'
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_page_permissions dpp
                        WHERE dpp.department_name = ANY(u.departments)
                            AND dpp.page_path IN ('/admin/members', '/admin/applications')
                            AND dpp.can_edit = true
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_members dm
                        WHERE dm.member_id = prospect_id
                            AND dm.department_name = ANY(u.departments)
                            AND dm.is_active = true
                    )
            )
        )
    );

-- Recreate delete policy
CREATE POLICY staff_delete_prospect_assignments ON public.prospect_staff_assignments
    FOR DELETE TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            -- Admins can delete any assignment (using helper function to bypass RLS)
            public.is_admin_helper((SELECT auth.uid())::UUID)
            OR
            -- Regular staff need department membership and edit permissions
            EXISTS (
                SELECT 1
                FROM public.donum_accounts u
                WHERE u.id = ((SELECT auth.uid())::UUID)
                    AND u.role = 'donum_staff'
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_page_permissions dpp
                        WHERE dpp.department_name = ANY(u.departments)
                            AND dpp.page_path IN ('/admin/members', '/admin/applications')
                            AND dpp.can_edit = true
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM public.department_members dm
                        WHERE dm.member_id = prospect_id
                            AND dm.department_name = ANY(u.departments)
                            AND dm.is_active = true
                    )
            )
        )
    );

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Migration 029 applied: Added is_admin_helper function and updated policies';
    RAISE NOTICE '  - Created is_admin_helper() function (SECURITY DEFINER, bypasses RLS)';
    RAISE NOTICE '  - Updated policies to use helper function for admin checks';
    RAISE NOTICE '  - Super admins: Covered by super_admin_prospect_staff_assignments_all policy';
    RAISE NOTICE '  - Admins: Can create/update/delete any assignment (no department requirement)';
    RAISE NOTICE '  - Regular staff: Still require department membership and edit permissions';
END $$;
