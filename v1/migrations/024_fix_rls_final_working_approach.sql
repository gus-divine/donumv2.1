-- =====================================================
-- Migration: Fix RLS Final Working Approach
-- Date: 2026-01-18
-- Description: 
--   Based on migration 013 which worked, this consolidates
--   the RLS policies to prevent recursion while maintaining
--   all required functionality:
--   1. Users can read their own account (simple, no functions)
--   2. Super admins can read all accounts (uses helper)
--   3. Staff can read members with department + direct assignment (uses helpers)
--   Key: When querying own account, ONLY users_read_own_account matches
--        Other policies exclude own account to prevent evaluation
-- =====================================================

-- STEP 1: Ensure helper functions exist and are properly configured
-- These MUST be owned by postgres and use SECURITY DEFINER with RLS bypass

CREATE OR REPLACE FUNCTION public.is_super_admin_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
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

-- Ensure owned by postgres (has BYPASSRLS privilege)
ALTER FUNCTION public.is_super_admin_helper(UUID) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin_helper(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = p_user_id AND role IN ('donum_staff', 'donum_admin')
  );
END;
$$;

ALTER FUNCTION public.is_staff_or_admin_helper(UUID) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_user_departments_helper(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_departments TEXT[];
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT COALESCE(departments, ARRAY[]::TEXT[]) INTO v_departments
  FROM public.donum_accounts
  WHERE id = p_user_id;
  RETURN COALESCE(v_departments, ARRAY[]::TEXT[]);
END;
$$;

ALTER FUNCTION public.get_user_departments_helper(UUID) OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_departments_helper(UUID) TO authenticated;

-- STEP 2: Drop all existing SELECT policies on donum_accounts
DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_read_all" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;

-- STEP 3: Create policies in the correct order
-- Policy 1: Users can read their own account (SIMPLE, NO FUNCTIONS)
-- This MUST be evaluated first and work without any helper functions
CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- Policy 2: Super admins can read all OTHER accounts (excludes own account)
-- This prevents evaluation when querying own account
CREATE POLICY "super_admin_read_all" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id <> (SELECT auth.uid())  -- Exclude own account to prevent recursion
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- Policy 3: Staff can read members with department + direct assignment (excludes own account)
CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id <> (SELECT auth.uid())  -- Exclude own account to prevent recursion
    AND public.is_staff_or_admin_helper((SELECT auth.uid())::UUID)
    AND EXISTS (
      SELECT 1
      FROM public.department_page_permissions dpp
      WHERE dpp.department_name = ANY(
        public.get_user_departments_helper((SELECT auth.uid())::UUID)
      )
        AND dpp.page_path = '/admin/members'
        AND dpp.can_view = true
        -- AND the member is assigned to one of the user's departments
        AND EXISTS (
          SELECT 1 FROM public.department_members dm
          WHERE dm.member_id = donum_accounts.id
            AND dm.department_name = ANY(
              public.get_user_departments_helper((SELECT auth.uid())::UUID)
            )
            AND dm.is_active = true
        )
        -- AND the staff member is directly assigned to this member/prospect
        AND EXISTS (
          SELECT 1 FROM public.prospect_staff_assignments psa
          WHERE psa.prospect_id = donum_accounts.id
            AND psa.staff_id = (SELECT auth.uid())::UUID
            AND psa.is_active = true
        )
    )
  );

-- STEP 4: Ensure INSERT and UPDATE policies exist (these should already exist)
-- Verify they exist, create if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donum_accounts' AND policyname = 'users_insert_own_account'
  ) THEN
    CREATE POLICY "users_insert_own_account" ON public.donum_accounts
      FOR INSERT TO authenticated
      WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND id = (SELECT auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donum_accounts' AND policyname = 'users_update_own_account'
  ) THEN
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
  END IF;
END $$;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 024 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed RLS policies to prevent recursion:';
    RAISE NOTICE '  ✅ users_read_own_account: Simple id check (NO functions)';
    RAISE NOTICE '  ✅ super_admin_read_all: Excludes own account (id <> auth.uid())';
    RAISE NOTICE '  ✅ department_staff_members: Excludes own account (id <> auth.uid())';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper functions configured:';
    RAISE NOTICE '  ✅ Owned by postgres (BYPASSRLS privilege)';
    RAISE NOTICE '  ✅ SECURITY DEFINER with RLS bypass';
    RAISE NOTICE '  ✅ Proper search_path set';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT:';
    RAISE NOTICE '   - Users can read their own account (no recursion)';
    RAISE NOTICE '   - Super admins can read all other accounts';
    RAISE NOTICE '   - Staff can read members with department + direct assignment';
    RAISE NOTICE '   - No infinite recursion when querying own account';
    RAISE NOTICE '=========================================';
END $$;
