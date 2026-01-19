-- STEP 0: Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 1: Create application_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM (
            'draft',
            'submitted',
            'under_review',
            'document_collection',
            'approved',
            'rejected',
            'funded',
            'closed',
            'cancelled'
        );
        RAISE NOTICE 'Created application_status enum type';
    ELSE
        RAISE NOTICE 'application_status enum type already exists';
    END IF;
END $$;

-- STEP 2: Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    applicant_id UUID NOT NULL REFERENCES public.donum_accounts(id) ON DELETE CASCADE,
    application_number TEXT UNIQUE NOT NULL DEFAULT 'APP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8),
    status application_status NOT NULL DEFAULT 'draft',
    requested_amount DECIMAL(15, 2),
    annual_income DECIMAL(15, 2),
    net_worth DECIMAL(15, 2),
    tax_bracket TEXT,
    risk_tolerance TEXT,
    investment_goals JSONB DEFAULT '{}',
    application_type TEXT DEFAULT 'loan',
    purpose TEXT,
    notes TEXT,
    internal_notes TEXT,
    assigned_departments TEXT[] DEFAULT '{}',
    assigned_staff UUID[] DEFAULT '{}',
    primary_staff_id UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    current_step TEXT DEFAULT 'submission',
    workflow_data JSONB DEFAULT '{}',
    required_documents TEXT[] DEFAULT '{}',
    submitted_documents TEXT[] DEFAULT '{}',
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    closure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL
);

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_departments ON public.applications USING GIN(assigned_departments);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_staff ON public.applications USING GIN(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_applications_primary_staff_id ON public.applications(primary_staff_id);
CREATE INDEX IF NOT EXISTS idx_applications_application_number ON public.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON public.applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'donum_accounts'
    ) THEN
        BEGIN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_donum_accounts_departments_gin ON public.donum_accounts USING GIN(departments)';
        EXCEPTION 
            WHEN undefined_column THEN
                RAISE NOTICE 'donum_accounts.departments column not found; skipping GIN index creation';
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating idx_donum_accounts_departments_gin: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'public.donum_accounts table not found; skipping donum_accounts indexes';
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'department_page_permissions'
    ) THEN
        BEGIN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_department_page_permissions_name_path ON public.department_page_permissions(department_name, page_path)';
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating idx_department_page_permissions_name_path: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'public.department_page_permissions table not found; skipping department_page_permissions index creation';
    END IF;
END $$;

-- STEP 4: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_applications_updated_at();

-- STEP 5: Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- STEP 6: RLS Policies
CREATE POLICY "applicants_view_own_applications" ON public.applications
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND applicant_id = ((SELECT auth.uid())::UUID)
    );

CREATE POLICY "applicants_create_own_applications" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND applicant_id = ((SELECT auth.uid())::UUID)
    );

CREATE POLICY "applicants_update_own_applications" ON public.applications
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND applicant_id = ((SELECT auth.uid())::UUID)
        AND status IN ('draft', 'submitted')
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND applicant_id = ((SELECT auth.uid())::UUID)
    );

CREATE POLICY "super_admin_applications_all" ON public.applications
    FOR ALL TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND public.is_super_admin_helper((SELECT auth.uid())::UUID)
    );

CREATE POLICY "department_staff_view_applications" ON public.applications
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            EXISTS (
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
                                applications.assigned_departments && u.departments
                                OR
                                (applications.assigned_departments IS NULL OR cardinality(applications.assigned_departments) = 0)
                            )
                    )
            )
        )
    );

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
                            applications.assigned_departments && u.departments
                            OR (applications.assigned_departments IS NULL OR cardinality(applications.assigned_departments) = 0)
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
                            assigned_departments && u.departments
                            OR (assigned_departments IS NULL OR cardinality(assigned_departments) = 0)
                        )
                )
            )
        )
    ;

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
                )
            )
        )
    ;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE 'MIGRATION 017 COMPLETED SUCCESSFULLY';
END $$;
