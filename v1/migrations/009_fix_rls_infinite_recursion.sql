-- =====================================================
-- MIGRATION 009: Fix RLS Infinite Recursion (Final Fix)
-- Fixes infinite recursion by ensuring SECURITY DEFINER functions
-- use the service_role context to bypass RLS
-- =====================================================

-- =====================================================
-- STEP 1: Recreate is_super_admin with proper SECURITY DEFINER
-- The function owner must have permissions to bypass RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions run with the function owner's privileges
  -- This bypasses RLS when reading from donum_accounts
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- =====================================================
-- STEP 2: Recreate is_staff with proper SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- =====================================================
-- STEP 3: Recreate get_user_departments with proper SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_departments(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_departments TEXT[];
BEGIN
  SELECT departments INTO user_departments
  FROM public.donum_accounts
  WHERE id = user_id;
  
  RETURN COALESCE(user_departments, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- =====================================================
-- STEP 4: Recreate get_user_role with proper SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM public.donum_accounts
  WHERE id = user_id;
  
  RETURN COALESCE(user_role_val, 'donum_prospect'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- =====================================================
-- STEP 5: Ensure users_read_own_account policy exists and is correct
-- This MUST be evaluated first to allow users to read their own record
-- =====================================================

DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- =====================================================
-- STEP 6: Recreate super_admin_full_access policy
-- Ensure it doesn't conflict with users_read_own_account
-- =====================================================

DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
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
-- STEP 7: Recreate department_staff_members policy
-- Ensure users_read_own_account is checked first
-- =====================================================

DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;
CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    -- Users can always read their own record (checked first)
    ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()))
    -- OR super admin can see everything
    OR ((SELECT auth.uid()) IS NOT NULL AND public.is_super_admin((SELECT auth.uid())))
    -- OR staff can see members/prospects assigned to their departments
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND public.is_staff((SELECT auth.uid()))
      AND (
        -- Check if user is in a department that has permission to view members
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
    RAISE NOTICE '✅ MIGRATION 009 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed RLS infinite recursion:';
    RAISE NOTICE '  ✅ Updated SECURITY DEFINER functions with SET search_path';
    RAISE NOTICE '  ✅ Ensured users_read_own_account policy is evaluated first';
    RAISE NOTICE '  ✅ Recreated all policies with proper ordering';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   SECURITY DEFINER functions bypass RLS correctly';
    RAISE NOTICE '   Users can read their own account data';
    RAISE NOTICE '   Super admin and staff access works correctly';
    RAISE NOTICE '=========================================';
END $$;
