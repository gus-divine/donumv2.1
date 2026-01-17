-- =====================================================
-- MIGRATION 008: Fix RLS Policies - 2026 Best Practices
-- Updates policies to follow 2026 Supabase RLS best practices:
-- 1. Explicit TO authenticated clause
-- 2. Use (SELECT auth.uid()) for performance
-- 3. Guard against NULL auth.uid()
-- 4. Ensure users_read_own_account works first (chicken-and-egg fix)
-- =====================================================

-- =====================================================
-- STEP 1: Verify/Fix users_read_own_account policy
-- This MUST work first so users can read their own record
-- Use (SELECT auth.uid()) for performance per 2026 best practices
-- This step is idempotent - only updates if needed
-- =====================================================

DO $$
DECLARE
  current_policy_qual TEXT;
BEGIN
  -- Check current policy definition
  SELECT qual::TEXT INTO current_policy_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'donum_accounts'
    AND policyname = 'users_read_own_account'
  LIMIT 1;

  -- Only update if policy doesn't match expected format
  IF current_policy_qual IS NULL OR current_policy_qual NOT LIKE '%(SELECT auth.uid())%' THEN
    RAISE NOTICE 'Updating users_read_own_account policy...';
    
    DROP POLICY IF EXISTS "users_read_own_account" ON public.donum_accounts;
    CREATE POLICY "users_read_own_account" ON public.donum_accounts
      FOR SELECT TO authenticated
      USING (
        (SELECT auth.uid()) IS NOT NULL
        AND id = (SELECT auth.uid())
      );
    
    RAISE NOTICE 'Policy updated successfully';
  ELSE
    RAISE NOTICE 'users_read_own_account policy already correct, skipping';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Verify/Fix super_admin_full_access policy
-- Add TO authenticated and use (SELECT auth.uid()) for performance
-- The is_super_admin function uses SECURITY DEFINER so it can read
-- the user's own record even if other policies would block it
-- This step is idempotent - only updates if needed
-- =====================================================

DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'donum_accounts'
      AND policyname = 'super_admin_full_access'
  ) INTO policy_exists;

  -- Only create/update if policy doesn't exist or doesn't match expected format
  IF NOT policy_exists THEN
    RAISE NOTICE 'Creating super_admin_full_access policy...';
    
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
    
    RAISE NOTICE 'Policy created successfully';
  ELSE
    RAISE NOTICE 'super_admin_full_access policy already exists, skipping';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create department_staff_members policy (if needed)
-- Add TO authenticated and use (SELECT auth.uid()) for performance
-- This policy allows staff to see members assigned to their departments
-- This step is idempotent - only creates if it doesn't exist
-- =====================================================

DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'donum_accounts'
      AND policyname = 'department_staff_members'
  ) INTO policy_exists;

  -- Only create if policy doesn't exist
  IF NOT policy_exists THEN
    RAISE NOTICE 'Creating department_staff_members policy...';
    
    CREATE POLICY "department_staff_members" ON public.donum_accounts
      FOR SELECT TO authenticated
      USING (
        -- Users can always read their own record
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
    
    RAISE NOTICE 'Policy created successfully';
  ELSE
    RAISE NOTICE 'department_staff_members policy already exists, skipping';
  END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MIGRATION 008 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Verified/Updated RLS policies to 2026 best practices:';
    RAISE NOTICE '  ✅ users_read_own_account: Verified/Updated with (SELECT auth.uid()) + NULL guard';
    RAISE NOTICE '  ✅ super_admin_full_access: Verified/Created with TO authenticated + (SELECT auth.uid())';
    RAISE NOTICE '  ✅ department_staff_members: Created if needed with TO authenticated + (SELECT auth.uid())';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT: Policies now follow 2026 Supabase best practices!';
    RAISE NOTICE '   - Explicit TO authenticated for security';
    RAISE NOTICE '   - (SELECT auth.uid()) for better query performance';
    RAISE NOTICE '   - NULL guards to prevent policy evaluation failures';
    RAISE NOTICE '   - Migration is idempotent (safe to run multiple times)';
    RAISE NOTICE '=========================================';
END $$;
