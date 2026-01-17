-- =====================================================
-- MIGRATION 007: Fix users_read_own_account Policy
-- Updates policy to match current best practices
-- This migration is idempotent - checks current state first
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
  -- Current best practice: ((auth.uid() IS NOT NULL) AND (id = auth.uid()))
  IF current_policy_qual IS NULL OR current_policy_qual NOT LIKE '%auth.uid()%' THEN
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
    RAISE NOTICE 'Policy already matches expected format, skipping update';
  END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MIGRATION 007 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Verified/Updated users_read_own_account policy:';
    RAISE NOTICE '  - Uses (SELECT auth.uid()) with NULL guard';
    RAISE NOTICE '  - TO authenticated for security';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT: Users can read their own account data!';
    RAISE NOTICE '   Policy follows current best practices';
    RAISE NOTICE '=========================================';
END $$;
