-- =====================================================
-- MIGRATION 026: Create Staff Accounts (After Auth Users Created)
-- This SQL creates donum_accounts records for staff users
-- IMPORTANT: Auth users must be created FIRST via Supabase Auth Admin API
-- =====================================================

-- This migration assumes auth users have been created with these emails:
-- sales1@donumplan.com, sales2@donumplan.com, sales3@donumplan.com
-- support1@donumplan.com, support2@donumplan.com, support3@donumplan.com
-- ops1@donumplan.com, ops2@donumplan.com
-- finance1@donumplan.com, finance2@donumplan.com
-- admin1@donumplan.com
-- advisor1@donumplan.com, advisor2@donumplan.com

-- Function to get user ID from auth by email and create account
CREATE OR REPLACE FUNCTION create_staff_from_auth_email(
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
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from auth.users table
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % does not exist. Create auth user first.', p_email;
  END IF;

  -- Create or update donum_accounts record
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
    v_user_id,
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

-- Now create all staff accounts
DO $$
BEGIN
  -- Sales Department
  PERFORM create_staff_from_auth_email('sales1@donumplan.com', 'Sales', 'Staff', 'Sales');
  PERFORM create_staff_from_auth_email('sales2@donumplan.com', 'Sales', 'Staff', 'Sales');
  PERFORM create_staff_from_auth_email('sales3@donumplan.com', 'Sales', 'Staff', 'Sales');
  
  -- Support Department
  PERFORM create_staff_from_auth_email('support1@donumplan.com', 'Support', 'Staff', 'Support');
  PERFORM create_staff_from_auth_email('support2@donumplan.com', 'Support', 'Staff', 'Support');
  PERFORM create_staff_from_auth_email('support3@donumplan.com', 'Support', 'Staff', 'Support');
  
  -- Operations Department
  PERFORM create_staff_from_auth_email('ops1@donumplan.com', 'Ops', 'Staff', 'Operations');
  PERFORM create_staff_from_auth_email('ops2@donumplan.com', 'Ops', 'Staff', 'Operations');
  
  -- Finance Department
  PERFORM create_staff_from_auth_email('finance1@donumplan.com', 'Finance', 'Staff', 'Finance');
  PERFORM create_staff_from_auth_email('finance2@donumplan.com', 'Finance', 'Staff', 'Finance');
  
  -- Admin Department
  PERFORM create_staff_from_auth_email('admin1@donumplan.com', 'Admin', 'Staff', 'Admin');
  
  -- Advisor Department
  PERFORM create_staff_from_auth_email('advisor1@donumplan.com', 'Advisor', 'Staff', 'Advisor');
  PERFORM create_staff_from_auth_email('advisor2@donumplan.com', 'Advisor', 'Staff', 'Advisor');
  
  RAISE NOTICE '✅ Staff accounts created successfully!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error: %. Some auth users may not exist yet.', SQLERRM;
    RAISE NOTICE '   Create auth users first, then re-run this migration.';
END;
$$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 026 COMPLETED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Function created: create_staff_from_auth_email()';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NOTE:';
    RAISE NOTICE '   If you see errors, create auth users first via:';
    RAISE NOTICE '   - Supabase Dashboard → Authentication → Users → Add User';
    RAISE NOTICE '   - Or use Supabase Auth Admin API';
    RAISE NOTICE '   Then re-run this migration';
    RAISE NOTICE '=========================================';
END $$;
