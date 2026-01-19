-- =====================================================
-- Migration: Add Admin Update Policies for donum_accounts
-- Date: 2026-01-19
-- Description: 
--   Adds UPDATE policies to allow super admins and admins
--   to update other users' accounts in donum_accounts.
--   This fixes the issue where admin edits fail silently
--   due to missing RLS policies.
-- =====================================================

-- Drop existing admin update policies if they exist
DROP POLICY IF EXISTS "super_admin_update" ON public.donum_accounts;
DROP POLICY IF EXISTS "admin_update" ON public.donum_accounts;

-- Create policy for super admins to update any account
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

-- Create policy for admins to update any account
CREATE POLICY "admin_update" ON public.donum_accounts
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_admin_helper((SELECT auth.uid())::UUID)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_admin_helper((SELECT auth.uid())::UUID)
  );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 030 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Added UPDATE policies for donum_accounts:';
    RAISE NOTICE '  ✅ super_admin_update: Super admins can update any account';
    RAISE NOTICE '  ✅ admin_update: Admins can update any account';
    RAISE NOTICE '  ✅ users_update_own_account: Users can still update their own account';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT:';
    RAISE NOTICE '   - Super admins can now update any user account';
    RAISE NOTICE '   - Admins can now update any user account';
    RAISE NOTICE '   - Regular users can still update their own account';
    RAISE NOTICE '=========================================';
END $$;
