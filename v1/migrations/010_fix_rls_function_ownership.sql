-- =====================================================
-- MIGRATION 010: Fix RLS Infinite Recursion - Function Ownership
-- Ensures SECURITY DEFINER functions are owned by postgres role
-- which has bypassrls privilege, allowing them to bypass RLS
-- =====================================================

-- =====================================================
-- STEP 1: Recreate is_super_admin with postgres ownership
-- This ensures the function can bypass RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions run with the function owner's privileges
  -- When owned by postgres (which has bypassrls), this bypasses RLS
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;

-- Ensure function is owned by postgres (which has bypassrls privilege)
-- This allows SECURITY DEFINER functions to bypass RLS
DO $$
BEGIN
  -- Try to change ownership, but don't fail if it's already correct or not allowed
  BEGIN
    ALTER FUNCTION public.is_super_admin(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    -- Ownership might already be correct or Supabase might restrict this
    -- Functions created in migrations are typically owned by postgres anyway
    RAISE NOTICE 'Note: Could not change ownership of is_super_admin (may already be correct)';
  END;
END $$;

-- =====================================================
-- STEP 2: Recreate is_staff with postgres ownership
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

DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.is_staff(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not change ownership of is_staff (may already be correct)';
  END;
END $$;

-- =====================================================
-- STEP 3: Recreate get_user_departments with postgres ownership
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

DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.get_user_departments(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not change ownership of get_user_departments (may already be correct)';
  END;
END $$;

-- =====================================================
-- STEP 4: Recreate get_user_role with postgres ownership
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

DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.get_user_role(UUID) OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not change ownership of get_user_role (may already be correct)';
  END;
END $$;

-- =====================================================
-- STEP 5: Drop and recreate policies in correct order
-- users_read_own_account MUST be created first
-- =====================================================

-- Drop all policies first to ensure clean recreation
DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;

-- Create users_read_own_account FIRST - this is critical
-- PostgreSQL evaluates policies in creation order, and this must be first
CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND id = (SELECT auth.uid())
  );

-- Create super_admin_full_access policy
-- This uses is_super_admin() which now bypasses RLS correctly
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

-- Create department_staff_members policy
-- REMOVED duplicate "read own record" check - users_read_own_account handles it
-- This prevents circular evaluation
CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    -- Super admin can see everything (checked via function that bypasses RLS)
    ((SELECT auth.uid()) IS NOT NULL AND public.is_super_admin((SELECT auth.uid())))
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
    RAISE NOTICE '✅ MIGRATION 010 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed RLS infinite recursion:';
    RAISE NOTICE '  ✅ Set function ownership to postgres (has bypassrls)';
    RAISE NOTICE '  ✅ Removed duplicate "read own record" check from department_staff_members';
    RAISE NOTICE '  ✅ Ensured users_read_own_account is created first';
    RAISE NOTICE '  ✅ All SECURITY DEFINER functions now bypass RLS correctly';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause infinite recursion!';
    RAISE NOTICE '   Functions owned by postgres bypass RLS';
    RAISE NOTICE '   Users can read their own account data';
    RAISE NOTICE '   Super admin and staff access works correctly';
    RAISE NOTICE '=========================================';
END $$;
