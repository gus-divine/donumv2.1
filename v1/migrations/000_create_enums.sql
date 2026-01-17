-- =====================================================
-- MIGRATION 000: Create Enum Types
-- Must run BEFORE migration 001
-- =====================================================

-- Create user_role enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'donum_prospect',
            'donum_lead',
            'donum_member',
            'donum_staff',
            'donum_admin',
            'donum_partner',
            'donum_super_admin'
        );
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END $$;

-- Create user_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM (
            'pending',
            'active',
            'inactive',
            'suspended',
            'archived'
        );
        RAISE NOTICE 'Created user_status enum type';
    ELSE
        RAISE NOTICE 'user_status enum type already exists';
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 000 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created enum types:';
    RAISE NOTICE '  ✅ user_role';
    RAISE NOTICE '  ✅ user_status';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Ready for migration 001!';
    RAISE NOTICE '=========================================';
END $$;
