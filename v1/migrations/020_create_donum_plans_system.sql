-- Migration 020: Create Donum Plans System
-- Creates donum_plans table (plan templates) and application_plans junction table (prospect-specific assignments)
-- Based on Donum 2.0 products system

-- STEP 0: Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 1: Create donum_plans table (plan templates)
CREATE TABLE IF NOT EXISTS public.donum_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Plan identification
  code TEXT UNIQUE NOT NULL, -- 'defund', 'diversion', 'divest'
  name TEXT NOT NULL, -- 'Donum Defund', etc.
  description TEXT,
  
  -- Plan requirements
  min_income DECIMAL(15,2),
  min_assets DECIMAL(15,2),
  min_age DECIMAL(5,2), -- Can be decimal for 59.5
  required_asset_types TEXT[],
  requires_charitable_intent BOOLEAN DEFAULT true,
  
  -- Tax information
  tax_deduction_percent DECIMAL(5,2) NOT NULL, -- 60% or 100%
  
  -- Plan benefits (array of benefit descriptions)
  benefits TEXT[] DEFAULT '{}',
  
  -- Calculator configuration (JSONB for formulas, variables, etc.)
  calculator_config JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL
);

-- STEP 2: Create application_plans junction table (prospect-specific plan assignments with customizations)
CREATE TABLE IF NOT EXISTS public.application_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.donum_plans(code) ON DELETE CASCADE,
  
  -- Assignment info
  assigned_by UUID REFERENCES public.donum_accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Customizations per prospect (override plan defaults)
  custom_loan_amount DECIMAL(15,2), -- Override default max loan amount
  custom_max_amount DECIMAL(15,2), -- Override calculated max
  custom_terms JSONB DEFAULT '{}'::jsonb, -- Custom terms: interest_rate, duration, payment_schedule, etc.
  
  -- Calculator results (calculated values specific to this prospect)
  calculator_results JSONB DEFAULT '{}'::jsonb,
  last_calculated_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT, -- Admin notes about this specific assignment
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one plan per application (can be changed, but only one active at a time)
  UNIQUE(application_id, plan_code)
);

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_donum_plans_code ON public.donum_plans(code);
CREATE INDEX IF NOT EXISTS idx_donum_plans_is_active ON public.donum_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_application_plans_application_id ON public.application_plans(application_id);
CREATE INDEX IF NOT EXISTS idx_application_plans_plan_code ON public.application_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_application_plans_assigned_by ON public.application_plans(assigned_by);

-- STEP 4: Insert initial plan templates (Defund, Diversion, Divest)
INSERT INTO public.donum_plans (code, name, description, min_income, min_assets, min_age, required_asset_types, requires_charitable_intent, tax_deduction_percent, benefits, is_active)
VALUES
  (
    'defund',
    'Donum Defund',
    'Redirect up to 60% of income tax toward charitable giving',
    200000, -- $200K+ annual income
    NULL,
    NULL,
    NULL,
    true,
    60.00,
    ARRAY[
      'Redirect up to 60% of your income tax liability to charitable giving',
      'Reduce your tax burden while maximizing charitable impact',
      'Ideal for high-income earners ($200K+ annually)',
      'Requires $500K+ annual donation capacity'
    ],
    true
  ),
  (
    'diversion',
    'Donum Diversion',
    'Net tax-free IRA rollover conversion',
    NULL,
    500000, -- $500K+ assets
    59.5, -- IRA withdrawal age
    ARRAY['IRA'],
    true,
    100.00,
    ARRAY[
      'Net tax-free IRA rollover conversion',
      'Avoid taxes on IRA distributions when converting to charitable giving',
      'Must be 59.5+ years old with IRA assets',
      'Requires $500K+ annual donation capacity'
    ],
    true
  ),
  (
    'divest',
    'Donum Divest',
    '60% deduction on capital gains',
    NULL,
    500000, -- $500K+ assets
    NULL,
    ARRAY['business', 'property'],
    true,
    60.00,
    ARRAY[
      '60% deduction on capital gains from asset sales',
      'Maximize tax benefits when divesting business or property assets',
      'Ideal for business owners and real estate investors',
      'Requires $500K+ annual donation capacity'
    ],
    true
  )
ON CONFLICT (code) DO NOTHING;

-- STEP 5: Create updated_at trigger for donum_plans
CREATE OR REPLACE FUNCTION update_donum_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_donum_plans_updated_at ON public.donum_plans;
CREATE TRIGGER trigger_update_donum_plans_updated_at
  BEFORE UPDATE ON public.donum_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_donum_plans_updated_at();

