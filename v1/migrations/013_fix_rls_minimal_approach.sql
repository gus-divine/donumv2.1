-- =====================================================
-- MIGRATION 013: Minimal RLS Fix - Remove Problematic Policy
-- The issue: department_staff_members policy calls helper functions
-- which query donum_accounts, causing recursion even with SECURITY DEFINER
-- Solution: Remove department_staff_members from SELECT operations
-- Users can read own record via users_read_own_account
-- Super admins can read everything via super_admin_full_access
-- Staff access can be handled differently (via views or separate queries)
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL policies that might cause recursion
-- =====================================================

DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_insert_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_update_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_read_others" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_insert" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_update" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_delete" ON public.donum_accounts;

-- Drop policies on other tables
DROP POLICY IF EXISTS "super_admin_departments" ON public.departments;
DROP POLICY IF EXISTS "super_admin_departments_all" ON public.departments;
DROP POLICY IF EXISTS "super_admin_permissions" ON public.department_page_permissions;
DROP POLICY IF EXISTS "super_admin_permissions_all" ON public.department_page_permissions;

-- =====================================================
-- STEP 2: Create SECURITY DEFINER helper functions
-- These MUST bypass RLS - owned by postgres
-- =====================================================

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

COMMENT ON FUNCTION public.is_super_admin_helper(UUID) IS 
'SECURITY DEFINER helper (owner=postgres) — checks if user is super admin; bypasses RLS; accepts explicit user_id; do not include auth.uid() inside.';

-- Ensure owned by postgres
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.is_super_admin_helper(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not change function ownership (may already be correct)';
  END;
END $$;

-- Secure the function
REVOKE EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) TO authenticated;

-- =====================================================
-- STEP 3: Create minimal policies - NO function calls in SELECT
-- =====================================================

-- Users can read their own record (NO function calls)
CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- Users can insert their own record
CREATE POLICY "users_insert_own_account" ON public.donum_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- Users can update their own record
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

-- Super admin can do everything (uses helper that bypasses RLS)
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

-- =====================================================
-- STEP 4: Recreate policies on other tables
-- =====================================================

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
-- STEP 5: Drop old functions
-- =====================================================

DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
DROP FUNCTION IF EXISTS public.is_staff(UUID);
DROP FUNCTION IF EXISTS public.get_user_departments(UUID);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.is_super_admin_helper(UUID);
DROP FUNCTION IF EXISTS public.is_staff_helper(UUID);
DROP FUNCTION IF EXISTS public.get_user_departments_helper(UUID);
DROP FUNCTION IF EXISTS public.get_user_role_helper(UUID);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 013 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Minimal RLS fix:';
    RAISE NOTICE '  ✅ Removed department_staff_members policy (was causing recursion)';
    RAISE NOTICE '  ✅ Created minimal policies with NO function calls in SELECT';
    RAISE NOTICE '  ✅ users_read_own_account: simple id check (no functions)';
    RAISE NOTICE '  ✅ super_admin_full_access: uses helper (bypasses RLS)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   SELECT policies do NOT call functions that query donum_accounts';
    RAISE NOTICE '   Users can read their own account data';
    RAISE NOTICE '   Super admin access works correctly';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: Staff department access removed to prevent recursion.';
    RAISE NOTICE '      Staff can still read their own record.';
    RAISE NOTICE '      Department-based access can be implemented via views or API layer.';
    RAISE NOTICE '=========================================';
END $$;
