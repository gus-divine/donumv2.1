-- =====================================================
-- MIGRATION 005: Fix RLS Infinite Recursion
-- Fixes infinite recursion in donum_accounts RLS policies
-- =====================================================

-- =====================================================
-- STEP 1: Drop problematic policies
-- =====================================================

DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;

-- =====================================================
-- STEP 2: Create SECURITY DEFINER function to check user role
-- This function bypasses RLS to check roles without recursion
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3: Create SECURITY DEFINER function to check if user is super admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3.5: Create SECURITY DEFINER function to get user departments
-- This avoids recursion when checking user's departments in policies
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3.6: Create SECURITY DEFINER function to check if user is staff
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.donum_accounts
    WHERE id = user_id AND role = 'donum_staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: Create policy allowing users to read their own record
-- This is essential - users need to read their own record to check role
-- =====================================================

CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT USING (id = auth.uid());

-- =====================================================
-- STEP 5: Create policy for super admin full access (using function)
-- =====================================================

CREATE POLICY "super_admin_full_access" ON public.donum_accounts
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- STEP 6: Recreate department-based staff access policy (using functions)
-- =====================================================

CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT USING (
    -- Users can always read their own record
    id = auth.uid()
    -- OR super admin can see everything
    OR public.is_super_admin(auth.uid())
    -- OR staff can see members/prospects assigned to their departments
    OR (
      public.is_staff(auth.uid())
      AND (
        -- Check if user is in a department that has permission to view members
        EXISTS (
          SELECT 1 FROM public.department_page_permissions dpp
          WHERE dpp.department_name = ANY(public.get_user_departments(auth.uid()))
            AND dpp.page_path = '/admin/members'
            AND dpp.can_view = true
        )
        -- AND the member is assigned to one of the user's departments
        AND EXISTS (
          SELECT 1 FROM public.department_members dm
          WHERE dm.member_id = donum_accounts.id
            AND dm.department_name = ANY(public.get_user_departments(auth.uid()))
            AND dm.is_active = true
        )
      )
    )
  );

-- =====================================================
-- STEP 7: Update other policies that reference donum_accounts
-- =====================================================

-- Update super_admin_departments policy
DROP POLICY IF EXISTS "super_admin_departments" ON public.departments;
CREATE POLICY "super_admin_departments" ON public.departments
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Update super_admin_permissions policy
DROP POLICY IF EXISTS "super_admin_permissions" ON public.department_page_permissions;
CREATE POLICY "super_admin_permissions" ON public.department_page_permissions
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 005 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed RLS infinite recursion issues:';
    RAISE NOTICE '  ✅ Created SECURITY DEFINER functions';
    RAISE NOTICE '  ✅ Added policy for users to read own record';
    RAISE NOTICE '  ✅ Updated super admin policies';
    RAISE NOTICE '  ✅ Updated department staff policies';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: RLS policies no longer cause recursion!';
    RAISE NOTICE '   Users can now read their own account data';
    RAISE NOTICE '   Super admin access works correctly';
    RAISE NOTICE '   Department-based access works correctly';
    RAISE NOTICE '=========================================';
END $$;
