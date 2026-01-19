-- =====================================================
-- MIGRATION 021: Create Loans System
-- Creates loans and loan_payments tables with RLS policies
-- =====================================================

-- STEP 0: Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 1: Create loan_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE loan_status AS ENUM (
            'pending',
            'active',
            'paid_off',
            'defaulted',
            'cancelled',
            'closed'
        );
        RAISE NOTICE 'Created loan_status enum type';
    ELSE
        RAISE NOTICE 'loan_status enum type already exists';
    END IF;
END $$;

-- STEP 2: Create payment_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending',
            'scheduled',
            'paid',
            'overdue',
            'missed',
            'cancelled'
        );
        RAISE NOTICE 'Created payment_status enum type';
    ELSE
        RAISE NOTICE 'payment_status enum type already exists';
    END IF;
END $$;

-- STEP 3: Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_number TEXT UNIQUE NOT NULL DEFAULT 'LOAN-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.donum_accounts(id) ON DELETE CASCADE,
    plan_code TEXT REFERENCES public.donum_plans(code) ON DELETE SET NULL,
    status loan_status NOT NULL DEFAULT 'pending',
    
    -- Loan Terms
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000, -- e.g., 0.0500 = 5%
    term_months INTEGER NOT NULL,
    payment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annually')),
    
    -- Financial Tracking
    current_balance DECIMAL(15, 2) NOT NULL,
    total_paid DECIMAL(15, 2) DEFAULT 0.00,
    total_interest_paid DECIMAL(15, 2) DEFAULT 0.00,
    total_principal_paid DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Payment Schedule
    next_payment_date DATE,
    next_payment_amount DECIMAL(15, 2),
    last_payment_date DATE,
    last_payment_amount DECIMAL(15, 2),
    
    -- Dates
    disbursed_at TIMESTAMPTZ,
    maturity_date DATE,
    paid_off_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Assignment & Tracking
    assigned_departments TEXT[] DEFAULT '{}',
    assigned_staff UUID[] DEFAULT '{}',
    primary_staff_id UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    
    -- Additional Data
    amortization_schedule JSONB DEFAULT '{}'::jsonb,
    loan_terms JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL
);

-- STEP 4: Create loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_number INTEGER NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- Payment Details
    scheduled_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    amount_due DECIMAL(15, 2) NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Late Fees & Penalties
    late_fee DECIMAL(15, 2) DEFAULT 0.00,
    penalty_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Payment Method
    payment_method TEXT,
    payment_reference TEXT,
    payment_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    
    -- Ensure unique payment numbers per loan
    UNIQUE(loan_id, payment_number)
);

-- STEP 5: Create indexes for loans table
CREATE INDEX IF NOT EXISTS idx_loans_application_id ON public.loans(application_id);
CREATE INDEX IF NOT EXISTS idx_loans_applicant_id ON public.loans(applicant_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_plan_code ON public.loans(plan_code);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_loans_assigned_departments ON public.loans USING GIN(assigned_departments);
CREATE INDEX IF NOT EXISTS idx_loans_assigned_staff ON public.loans USING GIN(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_loans_primary_staff_id ON public.loans(primary_staff_id);
CREATE INDEX IF NOT EXISTS idx_loans_next_payment_date ON public.loans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);

-- STEP 5b: Note on RLS policy performance indexes
-- The following indexes are expected to exist for optimal RLS policy performance:
-- - idx_donum_accounts_departments_gin (GIN index on donum_accounts.departments)
-- - Indexes on department_page_permissions(department_name, page_path)
-- These indexes are created in earlier migrations and are not recreated here to avoid duplicates.

-- STEP 6: Create indexes for loan_payments table
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_due_date ON public.loan_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_scheduled_date ON public.loan_payments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_paid_date ON public.loan_payments(paid_date);

-- STEP 7: Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at
    BEFORE UPDATE ON public.loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 8: Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS Policies for loans

-- Super admin can do everything
CREATE POLICY "super_admin_loans_full_access" ON public.loans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = (SELECT auth.uid()) AND role = 'donum_super_admin'
        )
    );

-- Applicants can view their own loans
CREATE POLICY "applicants_view_own_loans" ON public.loans
    FOR SELECT
    USING (applicant_id = (SELECT auth.uid()));

-- Department staff can view loans assigned to their departments
CREATE POLICY "department_staff_view_assigned_loans" ON public.loans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = (SELECT auth.uid())
            AND (
                -- Staff assigned to loan's departments
                assigned_departments && da.departments
                OR
                -- Staff assigned directly to loan
                (SELECT auth.uid()) = ANY(assigned_staff)
                OR
                -- Primary staff
                (SELECT auth.uid()) = primary_staff_id
            )
        )
    );

