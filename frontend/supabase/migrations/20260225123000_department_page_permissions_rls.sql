-- Add RLS policies for department_page_permissions.
-- Fixes admin/superadmin permission assignment failures caused by missing policies.

ALTER TABLE public.department_page_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_department_page_permissions" ON public.department_page_permissions;
CREATE POLICY "admins_manage_department_page_permissions"
  ON public.department_page_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.donum_accounts da
      WHERE da.id = auth.uid()
        AND da.role IN ('donum_admin', 'donum_super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.donum_accounts da
      WHERE da.id = auth.uid()
        AND da.role IN ('donum_admin', 'donum_super_admin')
    )
  );

DROP POLICY IF EXISTS "staff_read_own_department_permissions" ON public.department_page_permissions;
CREATE POLICY "staff_read_own_department_permissions"
  ON public.department_page_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.donum_accounts da
      WHERE da.id = auth.uid()
        AND (
          da.role IN ('donum_admin', 'donum_super_admin')
          OR (da.role = 'donum_staff' AND department_name = ANY(da.departments))
        )
    )
  );
