-- Application messages for staff-applicant communication
CREATE TABLE IF NOT EXISTS application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'applicant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_messages_application_id 
  ON application_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_created_at 
  ON application_messages(application_id, created_at);

-- RLS
ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;

-- Staff/admin can read and insert messages for applications they have access to
CREATE POLICY "Staff can manage application messages"
  ON application_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    )
  );

-- Applicants can read and insert their own messages for their applications
CREATE POLICY "Applicants can manage own application messages"
  ON application_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_messages.application_id
      AND a.applicant_id = auth.uid()
    )
  )
  WITH CHECK (
    role = 'applicant'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_messages.application_id
      AND a.applicant_id = auth.uid()
    )
  );
