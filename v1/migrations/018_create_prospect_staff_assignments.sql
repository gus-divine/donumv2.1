-- Idempotent finalizing migration for prospect_staff_assignments

-- Ensure extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table (already exists) -- safe to leave as-is

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_staff_assignments_unique_primary 
ON public.prospect_staff_assignments(prospect_id) 
WHERE is_primary = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_prospect_id ON public.prospect_staff_assignments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_staff_id ON public.prospect_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_is_active ON public.prospect_staff_assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prospect_staff_assignments_is_primary ON public.prospect_staff_assignments(is_primary) WHERE is_primary = true AND is_active = true;

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.update_prospect_staff_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prospect_staff_assignments_updated_at ON public.prospect_staff_assignments;
CREATE TRIGGER trigger_update_prospect_staff_assignments_updated_at
    BEFORE UPDATE ON public.prospect_staff_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_prospect_staff_assignments_updated_at();

CREATE OR REPLACE FUNCTION public.soft_delete_prospect_staff_assignment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.prospect_staff_assignments
    SET 
        is_active = false,
        unassigned_at = NOW(),
        unassigned_by = (SELECT auth.uid())::UUID,
        updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_soft_delete_prospect_staff_assignment ON public.prospect_staff_assignments;
CREATE TRIGGER trigger_soft_delete_prospect_staff_assignment
    BEFORE DELETE ON public.prospect_staff_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.soft_delete_prospect_staff_assignment();

-- Enable RLS and grants
ALTER TABLE public.prospect_staff_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_staff_assignments TO authenticated;

-- Drop existing policies if present, then recreate
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'prospects_view_own_assignments') THEN
        EXECUTE 'DROP POLICY prospects_view_own_assignments ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'super_admin_prospect_staff_assignments_all') THEN
        EXECUTE 'DROP POLICY super_admin_prospect_staff_assignments_all ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'staff_view_department_prospect_assignments') THEN
        EXECUTE 'DROP POLICY staff_view_department_prospect_assignments ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'staff_view_own_assignments') THEN
        EXECUTE 'DROP POLICY staff_view_own_assignments ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'staff_create_prospect_assignments') THEN
        EXECUTE 'DROP POLICY staff_create_prospect_assignments ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'staff_update_prospect_assignments') THEN
        EXECUTE 'DROP POLICY staff_update_prospect_assignments ON public.prospect_staff_assignments';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_staff_assignments' AND policyname = 'staff_delete_prospect_assignments') THEN
        EXECUTE 'DROP POLICY staff_delete_prospect_assignments ON public.prospect_staff_assignments';
    END IF;
END $$;

-- Recreate policies
CREATE POLICY prospects_view_own_assignments ON public.prospect_staff_assignments
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND prospect_id = ((SELECT auth.uid())::UUID)
    );

CREATE POLICY super_admin_prospect_staff_assignments_all ON public.prospect_staff_assignments
    FOR ALL TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
    );

CREATE POLICY staff_view_department_prospect_assignments ON public.prospect_staff_assignments
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
                    FROM public.department_members dm
                    WHERE dm.member_id = prospect_id
                        AND dm.department_name = ANY(u.departments)
                        AND dm.is_active = true
                )
        )
    );

CREATE POLICY staff_view_own_assignments ON public.prospect_staff_assignments
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND staff_id = ((SELECT auth.uid())::UUID)
    );

CREATE POLICY staff_create_prospect_assignments ON public.prospect_staff_assignments
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
                        AND dpp.page_path IN ('/admin/members', '/admin/applications')
                        AND dpp.can_edit = true
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.department_members dm
                    WHERE dm.member_id = prospect_id
                        AND dm.department_name = ANY(u.departments)
                        AND dm.is_active = true
                )
        )
    );

CREATE POLICY staff_update_prospect_assignments ON public.prospect_staff_assignments
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
                        AND dpp.page_path IN ('/admin/members', '/admin/applications')
                        AND dpp.can_edit = true
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.department_members dm
                    WHERE dm.member_id = prospect_id
                        AND dm.department_name = ANY(u.departments)
                        AND dm.is_active = true
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
                        AND dpp.page_path IN ('/admin/members', '/admin/applications')
                        AND dpp.can_edit = true
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.department_members dm
                    WHERE dm.member_id = prospect_id
                        AND dm.department_name = ANY(u.departments)
                        AND dm.is_active = true
                )
        )
    );

CREATE POLICY staff_delete_prospect_assignments ON public.prospect_staff_assignments
    FOR DELETE TO authenticated
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
                        AND dpp.page_path IN ('/admin/members', '/admin/applications')
                        AND dpp.can_edit = true
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.department_members dm
                    WHERE dm.member_id = prospect_id
                        AND dm.department_name = ANY(u.departments)
                        AND dm.is_active = true
                )
        )
    );

-- Comments (idempotent)
COMMENT ON TABLE public.prospect_staff_assignments IS 'Tracks staff assignments to prospects. Assignments cascade to all applications via RLS policies.';
COMMENT ON COLUMN public.prospect_staff_assignments.prospect_id IS 'The prospect/member/lead being assigned (references donum_accounts)';
COMMENT ON COLUMN public.prospect_staff_assignments.staff_id IS 'The staff member assigned to the prospect (references donum_accounts)';
COMMENT ON COLUMN public.prospect_staff_assignments.is_active IS 'Whether this assignment is currently active (false = unassigned)';
COMMENT ON COLUMN public.prospect_staff_assignments.is_primary IS 'Whether this staff member is the primary staff for the prospect (only one primary per prospect)';
COMMENT ON COLUMN public.prospect_staff_assignments.assigned_at IS 'When the assignment was created';
COMMENT ON COLUMN public.prospect_staff_assignments.assigned_by IS 'Who created the assignment';
COMMENT ON COLUMN public.prospect_staff_assignments.unassigned_at IS 'When the assignment was removed (soft delete)';
COMMENT ON COLUMN public.prospect_staff_assignments.unassigned_by IS 'Who removed the assignment';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Migration finalization applied for prospect_staff_assignments';
END $$;