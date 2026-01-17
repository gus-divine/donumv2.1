-- =====================================================
-- MIGRATION 014: Force RLS Bypass in Helper Functions
-- Ensures helper functions truly bypass RLS by using
-- explicit SET LOCAL row_security = off
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL policies that might reference helper functions
-- Must drop these BEFORE dropping or recreating functions
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
DROP POLICY IF EXISTS "super_admin_departments" ON public.departments;
DROP POLICY IF EXISTS "super_admin_departments_all" ON public.departments;
DROP POLICY IF EXISTS "super_admin_permissions" ON public.department_page_permissions;
DROP POLICY IF EXISTS "super_admin_permissions_all" ON public.department_page_permissions;

-- =====================================================
-- STEP 1.5: Drop old helper function if it exists (with CASCADE to handle any remaining policies)
-- This ensures we can recreate it cleanly
-- =====================================================

DROP FUNCTION IF EXISTS public.is_super_admin_helper(UUID) CASCADE;

-- =====================================================
-- STEP 2: Create helper function with EXPLICIT RLS bypass
-- Uses SET LOCAL row_security = off to force bypass
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- EXPLICITLY disable RLS for this function execution
  PERFORM set_config('row_security', 'off', true);
  
  -- Now query donum_accounts - RLS is disabled
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = p_user_id AND role = 'donum_super_admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin_helper(UUID) IS 
'SECURITY DEFINER helper — checks if user is super admin; EXPLICITLY bypasses RLS using set_config; accepts explicit user_id; do not include auth.uid() inside.';

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
-- STEP 3: Create minimal SELECT policy - NO function calls
-- This is the ONLY SELECT policy to prevent recursion
-- =====================================================

CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 4: Create INSERT/UPDATE policies
-- =====================================================

CREATE POLICY "users_insert_own_account" ON public.donum_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

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
-- STEP 5: Create super admin policies for INSERT/UPDATE/DELETE only
-- NOT for SELECT - SELECT is handled by users_read_own_account
-- This prevents recursion because SELECT doesn't call functions
-- =====================================================

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
-- STEP 6: Recreate policies on other tables
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
-- STEP 7: Drop old functions (NOT is_super_admin_helper - we're using it!)
-- Only drop functions that are no longer needed
-- =====================================================

DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
DROP FUNCTION IF EXISTS public.is_staff(UUID);
DROP FUNCTION IF EXISTS public.get_user_departments(UUID);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.is_staff_helper(UUID);
DROP FUNCTION IF EXISTS public.get_user_departments_helper(UUID);
DROP FUNCTION IF EXISTS public.get_user_role_helper(UUID);

-- Note: We do NOT drop is_super_admin_helper because we're creating and using it above

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 014 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Force RLS bypass fix:';
    RAISE NOTICE '  ✅ Helper function uses EXPLICIT set_config to disable RLS';
    RAISE NOTICE '  ✅ SELECT policy has NO function calls (prevents recursion)';
    RAISE NOTICE '  ✅ Super admin policies only for INSERT/UPDATE/DELETE';
    RAISE NOTICE '  ✅ Super admin SELECT removed (users_read_own_account handles it)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   SELECT operations use simple id check (no functions)';
    RAISE NOTICE '   Helper function explicitly disables RLS';
    RAISE NOTICE '   Super admin can still insert/update/delete';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: Super admins can read via users_read_own_account';
    RAISE NOTICE '      (they can read their own record, which is sufficient)';
    RAISE NOTICE '      For reading other records, use service_role or views.';
    RAISE NOTICE '=========================================';
END $$;
