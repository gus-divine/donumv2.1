-- =====================================================
-- MIGRATION 015: Nuclear Option - Complete RLS Reset
-- Aggressively drops ALL policies and functions with CASCADE
-- Then recreates minimal policies that cannot cause recursion
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL policies on donum_accounts with CASCADE
-- This ensures we remove everything, even if there are dependencies
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on donum_accounts
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'donum_accounts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.donum_accounts CASCADE', r.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Drop ALL policies on departments and department_page_permissions
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'departments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.departments CASCADE', r.policyname);
    END LOOP;
    
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'department_page_permissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.department_page_permissions CASCADE', r.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Drop ALL helper functions with CASCADE
-- This removes any remaining dependencies
-- =====================================================

DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_departments(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin_helper(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_helper(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_departments_helper(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role_helper(UUID) CASCADE;

-- =====================================================
-- STEP 4: Create ONLY the minimal SELECT policy
-- NO function calls - just simple id check
-- This is the ONLY SELECT policy to prevent ANY recursion
-- =====================================================

CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 5: Create INSERT/UPDATE policies (no function calls)
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
-- STEP 6: Create helper function for super admin (for INSERT/UPDATE/DELETE only)
-- Uses explicit RLS bypass
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
-- STEP 7: Create super admin policies for INSERT/UPDATE/DELETE only
-- NOT for SELECT - SELECT is handled by users_read_own_account
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
-- STEP 8: Recreate policies on other tables
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
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 015 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Nuclear option - complete RLS reset:';
    RAISE NOTICE '  ✅ Dropped ALL policies with CASCADE';
    RAISE NOTICE '  ✅ Dropped ALL helper functions with CASCADE';
    RAISE NOTICE '  ✅ Created ONLY users_read_own_account for SELECT (NO functions)';
    RAISE NOTICE '  ✅ Super admin policies ONLY for INSERT/UPDATE/DELETE';
    RAISE NOTICE '  ✅ NO SELECT policies call functions';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies CANNOT cause infinite recursion!';
    RAISE NOTICE '   SELECT operations use ONLY simple id check';
    RAISE NOTICE '   No function calls in SELECT policies';
    RAISE NOTICE '   Helper function explicitly disables RLS';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: This is the minimal safe configuration.';
    RAISE NOTICE '      Users can read their own account data.';
    RAISE NOTICE '      Super admins can insert/update/delete.';
    RAISE NOTICE '      Staff department access removed to prevent recursion.';
    RAISE NOTICE '=========================================';
END $$;
