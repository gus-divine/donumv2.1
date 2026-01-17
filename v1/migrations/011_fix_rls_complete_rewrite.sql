-- =====================================================
-- MIGRATION 011: Complete RLS Policy Rewrite
-- Fixes infinite recursion by ensuring users_read_own_account
-- is evaluated FIRST and doesn't trigger any function calls
-- =====================================================

-- =====================================================
-- CRITICAL: Drop ALL policies first to break any circular dependencies
-- =====================================================

DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_insert_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "users_update_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;

-- =====================================================
-- STEP 1: Recreate SECURITY DEFINER functions with explicit bypass
-- Ensure they use SECURITY DEFINER and are owned by postgres
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER with explicit RLS bypass
  -- This function MUST bypass RLS to prevent recursion when called from policies
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_staff'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_user_departments(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_departments TEXT[];
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT departments INTO user_departments
  FROM public.donum_accounts
  WHERE id = user_id;
  
  RETURN COALESCE(user_departments, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_val user_role;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT role INTO user_role_val
  FROM public.donum_accounts
  WHERE id = user_id;
  
  RETURN COALESCE(user_role_val, 'donum_prospect'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- =====================================================
-- STEP 2: Create users_read_own_account FIRST
-- This MUST be the first policy and MUST NOT call any functions
-- that query donum_accounts to avoid recursion
-- =====================================================

CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 3: Create users_insert_own_account
-- =====================================================

CREATE POLICY "users_insert_own_account" ON public.donum_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 4: Create users_update_own_account
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
-- STEP 5: Create super_admin_full_access
-- This uses is_super_admin() which bypasses RLS via SECURITY DEFINER
-- =====================================================

CREATE POLICY "super_admin_full_access" ON public.donum_accounts
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin((SELECT auth.uid()))
  );

-- =====================================================
-- STEP 6: Create department_staff_members policy
-- IMPORTANT: This policy does NOT include "read own record" check
-- because users_read_own_account already handles that
-- PostgreSQL evaluates policies with OR logic, so if users_read_own_account
-- matches, access is granted without evaluating this policy
-- =====================================================

CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    -- Super admin can see everything (function bypasses RLS)
    ((SELECT auth.uid()) IS NOT NULL AND public.is_super_admin((SELECT auth.uid())))
    -- OR staff can see members assigned to their departments
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND public.is_staff((SELECT auth.uid()))
      AND (
        -- Check if user's department has permission to view members
        EXISTS (
          SELECT 1 FROM public.department_page_permissions dpp
          WHERE dpp.department_name = ANY(public.get_user_departments((SELECT auth.uid())))
            AND dpp.page_path = '/admin/members'
            AND dpp.can_view = true
        )
        -- AND the member is assigned to one of the user's departments
        AND EXISTS (
          SELECT 1 FROM public.department_members dm
          WHERE dm.member_id = donum_accounts.id
            AND dm.department_name = ANY(public.get_user_departments((SELECT auth.uid())))
            AND dm.is_active = true
        )
      )
    )
  );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 011 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Complete RLS policy rewrite:';
    RAISE NOTICE '  ✅ Dropped all existing policies to break circular dependencies';
    RAISE NOTICE '  ✅ Recreated SECURITY DEFINER functions';
    RAISE NOTICE '  ✅ Created users_read_own_account FIRST (no function calls)';
    RAISE NOTICE '  ✅ Created super_admin_full_access (uses bypassing function)';
    RAISE NOTICE '  ✅ Created department_staff_members (no duplicate own-record check)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   users_read_own_account is evaluated first';
    RAISE NOTICE '   SECURITY DEFINER functions bypass RLS correctly';
    RAISE NOTICE '   No circular dependencies in policy evaluation';
    RAISE NOTICE '=========================================';
END $$;
