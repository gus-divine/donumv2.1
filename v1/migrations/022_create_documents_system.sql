-- Migration 022: Create Documents System
-- Creates documents table for file uploads and document management
-- Supports documents for applications, loans, and general prospect documents
--
-- Prerequisites:
-- - Migration 001: donum_accounts table must exist
-- - Migration 017: applications table must exist
-- - Migration 021: loans table must exist
-- - Migration 018: prospect_staff_assignments table must exist

-- STEP 0: Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 1: Create document_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM (
            'pending',
            'under_review',
            'approved',
            'rejected',
            'expired'
        );
        RAISE NOTICE 'Created document_status enum type';
    ELSE
        RAISE NOTICE 'document_status enum type already exists';
    END IF;
END $$;

-- STEP 2: Create document_type enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'tax_return',
            'bank_statement',
            'proof_income',
            'identity',
            'financial_statement',
            'loan_agreement',
            'payment_receipt',
            'other'
        );
        RAISE NOTICE 'Created document_type enum type';
    ELSE
        RAISE NOTICE 'document_type enum type already exists';
    END IF;
END $$;

-- STEP 3: Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_number TEXT UNIQUE NOT NULL DEFAULT 'DOC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8),
    
    -- Document metadata
    name TEXT NOT NULL,
    document_type document_type NOT NULL,
    status document_status NOT NULL DEFAULT 'pending',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type TEXT NOT NULL, -- e.g., 'application/pdf', 'image/jpeg'
    
    -- Relationships (documents can be linked to applications, loans, or just prospects)
    applicant_id UUID NOT NULL REFERENCES public.donum_accounts(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    
    -- Document details
    description TEXT,
    notes TEXT, -- Internal notes for staff
    rejection_reason TEXT, -- If status is 'rejected'
    expires_at TIMESTAMPTZ, -- For documents that expire (e.g., IDs)
    
    -- Review tracking
    reviewed_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT documents_file_path_unique UNIQUE (file_path)
);

-- STEP 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_applicant_id ON public.documents(applicant_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON public.documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON public.documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by ON public.documents(reviewed_by);

-- STEP 5: Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 7: Row-Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can do everything
CREATE POLICY "super_admins_full_access_documents"
    ON public.documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = auth.uid()
            AND role = 'donum_super_admin'
        )
    );

-- Policy: Applicants can view their own documents
CREATE POLICY "applicants_view_own_documents"
    ON public.documents
    FOR SELECT
    USING (
        applicant_id = auth.uid()
    );

-- Policy: Applicants can insert their own documents
CREATE POLICY "applicants_insert_own_documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        applicant_id = auth.uid()
    );

-- Policy: Applicants can update their own documents (only if status is pending)
CREATE POLICY "applicants_update_own_pending_documents"
    ON public.documents
    FOR UPDATE
    USING (
        applicant_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        applicant_id = auth.uid()
        AND status = 'pending'
    );

