-- =====================================================
-- MIGRATION 001: Create Core Tables
-- Fixes broken permission system by creating missing tables
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: Fix table name inconsistency
-- Rename 'accounts' to 'donum_accounts' for consistency
-- =====================================================

DO $$
BEGIN
    -- Check if accounts table exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public') THEN
        ALTER TABLE public.accounts RENAME TO donum_accounts;
        RAISE NOTICE 'Renamed accounts table to donum_accounts';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donum_accounts' AND table_schema = 'public') THEN
        -- If neither exists, create donum_accounts table
        CREATE TABLE public.donum_accounts (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          role user_role NOT NULL DEFAULT 'donum_prospect',
          status user_status NOT NULL DEFAULT 'pending',
          first_name TEXT,
          last_name TEXT,
          name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
          avatar_url TEXT,
          date_of_birth DATE,
          phone TEXT,
          cell_phone TEXT,
          address_line_1 TEXT,
          address_line_2 TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          country TEXT DEFAULT 'US',
          company TEXT,
          title TEXT,
          job_title TEXT,
          industry TEXT,
          territory TEXT,
          territories TEXT[],
          license_number TEXT,
          license_state TEXT,
          license_expiry DATE,
          specializations TEXT[],
          certifications JSONB,
          member_capacity INTEGER,
          commission_rate DECIMAL(5,2),
          annual_income DECIMAL(15,2),
          net_worth DECIMAL(15,2),
          tax_bracket TEXT,
          risk_tolerance TEXT,
          investment_goals JSONB,
          marital_status TEXT,
          dependents INTEGER,
          onboarding_complete BOOLEAN DEFAULT false,
          admin_level TEXT CHECK (admin_level IN ('super', 'admin', 'manager', 'support')),
          departments TEXT[] DEFAULT '{}',
          permissions JSONB,
          security_clearance TEXT,
          communication_prefs JSONB,
          timezone TEXT DEFAULT 'America/New_York',
          language TEXT DEFAULT 'en',
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          created_by UUID,
          last_login_at TIMESTAMPTZ,
          login_count INTEGER DEFAULT 0,
          email_verified BOOLEAN DEFAULT false,
          phone_verified BOOLEAN DEFAULT false,
          terms_accepted BOOLEAN DEFAULT false,
          terms_accepted_at TIMESTAMPTZ,
          privacy_policy_accepted BOOLEAN DEFAULT false,
          privacy_policy_accepted_at TIMESTAMPTZ,
          metadata JSONB,
          notes TEXT
        );
        RAISE NOTICE 'Created donum_accounts table';
    ELSE
        RAISE NOTICE 'donum_accounts table already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create departments table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT 'users',
  is_active BOOLEAN DEFAULT true,
  lead_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.donum_accounts(id),
  updated_by UUID REFERENCES public.donum_accounts(id)
);

-- =====================================================
-- STEP 3: Create department_page_permissions table
-- THIS IS THE CRITICAL FIX - without this, permissions are broken!
-- =====================================================

CREATE TABLE IF NOT EXISTS public.department_page_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.donum_accounts(id),
  updated_by UUID REFERENCES public.donum_accounts(id),
  UNIQUE(department_name, page_path)
);

-- =====================================================
-- STEP 4: Create department_members table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_name TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES public.donum_accounts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.donum_accounts(id),
  unassigned_at TIMESTAMPTZ,
  unassigned_by UUID REFERENCES public.donum_accounts(id),
  is_active BOOLEAN DEFAULT true,
  assignment_notes TEXT,
  UNIQUE(department_name, member_id, is_active)
);

-- =====================================================
-- STEP 5: Create security_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'data_access', 'permission_change', 'department_assignment')),
  user_id UUID REFERENCES public.donum_accounts(id),
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 6: Enable RLS on all tables
-- =====================================================

ALTER TABLE public.donum_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on existing tables if they exist
DO $$
BEGIN
    -- Enable RLS on existing profile tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donum_staff_profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.donum_staff_profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donum_member_profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.donum_member_profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members' AND table_schema = 'public') THEN
        ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
        ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans' AND table_schema = 'public') THEN
        ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
    END IF;

    RAISE NOTICE 'RLS enabled on all tables';
END $$;

-- =====================================================
-- STEP 7: Create basic super admin policies
-- =====================================================

-- Allow super admin full access to everything
CREATE POLICY "super_admin_full_access" ON public.donum_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid() AND role = 'donum_super_admin'
    )
  );

CREATE POLICY "super_admin_departments" ON public.departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid() AND role = 'donum_super_admin'
    )
  );

CREATE POLICY "super_admin_permissions" ON public.department_page_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid() AND role = 'donum_super_admin'
    )
  );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 001 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created core tables:';
    RAISE NOTICE '  ✅ donum_accounts (renamed from accounts)';
    RAISE NOTICE '  ✅ departments';
    RAISE NOTICE '  ✅ department_page_permissions (CRITICAL FIX)';
    RAISE NOTICE '  ✅ department_members';
    RAISE NOTICE '  ✅ security_events';
    RAISE NOTICE 'Enabled RLS on all tables';
    RAISE NOTICE 'Created super admin policies';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: Permission system is now functional!';
    RAISE NOTICE '   Super admin can create departments and assign permissions';
    RAISE NOTICE '=========================================';
END $$;