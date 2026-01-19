-- =====================================================
-- MIGRATION 025: Create Staff Users for Departments
-- Creates staff users with emails like name@donumplan.com
-- =====================================================

-- NOTE: This migration requires auth users to be created FIRST via Supabase Auth Admin API
-- The auth users must be created with these emails before running this migration
-- Or use the create-staff-for-departments.ts script which handles both auth and accounts

-- Function to create/update staff account (requires auth user to exist first)
CREATE OR REPLACE FUNCTION create_staff_account(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_department_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.donum_accounts (
    id,
    email,
    role,
    status,
    first_name,
    last_name,
    departments,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    'donum_staff',
    'active',
    p_first_name,
    p_last_name,
    ARRAY[p_department_name]::TEXT[],
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    departments = CASE
      WHEN p_department_name = ANY(donum_accounts.departments) 
      THEN donum_accounts.departments
      ELSE array_append(donum_accounts.departments, p_department_name)
    END,
    first_name = COALESCE(p_first_name, donum_accounts.first_name),
    last_name = COALESCE(p_last_name, donum_accounts.last_name),
    role = 'donum_staff',
    status = 'active',
    updated_at = NOW();
END;
$$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 025 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Function created: create_staff_account()';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '   Run the create-staff-for-departments.ts script';
    RAISE NOTICE '   OR create auth users manually and call create_staff_account()';
    RAISE NOTICE '';
    RAISE NOTICE 'Example staff emails to create:';
    RAISE NOTICE '  - sales1@donumplan.com (Sales)';
    RAISE NOTICE '  - sales2@donumplan.com (Sales)';
    RAISE NOTICE '  - sales3@donumplan.com (Sales)';
    RAISE NOTICE '  - support1@donumplan.com (Support)';
    RAISE NOTICE '  - support2@donumplan.com (Support)';
    RAISE NOTICE '  - support3@donumplan.com (Support)';
    RAISE NOTICE '  - ops1@donumplan.com (Operations)';
    RAISE NOTICE '  - ops2@donumplan.com (Operations)';
    RAISE NOTICE '  - finance1@donumplan.com (Finance)';
    RAISE NOTICE '  - finance2@donumplan.com (Finance)';
    RAISE NOTICE '  - admin1@donumplan.com (Admin)';
    RAISE NOTICE '  - advisor1@donumplan.com (Advisor)';
    RAISE NOTICE '  - advisor2@donumplan.com (Advisor)';
    RAISE NOTICE '=========================================';
END $$;
