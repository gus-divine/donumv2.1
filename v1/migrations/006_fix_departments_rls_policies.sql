-- =====================================================
-- MIGRATION 006: Fix Departments RLS Policies
-- Fixes authenticated_read_departments policy and aligns TO clauses
-- =====================================================

-- =====================================================
-- STEP 0: Ensure RLS is enabled on all affected tables
-- =====================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donum_accounts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 1: Fix authenticated_read_departments policy
-- Replace auth.role() = 'authenticated' with (SELECT auth.uid()) IS NOT NULL
-- Change TO public to TO authenticated
-- =====================================================

DROP POLICY IF EXISTS "authenticated_read_departments" ON public.departments;
CREATE POLICY "authenticated_read_departments" ON public.departments
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- STEP 2: Fix users_read_own_account policy
-- Change TO public to TO authenticated and wrap auth.uid() in SELECT
-- =====================================================

DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
CREATE POLICY "users_read_own_account" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- =====================================================
-- STEP 3: Update super_admin policies to TO authenticated
-- Wrap auth.uid() in SELECT for better caching
-- Rename to match spec: super_admin_departments_all and super_admin_permissions_all
-- =====================================================

-- Drop old and new policies (in case new ones already exist)
DROP POLICY IF EXISTS "super_admin_departments" ON public.departments;
DROP POLICY IF EXISTS "super_admin_departments_all" ON public.departments;
DROP POLICY IF EXISTS "super_admin_permissions" ON public.department_page_permissions;
DROP POLICY IF EXISTS "super_admin_permissions_all" ON public.department_page_permissions;

-- Create super_admin_departments_all policy
CREATE POLICY "super_admin_departments_all" ON public.departments
  FOR ALL TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- Create super_admin_permissions_all policy
CREATE POLICY "super_admin_permissions_all" ON public.department_page_permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- =====================================================
-- STEP 4: Add authenticated_read_permissions policy
-- All authenticated users can read department_page_permissions
-- =====================================================

DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.department_page_permissions;
CREATE POLICY "authenticated_read_permissions" ON public.department_page_permissions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- STEP 5: Update super_admin_full_access policy
-- Change TO authenticated and wrap auth.uid() in SELECT
-- =====================================================

DROP POLICY IF EXISTS "super_admin_full_access" ON public.donum_accounts;
CREATE POLICY "super_admin_full_access" ON public.donum_accounts
  FOR ALL TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MIGRATION 006 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed departments RLS policies:';
    RAISE NOTICE '  - Fixed authenticated_read_departments (uses auth.uid() IS NOT NULL)';
    RAISE NOTICE '  - Fixed users_read_own_account (TO authenticated)';
    RAISE NOTICE '  - Updated super_admin policies (TO authenticated, wrapped auth.uid())';
    RAISE NOTICE '  - Added authenticated_read_permissions policy';
    RAISE NOTICE '  - Renamed policies to match spec (super_admin_departments_all, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT: Departments table is now accessible to authenticated users!';
    RAISE NOTICE '   All policies use TO authenticated for better security';
    RAISE NOTICE '   auth.uid() wrapped in SELECT for better caching';
    RAISE NOTICE '=========================================';
END $$;
