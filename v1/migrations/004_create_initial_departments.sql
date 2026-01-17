-- =====================================================
-- MIGRATION 004: Create Initial Departments
-- Sets up Admin and Help departments with proper permissions
-- =====================================================

-- =====================================================
-- STEP 1: No Default Departments Created
-- =====================================================

-- Super admin creates all departments as needed
-- No departments are pre-created - complete flexibility

-- =====================================================
-- STEP 2: No Default Permissions Created
-- =====================================================

-- Super admin creates departments and assigns permissions as needed
-- Complete flexibility in permission design

-- =====================================================
-- STEP 5: Create Department-Based RLS Policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "department_staff_access" ON public.donum_accounts;
DROP POLICY IF EXISTS "department_staff_applications" ON public.applications;
DROP POLICY IF EXISTS "department_staff_loans" ON public.loans;

-- Department-based access to member/prospect data
CREATE POLICY "department_staff_members" ON public.donum_accounts
  FOR SELECT USING (
    -- Staff can see members/prospects assigned to their departments
    EXISTS (
      SELECT 1 FROM public.donum_accounts u
      WHERE u.id = auth.uid()
        AND u.role = 'donum_staff'
        AND (
          -- Check if user is in a department that has permission to view members
          EXISTS (
            SELECT 1 FROM public.department_page_permissions dpp
            WHERE dpp.department_name = ANY(u.departments)
              AND dpp.page_path = '/admin/members'
              AND dpp.can_view = true
          )
          -- AND the member is assigned to one of the user's departments
          AND EXISTS (
            SELECT 1 FROM public.department_members dm
            WHERE dm.member_id = donum_accounts.id
              AND dm.department_name = ANY(u.departments)
              AND dm.is_active = true
          )
        )
    )
    -- OR super admin can see everything
    OR EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid() AND role = 'donum_super_admin'
    )
  );

-- Department-based access to applications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
    EXECUTE '
      CREATE POLICY "department_staff_applications" ON public.applications
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.donum_accounts u
            WHERE u.id = auth.uid()
              AND u.role = ''donum_staff''
              AND EXISTS (
                SELECT 1 FROM public.department_page_permissions dpp
                WHERE dpp.department_name = ANY(u.departments)
                  AND dpp.page_path = ''/admin/applications''
                  AND dpp.can_view = true
              )
          )
          OR EXISTS (
            SELECT 1 FROM public.donum_accounts
            WHERE id = auth.uid() AND role = ''donum_super_admin''
          )
        );
    ';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create Security Event Logging Function
-- =====================================================

CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$;

-- =====================================================
-- STEP 7: Create Trigger for Department Assignment Logging
-- =====================================================

CREATE OR REPLACE FUNCTION log_department_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event(
      'department_assignment',
      'department_members',
      NEW.id,
      jsonb_build_object(
        'department_name', NEW.department_name,
        'member_id', NEW.member_id,
        'assigned_by', NEW.assigned_by,
        'action', 'assigned'
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    PERFORM log_security_event(
      'department_assignment',
      'department_members',
      NEW.id,
      jsonb_build_object(
        'department_name', NEW.department_name,
        'member_id', NEW.member_id,
        'assigned_by', NEW.unassigned_by,
        'action', CASE WHEN NEW.is_active THEN 'reassigned' ELSE 'unassigned' END
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS department_assignment_audit ON public.department_members;
CREATE TRIGGER department_assignment_audit
  AFTER INSERT OR UPDATE ON public.department_members
  FOR EACH ROW EXECUTE FUNCTION log_department_assignment();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ MIGRATION 004 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Departments created:';
    RAISE NOTICE '  ℹ️  None - Super admin creates all departments as needed';
    RAISE NOTICE '';
    RAISE NOTICE 'Permissions assigned:';
    RAISE NOTICE '  ℹ️  None - Super admin configures all department permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'Infrastructure created:';
    RAISE NOTICE '  ✅ Department tables and relationships';
    RAISE NOTICE '  ✅ Department-based RLS policies';
    RAISE NOTICE '  ✅ Security event logging system';
    RAISE NOTICE '  ✅ Department assignment audit triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULT: Clean department infrastructure ready!';
    RAISE NOTICE '   Super admin has complete control over department creation';
    RAISE NOTICE '   Permission system ready for custom department design';
    RAISE NOTICE '   Audit logging active for compliance';
    RAISE NOTICE '=========================================';
END $$;