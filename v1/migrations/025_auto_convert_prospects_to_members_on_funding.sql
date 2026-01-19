-- =====================================================
-- Migration: Auto-convert prospects to members on funding
-- Date: 2026-01-18
-- Description: 
--   Creates a trigger that automatically converts prospects/leads
--   to members when their application status changes to 'funded'
-- =====================================================

-- STEP 1: Create function to convert prospect to member
CREATE OR REPLACE FUNCTION public.convert_prospect_to_member_on_funding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Only process if status changed to 'funded'
  IF NEW.status = 'funded' AND (OLD.status IS NULL OR OLD.status != 'funded') THEN
    -- Update the applicant's role to donum_member if they're currently a prospect/lead
    UPDATE public.donum_accounts
    SET 
      role = 'donum_member',
      onboarding_complete = true,
      updated_at = NOW()
    WHERE id = NEW.applicant_id
      AND role IN ('donum_lead', 'donum_prospect');
    
    RAISE NOTICE 'Converted prospect % to member (application %)', NEW.applicant_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure function is owned by postgres
ALTER FUNCTION public.convert_prospect_to_member_on_funding() OWNER TO postgres;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.convert_prospect_to_member_on_funding() TO authenticated;

-- STEP 2: Create trigger on applications table
DROP TRIGGER IF EXISTS trigger_convert_prospect_to_member_on_funding ON public.applications;

CREATE TRIGGER trigger_convert_prospect_to_member_on_funding
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'funded')
  EXECUTE FUNCTION public.convert_prospect_to_member_on_funding();

-- STEP 3: Handle existing funded applications (backfill)
-- Convert any prospects that already have funded applications
UPDATE public.donum_accounts
SET 
  role = 'donum_member',
  onboarding_complete = true,
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT applicant_id 
  FROM public.applications 
  WHERE status = 'funded'
)
AND role IN ('donum_lead', 'donum_prospect');

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 025 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created automatic prospect-to-member conversion:';
    RAISE NOTICE '  ✅ Function: convert_prospect_to_member_on_funding()';
    RAISE NOTICE '  ✅ Trigger: trigger_convert_prospect_to_member_on_funding';
    RAISE NOTICE '  ✅ Fires when application status = ''funded''';
    RAISE NOTICE '';
    RAISE NOTICE 'Backfilled existing funded applications';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT:';
    RAISE NOTICE '   - Prospects automatically become members when funded';
    RAISE NOTICE '   - onboarding_complete set to true';
    RAISE NOTICE '   - Works for both INSERT and UPDATE operations';
    RAISE NOTICE '=========================================';
END $$;
