-- When no staff is assigned to a prospect, support@donumplan.com in Support department
-- receives general messages (instead of everyone/super admin only)
-- "We don't need everyone to get them"

DROP POLICY IF EXISTS "Staff can manage application messages" ON application_messages;

CREATE POLICY "Staff can manage application messages"
  ON application_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND (
        -- Super admin sees all
        da.role = 'donum_super_admin'
        OR
        -- Staff/admin: assigned to prospect, OR (no one assigned AND is support)
        (
          da.role IN ('donum_staff', 'donum_admin')
          AND (
            -- Assigned to this prospect
            EXISTS (
              SELECT 1 FROM applications a
              JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
              WHERE a.id = application_messages.application_id
              AND psa.staff_id = auth.uid()
            )
            OR
            -- No one assigned: support@donumplan.com in Support department receives
            (
              da.email = 'support@donumplan.com'
              AND NOT EXISTS (
                SELECT 1 FROM applications a
                JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
                WHERE a.id = application_messages.application_id
              )
            )
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND (
        da.role = 'donum_super_admin'
        OR (
          da.role IN ('donum_staff', 'donum_admin')
          AND (
            EXISTS (
              SELECT 1 FROM applications a
              JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
              WHERE a.id = application_messages.application_id
              AND psa.staff_id = auth.uid()
            )
            OR (
              da.email = 'support@donumplan.com'
              AND NOT EXISTS (
                SELECT 1 FROM applications a
                JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
                WHERE a.id = application_messages.application_id
              )
            )
          )
        )
      )
    )
  );