-- Policy: Staff can view documents for applications/loans assigned to their department
CREATE POLICY "staff_view_assigned_documents"
    ON public.documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = auth.uid()
            AND da.role IN ('donum_staff', 'donum_admin')
            AND (
                -- Document linked to application assigned to staff's department
                (
                    documents.application_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.applications a
                        WHERE a.id = documents.application_id
                        AND (
                            -- Application assigned to staff's department
                            a.assigned_departments && da.departments
                            OR
                            -- Staff assigned directly to application
                            a.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR
                            -- Staff is primary staff
                            a.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to loan assigned to staff's department
                (
                    documents.loan_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.loans l
                        WHERE l.id = documents.loan_id
                        AND (
                            -- Loan assigned to staff's department
                            l.assigned_departments && da.departments
                            OR
                            -- Staff assigned directly to loan
                            l.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR
                            -- Staff is primary staff
                            l.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to prospect assigned to staff
                (
                    documents.application_id IS NULL
                    AND documents.loan_id IS NULL
                    AND EXISTS (
                        SELECT 1 FROM public.prospect_staff_assignments psa
                        WHERE psa.prospect_id = documents.applicant_id
                        AND psa.staff_id = da.id
                        AND psa.is_active = true
                    )
                )
            )
        )
    );

-- Policy: Staff can insert documents for assigned applications/loans
CREATE POLICY "staff_insert_assigned_documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = auth.uid()
            AND da.role IN ('donum_staff', 'donum_admin')
            AND (
                -- Document linked to application assigned to staff's department
                (
                    documents.application_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.applications a
                        WHERE a.id = documents.application_id
                        AND (
                            a.assigned_departments && da.departments
                            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR a.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to loan assigned to staff's department
                (
                    documents.loan_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.loans l
                        WHERE l.id = documents.loan_id
                        AND (
                            l.assigned_departments && da.departments
                            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR l.primary_staff_id = da.id
                        )
                    )
                )
            )
        )
    );

-- Policy: Staff can update documents for assigned applications/loans (review, approve, reject)
CREATE POLICY "staff_update_assigned_documents"
    ON public.documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = auth.uid()
            AND da.role IN ('donum_staff', 'donum_admin')
            AND (
                -- Document linked to application assigned to staff's department
                (
                    documents.application_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.applications a
                        WHERE a.id = documents.application_id
                        AND (
                            a.assigned_departments && da.departments
                            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR a.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to loan assigned to staff's department
                (
                    documents.loan_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.loans l
                        WHERE l.id = documents.loan_id
                        AND (
                            l.assigned_departments && da.departments
                            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR l.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to prospect assigned to staff
                (
                    documents.application_id IS NULL
                    AND documents.loan_id IS NULL
                    AND EXISTS (
                        SELECT 1 FROM public.prospect_staff_assignments psa
                        WHERE psa.prospect_id = documents.applicant_id
                        AND psa.staff_id = da.id
                        AND psa.is_active = true
                    )
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = auth.uid()
            AND da.role IN ('donum_staff', 'donum_admin')
            AND (
                -- Document linked to application assigned to staff's department
                (
                    documents.application_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.applications a
                        WHERE a.id = documents.application_id
                        AND (
                            a.assigned_departments && da.departments
                            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR a.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to loan assigned to staff's department
                (
                    documents.loan_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.loans l
                        WHERE l.id = documents.loan_id
                        AND (
                            l.assigned_departments && da.departments
                            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR l.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to prospect assigned to staff
                (
                    documents.application_id IS NULL
                    AND documents.loan_id IS NULL
                    AND EXISTS (
                        SELECT 1 FROM public.prospect_staff_assignments psa
                        WHERE psa.prospect_id = documents.applicant_id
                        AND psa.staff_id = da.id
                        AND psa.is_active = true
                    )
                )
            )
        )
    );

-- Policy: Staff can delete documents for assigned applications/loans (only if status is pending)
CREATE POLICY "staff_delete_assigned_pending_documents"
    ON public.documents
    FOR DELETE
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM public.donum_accounts da
            WHERE da.id = auth.uid()
            AND da.role IN ('donum_staff', 'donum_admin')
            AND (
                -- Document linked to application assigned to staff's department
                (
                    documents.application_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.applications a
                        WHERE a.id = documents.application_id
                        AND (
                            a.assigned_departments && da.departments
                            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR a.primary_staff_id = da.id
                        )
                    )
                )
                OR
                -- Document linked to loan assigned to staff's department
                (
                    documents.loan_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.loans l
                        WHERE l.id = documents.loan_id
                        AND (
                            l.assigned_departments && da.departments
                            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
                            OR l.primary_staff_id = da.id
                        )
                    )
                )
            )
        )
    );

-- STEP 8: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- STEP 9: Comments for documentation
COMMENT ON TABLE public.documents IS 'Stores document metadata and file references for applications, loans, and general prospect documents';
COMMENT ON COLUMN public.documents.file_path IS 'Path to file in Supabase Storage bucket (e.g., applications/{application_id}/{document_id}/{filename})';
COMMENT ON COLUMN public.documents.document_type IS 'Type of document (tax_return, bank_statement, etc.)';
COMMENT ON COLUMN public.documents.status IS 'Review status of the document';
COMMENT ON COLUMN public.documents.expires_at IS 'Expiration date for documents that expire (e.g., government IDs)';
