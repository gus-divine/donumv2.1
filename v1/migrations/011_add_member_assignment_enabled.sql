-- =====================================================
-- Migration: Add member_assignment_enabled field
-- Date: 2026-01-XX
-- Description: 
--   - Rename lead_assignment_enabled to prospect_assignment_enabled
--   - Add new member_assignment_enabled field
--   - This allows separate control for prospect vs member assignments
-- =====================================================

DO $$
BEGIN
  -- Check if migration already applied
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'member_assignment_enabled'
  ) THEN
    RAISE NOTICE 'Migration already applied: member_assignment_enabled column exists';
    RETURN;
  END IF;

  -- Step 1: Add new member_assignment_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'member_assignment_enabled'
  ) THEN
    ALTER TABLE public.departments 
    ADD COLUMN member_assignment_enabled BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Added member_assignment_enabled column';
  END IF;

  -- Step 2: Rename lead_assignment_enabled to prospect_assignment_enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'lead_assignment_enabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'prospect_assignment_enabled'
  ) THEN
    ALTER TABLE public.departments 
    RENAME COLUMN lead_assignment_enabled TO prospect_assignment_enabled;
    
    RAISE NOTICE 'Renamed lead_assignment_enabled to prospect_assignment_enabled';
  END IF;

  -- Step 3: Set default values for existing rows
  -- If prospect_assignment_enabled was true, keep both true
  -- If prospect_assignment_enabled was false, set member_assignment_enabled to true (members can still be assigned)
  UPDATE public.departments 
  SET member_assignment_enabled = true
  WHERE member_assignment_enabled IS NULL;

  -- Add comments to clarify the fields (only if columns exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'prospect_assignment_enabled'
  ) THEN
    COMMENT ON COLUMN public.departments.prospect_assignment_enabled IS 'Controls whether department can receive new prospect assignments (donum_prospect role)';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'departments' 
    AND column_name = 'member_assignment_enabled'
  ) THEN
    COMMENT ON COLUMN public.departments.member_assignment_enabled IS 'Controls whether department can receive new member assignments (donum_member role)';
  END IF;

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '  ✅ Added member_assignment_enabled column';
  RAISE NOTICE '  ✅ Renamed lead_assignment_enabled to prospect_assignment_enabled';
  RAISE NOTICE '  ✅ Set default values for existing rows';
  RAISE NOTICE '';
  RAISE NOTICE 'Departments now have separate controls for:';
  RAISE NOTICE '  - prospect_assignment_enabled: Controls prospect/lead assignments';
  RAISE NOTICE '  - member_assignment_enabled: Controls member assignments';
  RAISE NOTICE '=========================================';
END $$;