-- Department staff can update loans assigned to their departments (if they have edit permission)
-- Note: For soft delete, use UPDATE to set status = 'cancelled' instead of DELETE
CREATE POLICY "department_staff_update_assigned_loans" ON public.loans
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE da.id = (SELECT auth.uid())
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
            AND (
                -- Staff assigned to loan's departments
                assigned_departments && da.departments
                OR
                -- Staff assigned directly to loan
                (SELECT auth.uid()) = ANY(assigned_staff)
                OR
                -- Primary staff
                (SELECT auth.uid()) = primary_staff_id
            )
        )
    )
    WITH CHECK (
        -- Ensure user still has edit permission after update
        -- Note: Field immutability (applicant_id, created_at, etc.) should be enforced
        -- at the application level or via triggers, as WITH CHECK cannot reference OLD
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE da.id = (SELECT auth.uid())
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
            AND (
                assigned_departments && da.departments
                OR (SELECT auth.uid()) = ANY(assigned_staff)
                OR (SELECT auth.uid()) = primary_staff_id
            )
        )
    );

-- Super admin and department staff with edit permission can create loans
CREATE POLICY "staff_create_loans" ON public.loans
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = auth.uid() AND role = 'donum_super_admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE da.id = auth.uid()
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
        )
    );

-- Note: Hard DELETE is restricted to super admin only.
-- For soft delete, use UPDATE to set status = 'cancelled' via the update policy above.
-- This prevents accidental data loss and maintains audit trail.

-- STEP 10: Create RLS Policies for loan_payments

-- Super admin can do everything
CREATE POLICY "super_admin_loan_payments_full_access" ON public.loan_payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = auth.uid() AND role = 'donum_super_admin'
        )
    );

-- Applicants can view payments for their own loans
CREATE POLICY "applicants_view_own_loan_payments" ON public.loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.loans l
            WHERE l.id = loan_id
            AND l.applicant_id = (SELECT auth.uid())
        )
    );

-- Department staff can view payments for loans they have access to
CREATE POLICY "department_staff_view_loan_payments" ON public.loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.loans l
            JOIN public.donum_accounts da ON da.id = auth.uid()
            WHERE l.id = loan_id
            AND (
                l.assigned_departments && da.departments
                OR auth.uid() = ANY(l.assigned_staff)
                OR auth.uid() = l.primary_staff_id
            )
        )
    );

-- Department staff with edit permission can create payments
CREATE POLICY "department_staff_create_loan_payments" ON public.loan_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.loans l
            JOIN public.donum_accounts da ON da.id = (SELECT auth.uid())
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE l.id = loan_id
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
            AND (
                l.assigned_departments && da.departments
                OR (SELECT auth.uid()) = ANY(l.assigned_staff)
                OR (SELECT auth.uid()) = l.primary_staff_id
            )
        )
    );

-- Department staff with edit permission can update payments
CREATE POLICY "department_staff_update_loan_payments" ON public.loan_payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.loans l
            JOIN public.donum_accounts da ON da.id = auth.uid()
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE l.id = loan_id
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
            AND (
                l.assigned_departments && da.departments
                OR auth.uid() = ANY(l.assigned_staff)
                OR auth.uid() = l.primary_staff_id
            )
        )
    )
    WITH CHECK (
        -- Ensure user still has edit permission after update
        -- Note: Field immutability (loan_id, payment_number) should be enforced
        -- at the application level or via triggers, as WITH CHECK cannot reference OLD
        EXISTS (
            SELECT 1 FROM public.loans l
            JOIN public.donum_accounts da ON da.id = auth.uid()
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE l.id = loan_id
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_edit = true
            AND (
                l.assigned_departments && da.departments
                OR auth.uid() = ANY(l.assigned_staff)
                OR auth.uid() = l.primary_staff_id
            )
        )
    );

-- Department staff with delete permission can delete payments
-- Note: Payments may legitimately need deletion (e.g., duplicate entries, corrections)
CREATE POLICY "department_staff_delete_loan_payments" ON public.loan_payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.loans l
            JOIN public.donum_accounts da ON da.id = (SELECT auth.uid())
            JOIN public.department_page_permissions dpp ON dpp.department_name = ANY(da.departments)
            WHERE l.id = loan_id
            AND dpp.page_path = '/admin/loans'
            AND dpp.can_delete = true
            AND (
                l.assigned_departments && da.departments
                OR (SELECT auth.uid()) = ANY(l.assigned_staff)
                OR (SELECT auth.uid()) = l.primary_staff_id
            )
        )
    );

-- STEP 11: Grant permissions
-- Note: DELETE on loans is restricted to super admin only (via RLS policy).
-- Staff should use UPDATE to set status = 'cancelled' for soft delete.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_payments TO authenticated;

-- STEP 12: Success message
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 021 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  ✅ loans';
    RAISE NOTICE '  ✅ loan_payments';
    RAISE NOTICE 'Created enums:';
    RAISE NOTICE '  ✅ loan_status';
    RAISE NOTICE '  ✅ payment_status';
    RAISE NOTICE 'Created indexes and RLS policies';
    RAISE NOTICE '=========================================';
END $$;
