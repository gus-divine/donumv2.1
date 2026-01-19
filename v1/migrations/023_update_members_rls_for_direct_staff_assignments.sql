-- =====================================================
-- Migration: Update members RLS policies for direct staff assignments
-- Date: 2026-01-18
-- Description: 
--   - Updates donum_accounts RLS policy to require BOTH:
--     1. Member assigned to staff's department (via department_members)
--     2. Staff directly assigned to member (via prospect_staff_assignments)
--   - This ensures staff can only see members they are directly assigned to,
--     even if the member is in their department
-- =====================================================

-- STEP 1: Drop existing department_staff_members policy
DROP POLICY IF EXISTS "department_staff_members" ON public.donum_accounts;

-- STEP 2: Recreate department_staff_members policy with direct assignment requirement
CREATE POLICY "department_staff_members" ON public.donum_accounts
    FOR SELECT TO authenticated
    USING (
        -- Users can always read their own record
        ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()))
        -- OR super admin can see everything (using helper function to avoid RLS recursion)
        OR (
            (SELECT auth.uid()) IS NOT NULL
            AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
        )
        -- OR staff can see members/prospects if BOTH conditions are met:
        --   1. Member assigned to staff's department
        --   2. Staff directly assigned to member
        OR (
            (SELECT auth.uid()) IS NOT NULL
            AND public.is_staff_or_admin_helper((SELECT auth.uid())::UUID)
            AND EXISTS (
                SELECT 1
                FROM public.department_page_permissions dpp
                WHERE dpp.department_name = ANY(
                    public.get_user_departments_helper((SELECT auth.uid())::UUID)
                )
                    AND dpp.page_path = '/admin/members'
                    AND dpp.can_view = true
                    -- AND the member is assigned to one of the user's departments
                    AND EXISTS (
                        SELECT 1 FROM public.department_members dm
                        WHERE dm.member_id = donum_accounts.id
                            AND dm.department_name = ANY(
                                public.get_user_departments_helper((SELECT auth.uid())::UUID)
                            )
                            AND dm.is_active = true
                    )
                    -- AND the staff member is directly assigned to this member/prospect
                    AND EXISTS (
                        SELECT 1 FROM public.prospect_staff_assignments psa
                        WHERE psa.prospect_id = donum_accounts.id
                            AND psa.staff_id = (SELECT auth.uid())::UUID
                            AND psa.is_active = true
                    )
            )
        )
    );

-- STEP 3: Add RLS optimization index for better policy performance
-- Index for prospect_staff_assignments queries filtering by prospect_id and staff_id
-- Used in RLS policy: WHERE psa.prospect_id = donum_accounts.id AND psa.staff_id = auth.uid()
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_prospect_staff_active_members 
ON public.prospect_staff_assignments(prospect_id, staff_id, is_active) 
WHERE is_active = true;

-- Index for department_members queries filtering by member_id first
-- Used in RLS policy: WHERE dm.member_id = donum_accounts.id AND dm.department_name = ANY(...)
CREATE INDEX IF NOT EXISTS idx_department_members_member_dept_active_members 
ON public.department_members(member_id, department_name, is_active) 
WHERE is_active = true;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 023 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Updated donum_accounts RLS policy';
    RAISE NOTICE '  ✅ Staff can see members ONLY if BOTH:';
    RAISE NOTICE '     1. Member assigned to staff''s department';
    RAISE NOTICE '     2. Staff directly assigned to member';
    RAISE NOTICE '';
    RAISE NOTICE 'Added RLS optimization indexes';
    RAISE NOTICE '  ✅ idx_prospect_staff_assignments_prospect_staff_active_members';
    RAISE NOTICE '  ✅ idx_department_members_member_dept_active_members';
    RAISE NOTICE '=========================================';
END $$;
