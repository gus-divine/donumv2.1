-- General conversation: messages cannot be erased (no DELETE allowed)
-- Replace FOR ALL with SELECT, INSERT, UPDATE only - no DELETE policy

-- Staff policies (no DELETE)
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
          AND EXISTS (
            SELECT 1 FROM applications a
            JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
            WHERE a.id = application_messages.application_id
            AND psa.staff_id = auth.uid()
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
          AND EXISTS (
            SELECT 1 FROM applications a
            JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
            WHERE a.id = application_messages.application_id
            AND psa.staff_id = auth.uid()
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
          AND EXISTS (
            SELECT 1 FROM applications a
            JOIN prospect_staff_assignments psa ON psa.prospect_id = a.applicant_id AND psa.is_active = true
            WHERE a.id = application_messages.application_id
            AND psa.staff_id = auth.uid()
          )
        )
      )
    )
  );

-- Applicant policies (no DELETE)
DROP POLICY IF EXISTS "Applicants can manage own application messages" ON application_messages;
CREATE POLICY "Applicants can select own application messages"
  ON application_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_messages.application_id
      AND a.applicant_id = auth.uid()
    )
  );
CREATE POLICY "Applicants can insert own application messages"
  ON application_messages FOR INSERT
  WITH CHECK (
    role = 'applicant'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_messages.application_id
      AND a.applicant_id = auth.uid()
    )
  );
CREATE POLICY "Applicants can update own application messages"
  ON application_messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_messages.application_id
      AND a.applicant_id = auth.uid()
    )
  );
