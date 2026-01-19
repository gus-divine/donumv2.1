-- =====================================================
-- Migration: Update application RLS policies for prospect-staff assignments
-- Date: 2026-01-18
-- Description: 
--   - Updates application RLS policies to check prospect-staff assignments
--   - Staff can access application if:
--     1. Prospect assigned to their department AND staff assigned to prospect (cascading)
--     2. OR application directly assigned to their department AND staff
-- =====================================================

-- STEP 1: Drop existing department staff policies (we'll recreate them with prospect-staff checks)
DROP POLICY IF EXISTS "department_staff_view_applications" ON public.applications;
DROP POLICY IF EXISTS "department_staff_update_applications" ON public.applications;
DROP POLICY IF EXISTS "department_staff_create_applications" ON public.applications;

-- STEP 2: Recreate department_staff_view_applications with prospect-staff assignment checks
CREATE POLICY "department_staff_view_applications" ON public.applications
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.donum_accounts u
            WHERE u.id = ((SELECT auth.uid())::UUID)
                AND u.role IN ('donum_staff', 'donum_admin')
                AND EXISTS (
                    SELECT 1
                    FROM public.department_page_permissions dpp
                    WHERE dpp.department_name = ANY(u.departments)
                        AND dpp.page_path = '/admin/applications'
                        AND dpp.can_view = true
                        AND (
                            -- Option 1: Application directly assigned to staff's department
                            (applications.assigned_departments && u.departments)
                            OR
                            -- Option 2: Prospect assigned to staff's department AND staff assigned to prospect (cascading)
                            (
                                EXISTS (
                                    SELECT 1
                                    FROM public.department_members dm
                                    WHERE dm.member_id = applications.applicant_id
                                        AND dm.department_name = ANY(u.departments)
                                        AND dm.is_active = true
                                )
                                AND EXISTS (
                                    SELECT 1
                                    FROM public.prospect_staff_assignments psa
                                    WHERE psa.prospect_id = applications.applicant_id
                                        AND psa.staff_id = u.id
                                        AND psa.is_active = true
                                )
                            )
                        )
                )
        )
    );

-- STEP 3: Recreate department_staff_update_applications with prospect-staff assignment checks
CREATE POLICY "department_staff_update_applications" ON public.applications
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.donum_accounts u
            WHERE u.id = ((SELECT auth.uid())::UUID)
                AND u.role IN ('donum_staff', 'donum_admin')
                AND EXISTS (
                    SELECT 1
                    FROM public.department_page_permissions dpp
                    WHERE dpp.department_name = ANY(u.departments)
                        AND dpp.page_path = '/admin/applications'
                        AND dpp.can_edit = true
                        AND (
                            -- Option 1: Application directly assigned to staff's department
                            (applications.assigned_departments && u.departments)
                            OR
                            -- Option 2: Prospect assigned to staff's department AND staff assigned to prospect (cascading)
                            (
                                EXISTS (
                                    SELECT 1
                                    FROM public.department_members dm
                                    WHERE dm.member_id = applications.applicant_id
                                        AND dm.department_name = ANY(u.departments)
                                        AND dm.is_active = true
                                )
                                AND EXISTS (
                                    SELECT 1
                                    FROM public.prospect_staff_assignments psa
                                    WHERE psa.prospect_id = applications.applicant_id
                                        AND psa.staff_id = u.id
                                        AND psa.is_active = true
                                )
                            )
                        )
                )
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.donum_accounts u
            WHERE u.id = ((SELECT auth.uid())::UUID)
                AND u.role IN ('donum_staff', 'donum_admin')
                AND EXISTS (
                    SELECT 1
                    FROM public.department_page_permissions dpp
                    WHERE dpp.department_name = ANY(u.departments)
                        AND dpp.page_path = '/admin/applications'
                        AND dpp.can_edit = true
                        AND (
                            -- Option 1: Application directly assigned to staff's department
                            (assigned_departments && u.departments)
                            OR
                            -- Option 2: Prospect assigned to staff's department AND staff assigned to prospect (cascading)
                            (
                                EXISTS (
                                    SELECT 1
                                    FROM public.department_members dm
                                    WHERE dm.member_id = applications.applicant_id
                                        AND dm.department_name = ANY(u.departments)
                                        AND dm.is_active = true
                                )
                                AND EXISTS (
                                    SELECT 1
                                    FROM public.prospect_staff_assignments psa
                                    WHERE psa.prospect_id = applications.applicant_id
                                        AND psa.staff_id = u.id
                                        AND psa.is_active = true
                                )
                            )
                        )
                )
        )
    );

-- STEP 4: Recreate department_staff_create_applications (staff can create applications for prospects in their department)
CREATE POLICY "department_staff_create_applications" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.donum_accounts u
            WHERE u.id = ((SELECT auth.uid())::UUID)
                AND u.role IN ('donum_staff', 'donum_admin')
                AND EXISTS (
                    SELECT 1
                    FROM public.department_page_permissions dpp
                    WHERE dpp.department_name = ANY(u.departments)
                        AND dpp.page_path = '/admin/applications'
                        AND dpp.can_edit = true
                        AND (
                            -- Option 1: Application directly assigned to staff's department
                            (assigned_departments && u.departments)
                            OR
                            -- Option 2: Prospect assigned to staff's department AND staff assigned to prospect (cascading)
                            (
                                EXISTS (
                                    SELECT 1
                                    FROM public.department_members dm
                                    WHERE dm.member_id = applicant_id
                                        AND dm.department_name = ANY(u.departments)
                                        AND dm.is_active = true
                                )
                                AND EXISTS (
                                    SELECT 1
                                    FROM public.prospect_staff_assignments psa
                                    WHERE psa.prospect_id = applicant_id
                                        AND psa.staff_id = u.id
                                        AND psa.is_active = true
                                )
                            )
                        )
                )
        )
    );

-- STEP 5: Add RLS optimization indexes for better policy performance
-- Index for department_members queries filtering by member_id first
-- Used in RLS policies: WHERE dm.member_id = applications.applicant_id AND dm.department_name = ANY(u.departments)
CREATE INDEX IF NOT EXISTS idx_department_members_member_dept_active 
ON public.department_members(member_id, department_name, is_active) 
WHERE is_active = true;

-- Index for prospect_staff_assignments queries filtering by prospect_id and staff_id
-- Used in RLS policies: WHERE psa.prospect_id = applications.applicant_id AND psa.staff_id = u.id
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_prospect_staff_active 
ON public.prospect_staff_assignments(prospect_id, staff_id, is_active) 
WHERE is_active = true;

-- Index for department_page_permissions queries filtering by page_path first
-- Used in RLS policies: WHERE dpp.page_path = '/admin/applications' AND dpp.department_name = ANY(u.departments)
CREATE INDEX IF NOT EXISTS idx_department_page_permissions_path_dept 
ON public.department_page_permissions(page_path, department_name);

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 019 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Updated application RLS policies';
    RAISE NOTICE '  ✅ Staff can view/edit if prospect assigned to their department AND staff assigned to prospect';
    RAISE NOTICE '  ✅ OR if application directly assigned to their department';
    RAISE NOTICE '  ✅ Virtual cascade: Prospect assignments grant access to all applications';
    RAISE NOTICE '';
    RAISE NOTICE 'Added RLS optimization indexes';
    RAISE NOTICE '  ✅ idx_department_members_member_dept_active';
    RAISE NOTICE '  ✅ idx_prospect_staff_assignments_prospect_staff_active';
    RAISE NOTICE '  ✅ idx_department_page_permissions_path_dept';
    RAISE NOTICE '=========================================';
END $$;
