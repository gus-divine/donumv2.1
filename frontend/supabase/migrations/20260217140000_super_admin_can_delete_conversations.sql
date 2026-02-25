-- Super admin can erase (delete) any conversation
-- Staff and applicants cannot delete messages

-- 1. application_messages: Replace FOR ALL with SELECT/INSERT/UPDATE for staff, add DELETE for super admin only
DROP POLICY IF EXISTS "Staff can manage application messages" ON application_messages;

CREATE POLICY "Staff can select application messages"
  ON application_messages FOR SELECT
  USING (
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

CREATE POLICY "Staff can insert application messages"
  ON application_messages FOR INSERT
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

CREATE POLICY "Staff can update application messages"
  ON application_messages FOR UPDATE
  USING (
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

-- Super admin only: can delete any application message
CREATE POLICY "Super admin can delete application messages"
  ON application_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role = 'donum_super_admin'
    )
  );

-- 2. direct_messages: Super admin can delete any direct message
CREATE POLICY "Super admin can delete direct messages"
  ON direct_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role = 'donum_super_admin'
    )
  );

-- 3. direct_message_threads: Super admin can delete any thread (erases whole conversation)
CREATE POLICY "Super admin can delete direct threads"
  ON direct_message_threads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role = 'donum_super_admin'
    )
  );
