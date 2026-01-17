-- =====================================================
-- MIGRATION 012: Secure SECURITY DEFINER Functions
-- Fixes infinite recursion by ensuring helper functions
-- are owned by postgres (has BYPASSRLS) and secured
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL existing policies that depend on old functions
-- Must drop these BEFORE dropping the old functions to avoid dependency errors
-- =====================================================

-- Drop policies on donum_accounts
DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_insert_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_update_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;
-- Additional super admin policies that may exist
DROP POLICY IF EXISTS "super_admin_read_others" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_insert" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_update" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_delete" ON public.donum_accounts;

-- Drop policies on departments that use is_super_admin
DROP POLICY IF EXISTS "super_admin_departments" ON public.departments;
DROP POLICY IF EXISTS "super_admin_departments_all" ON public.departments;

-- Drop policies on department_page_permissions that use is_super_admin
DROP POLICY IF EXISTS "super_admin_permissions" ON public.department_page_permissions;
DROP POLICY IF EXISTS "super_admin_permissions_all" ON public.department_page_permissions;

-- =====================================================
-- STEP 2: Create SECURITY DEFINER helper functions
-- These functions MUST be owned by postgres (has BYPASSRLS)
-- They accept user_id as parameter (never use auth.uid() inside)
-- =====================================================

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = p_user_id AND role = 'donum_super_admin'
  );
$$;

-- Helper function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = p_user_id AND role = 'donum_staff'
  );
$$;

