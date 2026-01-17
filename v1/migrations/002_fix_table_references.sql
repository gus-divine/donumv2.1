-- =====================================================
-- MIGRATION 002: Fix Table References
-- Update all foreign key references from 'users' to 'donum_accounts'
-- =====================================================

-- =====================================================
-- STEP 1: Update admin_profiles table references
-- =====================================================

DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'admin_profiles_admin_id_fkey'
        AND table_name = 'admin_profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.admin_profiles DROP CONSTRAINT admin_profiles_admin_id_fkey;
        RAISE NOTICE 'Dropped admin_profiles_admin_id_fkey constraint';
    END IF;

    -- Add new foreign key constraint
    ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_admin_id_fkey
        FOREIGN KEY (admin_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated admin_profiles foreign key to donum_accounts';
END $$;

-- =====================================================
-- STEP 2: Update donum_staff_profiles table references
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'donum_staff_profiles_staff_id_fkey'
        AND table_name = 'donum_staff_profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.donum_staff_profiles DROP CONSTRAINT donum_staff_profiles_staff_id_fkey;
        RAISE NOTICE 'Dropped donum_staff_profiles_staff_id_fkey constraint';
    END IF;

    ALTER TABLE public.donum_staff_profiles ADD CONSTRAINT donum_staff_profiles_staff_id_fkey
        FOREIGN KEY (staff_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated donum_staff_profiles foreign key to donum_accounts';
END $$;

-- =====================================================
-- STEP 3: Update donum_member_profiles table references
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'donum_member_profiles_member_id_fkey'
        AND table_name = 'donum_member_profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.donum_member_profiles DROP CONSTRAINT donum_member_profiles_member_id_fkey;
        RAISE NOTICE 'Dropped donum_member_profiles_member_id_fkey constraint';
    END IF;

    ALTER TABLE public.donum_member_profiles ADD CONSTRAINT donum_member_profiles_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated donum_member_profiles foreign key to donum_accounts';
END $$;

-- =====================================================
-- STEP 4: Update staff_members table references
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'staff_members_staff_id_fkey'
        AND table_name = 'staff_members'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.staff_members DROP CONSTRAINT staff_members_staff_id_fkey;
        RAISE NOTICE 'Dropped staff_members_staff_id_fkey constraint';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'staff_members_member_id_fkey'
        AND table_name = 'staff_members'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.staff_members DROP CONSTRAINT staff_members_member_id_fkey;
        RAISE NOTICE 'Dropped staff_members_member_id_fkey constraint';
    END IF;

    ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_staff_id_fkey
        FOREIGN KEY (staff_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated staff_members foreign keys to donum_accounts';
END $$;

-- =====================================================
-- STEP 5: Update admin_audit_log table references
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'admin_audit_log_admin_id_fkey'
        AND table_name = 'admin_audit_log'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_admin_id_fkey;
        RAISE NOTICE 'Dropped admin_audit_log_admin_id_fkey constraint';
    END IF;

    ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_admin_id_fkey
        FOREIGN KEY (admin_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated admin_audit_log foreign key to donum_accounts';
END $$;

-- =====================================================
-- STEP 6: Update user_activity table references
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_activity_user_id_fkey'
        AND table_name = 'user_activity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_activity DROP CONSTRAINT user_activity_user_id_fkey;
        RAISE NOTICE 'Dropped user_activity_user_id_fkey constraint';
    END IF;

    ALTER TABLE public.user_activity ADD CONSTRAINT user_activity_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated user_activity foreign key to donum_accounts';
END $$;

-- =====================================================
-- STEP 7: Update applications table references (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
        -- Update account_id reference
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'applications_account_id_fkey'
            AND table_name = 'applications'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.applications DROP CONSTRAINT applications_account_id_fkey;
            RAISE NOTICE 'Dropped applications_account_id_fkey constraint';
        END IF;

        ALTER TABLE public.applications ADD CONSTRAINT applications_account_id_fkey
            FOREIGN KEY (account_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Updated applications foreign key to donum_accounts';
    END IF;
END $$;

-- =====================================================
-- STEP 8: Update loans table references (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans' AND table_schema = 'public') THEN
        -- Update member_account_id and staff_account_id references
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'loans_member_account_id_fkey'
            AND table_name = 'loans'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.loans DROP CONSTRAINT loans_member_account_id_fkey;
            RAISE NOTICE 'Dropped loans_member_account_id_fkey constraint';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'loans_staff_account_id_fkey'
            AND table_name = 'loans'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.loans DROP CONSTRAINT loans_staff_account_id_fkey;
            RAISE NOTICE 'Dropped loans_staff_account_id_fkey constraint';
        END IF;

        ALTER TABLE public.loans ADD CONSTRAINT loans_member_account_id_fkey
            FOREIGN KEY (member_account_id) REFERENCES public.donum_accounts(id);
        ALTER TABLE public.loans ADD CONSTRAINT loans_staff_account_id_fkey
            FOREIGN KEY (staff_account_id) REFERENCES public.donum_accounts(id);
        RAISE NOTICE 'Updated loans foreign keys to donum_accounts';
    END IF;
END $$;

-- =====================================================
-- STEP 9: Update donum_accounts self-references
-- =====================================================

DO $$
BEGIN
    -- Update created_by and other self-references
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'donum_accounts_created_by_fkey'
        AND table_name = 'donum_accounts'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.donum_accounts DROP CONSTRAINT donum_accounts_created_by_fkey;
        RAISE NOTICE 'Dropped donum_accounts_created_by_fkey constraint';
    END IF;

    ALTER TABLE public.donum_accounts ADD CONSTRAINT donum_accounts_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.donum_accounts(id);
    RAISE NOTICE 'Updated donum_accounts self-reference';
END $$;

-- =====================================================
-- STEP 10: Create indexes for performance
-- =====================================================

-- Indexes on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_donum_accounts_role ON public.donum_accounts(role);
CREATE INDEX IF NOT EXISTS idx_donum_accounts_status ON public.donum_accounts(status);
CREATE INDEX IF NOT EXISTS idx_donum_accounts_email ON public.donum_accounts(email);
CREATE INDEX IF NOT EXISTS idx_donum_accounts_departments ON public.donum_accounts USING GIN(departments);

CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);
CREATE INDEX IF NOT EXISTS idx_department_page_permissions_dept_page ON public.department_page_permissions(department_name, page_path);
CREATE INDEX IF NOT EXISTS idx_department_members_dept_member ON public.department_members(department_name, member_id, is_active);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 002 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Fixed table references:';
    RAISE NOTICE '  ✅ admin_profiles → donum_accounts';
    RAISE NOTICE '  ✅ donum_staff_profiles → donum_accounts';
    RAISE NOTICE '  ✅ donum_member_profiles → donum_accounts';
    RAISE NOTICE '  ✅ staff_members → donum_accounts';
    RAISE NOTICE '  ✅ admin_audit_log → donum_accounts';
    RAISE NOTICE '  ✅ user_activity → donum_accounts';
    RAISE NOTICE '  ✅ applications → donum_accounts (if exists)';
    RAISE NOTICE '  ✅ loans → donum_accounts (if exists)';
    RAISE NOTICE '  ✅ donum_accounts self-references';
    RAISE NOTICE 'Created performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: All foreign key references are now consistent!';
    RAISE NOTICE '   No more "users" vs "accounts" confusion';
    RAISE NOTICE '=========================================';
END $$;