-- STEP 6: Create updated_at trigger for application_plans
CREATE OR REPLACE FUNCTION update_application_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_application_plans_updated_at ON public.application_plans;
CREATE TRIGGER trigger_update_application_plans_updated_at
  BEFORE UPDATE ON public.application_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_application_plans_updated_at();

-- STEP 7: Enable RLS
ALTER TABLE public.donum_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_plans ENABLE ROW LEVEL SECURITY;

-- STEP 8: RLS Policies for donum_plans
-- Anyone can view active plans (prospects need to see them)
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.donum_plans;
CREATE POLICY "Anyone can view active plans" ON public.donum_plans
  FOR SELECT
  USING (is_active = true);

-- Admins can view all plans (including inactive)
DROP POLICY IF EXISTS "Admins can view all plans" ON public.donum_plans;
CREATE POLICY "Admins can view all plans" ON public.donum_plans
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = (SELECT auth.uid())
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  );

-- Admins can manage plans (create, update, delete)
DROP POLICY IF EXISTS "Admins can manage plans" ON public.donum_plans;
CREATE POLICY "Admins can manage plans" ON public.donum_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid()
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid()
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  );

-- STEP 9: RLS Policies for application_plans
-- Applicants can view their own application plans
DROP POLICY IF EXISTS "Applicants can view their application plans" ON public.application_plans;
CREATE POLICY "Applicants can view their application plans" ON public.application_plans
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_plans.application_id
      AND applications.applicant_id = (SELECT auth.uid())
    )
  );

-- Admins can view all application plans
DROP POLICY IF EXISTS "Admins can view all application plans" ON public.application_plans;
CREATE POLICY "Admins can view all application plans" ON public.application_plans
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = (SELECT auth.uid())
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  );

-- Staff can view application plans for applications they have access to
DROP POLICY IF EXISTS "Staff can view assigned application plans" ON public.application_plans;
CREATE POLICY "Staff can view assigned application plans" ON public.application_plans
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_plans.application_id
      AND (
        -- Super admin
        EXISTS (
          SELECT 1 FROM public.donum_accounts
          WHERE id = (SELECT auth.uid())
          AND role = 'donum_super_admin'
        )
        OR
        -- Application directly assigned to staff
        (SELECT auth.uid()) = ANY(applications.assigned_staff)
        OR
        (SELECT auth.uid()) = applications.primary_staff_id
        OR
        -- Prospect assigned to staff's department AND staff assigned to prospect
        (
          EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = (SELECT auth.uid())
            AND role = 'donum_staff'
            AND departments && applications.assigned_departments
          )
          AND EXISTS (
            SELECT 1 FROM public.prospect_staff_assignments
            WHERE prospect_id = applications.applicant_id
            AND staff_id = (SELECT auth.uid())
            AND is_active = true
          )
        )
      )
    )
  );

-- Admins can manage application plans
DROP POLICY IF EXISTS "Admins can manage application plans" ON public.application_plans;
CREATE POLICY "Admins can manage application plans" ON public.application_plans
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = (SELECT auth.uid())
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = (SELECT auth.uid())
      AND (role = 'donum_super_admin' OR role = 'donum_admin')
    )
  );

-- Staff can manage application plans for applications they have access to (same logic as view)
DROP POLICY IF EXISTS "Staff can manage assigned application plans" ON public.application_plans;
CREATE POLICY "Staff can manage assigned application plans" ON public.application_plans
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_plans.application_id
      AND (
        -- Application directly assigned to staff
        (SELECT auth.uid()) = ANY(applications.assigned_staff)
        OR
        (SELECT auth.uid()) = applications.primary_staff_id
        OR
        -- Prospect assigned to staff's department AND staff assigned to prospect
        (
          EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = (SELECT auth.uid())
            AND role = 'donum_staff'
            AND departments && applications.assigned_departments
          )
          AND EXISTS (
            SELECT 1 FROM public.prospect_staff_assignments
            WHERE prospect_id = applications.applicant_id
            AND staff_id = (SELECT auth.uid())
            AND is_active = true
          )
        )
      )
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_plans.application_id
      AND (
        (SELECT auth.uid()) = ANY(applications.assigned_staff)
        OR
        (SELECT auth.uid()) = applications.primary_staff_id
        OR
        (
          EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = (SELECT auth.uid())
            AND role = 'donum_staff'
            AND departments && applications.assigned_departments
          )
          AND EXISTS (
            SELECT 1 FROM public.prospect_staff_assignments
            WHERE prospect_id = applications.applicant_id
            AND staff_id = (SELECT auth.uid())
            AND is_active = true
          )
        )
      )
    )
  );

-- STEP 10: Grant permissions
GRANT SELECT ON public.donum_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donum_plans TO authenticated;
GRANT SELECT ON public.application_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_plans TO authenticated;