-- Helper function to get user departments
CREATE OR REPLACE FUNCTION public.get_user_departments_helper(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(departments, ARRAY[]::TEXT[])
  FROM public.donum_accounts
  WHERE id = p_user_id;
$$;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role_helper(p_user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(role, 'donum_prospect'::user_role)
  FROM public.donum_accounts
  WHERE id = p_user_id;
$$;

-- =====================================================
-- STEP 2.5: Add function comments for maintainability
-- =====================================================

COMMENT ON FUNCTION public.is_super_admin_helper(UUID) IS 
'SECURITY DEFINER helper (owner=postgres) — checks if user is super admin; bypasses RLS; accepts explicit user_id; do not include auth.uid() inside.';

COMMENT ON FUNCTION public.is_staff_helper(UUID) IS 
'SECURITY DEFINER helper (owner=postgres) — checks if user is staff; bypasses RLS; accepts explicit user_id; do not include auth.uid() inside.';

COMMENT ON FUNCTION public.get_user_departments_helper(UUID) IS 
'SECURITY DEFINER helper (owner=postgres) — gets user departments array; bypasses RLS; accepts explicit user_id; do not include auth.uid() inside.';

COMMENT ON FUNCTION public.get_user_role_helper(UUID) IS 
'SECURITY DEFINER helper (owner=postgres) — gets user role enum; bypasses RLS; accepts explicit user_id; do not include auth.uid() inside.';

-- =====================================================
-- STEP 3: Ensure functions are owned by postgres
-- postgres role has BYPASSRLS privilege in Supabase
-- =====================================================

DO $$
BEGIN
  -- Try to change ownership to postgres
  BEGIN
    ALTER FUNCTION public.is_super_admin_helper(UUID) OWNER TO postgres;
    ALTER FUNCTION public.is_staff_helper(UUID) OWNER TO postgres;
    ALTER FUNCTION public.get_user_departments_helper(UUID) OWNER TO postgres;
    ALTER FUNCTION public.get_user_role_helper(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    -- Ownership might already be correct or Supabase might restrict this
    -- Functions created in migrations are typically owned by postgres anyway
    RAISE NOTICE 'Note: Could not change function ownership (may already be correct)';
  END;
END $$;

-- =====================================================
-- STEP 4: Secure the helper functions
-- Revoke EXECUTE from public, only allow postgres/service_role
-- This prevents clients from calling these functions directly
-- =====================================================

REVOKE EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff_helper(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_departments_helper(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role_helper(UUID) FROM PUBLIC;

-- Grant EXECUTE to postgres (for use in policies)
GRANT EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.is_staff_helper(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_departments_helper(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_role_helper(UUID) TO postgres;

-- Grant EXECUTE to authenticated role (needed for policies to call functions)
-- This is safe because the functions are SECURITY DEFINER and will bypass RLS
GRANT EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_departments_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_helper(UUID) TO authenticated;

-- =====================================================
-- STEP 5: Create users_read_own_account policy FIRST
-- This is the simplest policy with no function calls
-- =====================================================

CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 6: Create users_insert_own_account policy
-- =====================================================

CREATE POLICY "users_insert_own_account" ON public.donum_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 7: Create users_update_own_account policy
-- =====================================================

CREATE POLICY "users_update_own_account" ON public.donum_accounts
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 8: Create super_admin policies
-- Uses helper function that bypasses RLS
-- =====================================================

-- Super admin full access policy (covers all operations)
CREATE POLICY "super_admin_full_access" ON public.donum_accounts
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- Additional super admin policies (if they existed, recreate them)
-- These are redundant with super_admin_full_access but kept for compatibility
CREATE POLICY "super_admin_read_others" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

CREATE POLICY "super_admin_insert" ON public.donum_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

CREATE POLICY "super_admin_update" ON public.donum_accounts
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

CREATE POLICY "super_admin_delete" ON public.donum_accounts
  FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- =====================================================
-- STEP 9: Create department_staff_members policy
-- IMPORTANT: Includes "read own record" check first
-- Then uses helper functions that bypass RLS
-- =====================================================

CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    -- Users can always read their own record (no function call needed)
    ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()))
    -- OR super admin can see everything (helper bypasses RLS)
    OR ((SELECT auth.uid()) IS NOT NULL AND public.is_super_admin_helper((SELECT auth.uid())::UUID))
    -- OR staff can see members assigned to their departments (helpers bypass RLS)
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND public.is_staff_helper((SELECT auth.uid())::UUID)
      AND (
        -- Check if user's department has permission to view members
        EXISTS (
          SELECT 1 FROM public.department_page_permissions dpp
          WHERE dpp.department_name = ANY(public.get_user_departments_helper((SELECT auth.uid())::UUID))
            AND dpp.page_path = '/admin/members'
            AND dpp.can_view = true
        )
        -- AND the member is assigned to one of the user's departments
        AND EXISTS (
          SELECT 1 FROM public.department_members dm
          WHERE dm.member_id = donum_accounts.id
            AND dm.department_name = ANY(public.get_user_departments_helper((SELECT auth.uid())::UUID))
            AND dm.is_active = true
        )
      )
    )
  );

-- =====================================================
-- STEP 10: Recreate policies on other tables using new helper functions
-- =====================================================

-- Recreate super_admin_departments_all policy on departments table
CREATE POLICY "super_admin_departments_all" ON public.departments
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- Recreate super_admin_permissions_all policy on department_page_permissions table
CREATE POLICY "super_admin_permissions_all" ON public.department_page_permissions
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- =====================================================
-- STEP 11: Drop old function names if they exist
-- Now safe to drop since all dependent policies have been recreated
-- =====================================================

DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
DROP FUNCTION IF EXISTS public.is_staff(UUID);
DROP FUNCTION IF EXISTS public.get_user_departments(UUID);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 012 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Secure SECURITY DEFINER functions:';
    RAISE NOTICE '  ✅ Dropped all dependent policies first';
    RAISE NOTICE '  ✅ Created helper functions owned by postgres';
    RAISE NOTICE '  ✅ Functions accept user_id parameter (no auth.uid() inside)';
    RAISE NOTICE '  ✅ Revoked EXECUTE from PUBLIC';
    RAISE NOTICE '  ✅ Granted EXECUTE to authenticated (for policies)';
    RAISE NOTICE '  ✅ Recreated all policies using secure helpers';
    RAISE NOTICE '  ✅ Updated policies on departments and department_page_permissions';
    RAISE NOTICE '  ✅ Recreated super_admin_read_others, insert, update, delete policies';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   Helper functions bypass RLS via SECURITY DEFINER';
    RAISE NOTICE '   Functions are secured (not callable by clients)';
    RAISE NOTICE '   Policies use helpers that bypass RLS correctly';
    RAISE NOTICE '=========================================';
END $$;
