-- =====================================================
-- MIGRATION 016: Add Super Admin SELECT Policy
-- Adds back SELECT access for super admins to read all users
-- Safe because helper function bypasses RLS explicitly
-- =====================================================

-- =====================================================
-- STEP 1: Create super admin SELECT policy
-- Uses is_super_admin_helper which explicitly bypasses RLS
-- This is safe because the helper function uses set_config('row_security', 'off', true)
-- =====================================================

CREATE POLICY "super_admin_read_all" ON public.donum_accounts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
  );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 016 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Added super admin SELECT policy:';
    RAISE NOTICE '  ✅ super_admin_read_all policy created';
    RAISE NOTICE '  ✅ Uses is_super_admin_helper (bypasses RLS)';
    RAISE NOTICE '  ✅ Safe - helper function explicitly disables RLS';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: Super admins can now read all user accounts!';
    RAISE NOTICE '   Regular users can still read their own account';
    RAISE NOTICE '   Super admins can read all accounts';
    RAISE NOTICE '   No recursion - helper function bypasses RLS';
    RAISE NOTICE '=========================================';
END $$;
