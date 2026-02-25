-- Run this in Supabase SQL Editor to create the chat tables
-- Copy and paste the entire file, then click Run

-- 1. Application messages (general chat)
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

ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage application messages" ON application_messages;
CREATE POLICY "Staff can manage application messages"
  ON application_messages
  FOR ALL
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
  )
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

DROP POLICY IF EXISTS "Applicants can manage own application messages" ON application_messages;
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

-- 2. Direct message threads
CREATE TABLE IF NOT EXISTS direct_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_message_threads_application 
  ON direct_message_threads(application_id);
CREATE INDEX IF NOT EXISTS idx_direct_message_threads_staff 
  ON direct_message_threads(staff_id);

ALTER TABLE direct_message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own direct threads"
  ON direct_message_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = direct_message_threads.application_id AND a.applicant_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view own direct threads"
  ON direct_message_threads FOR SELECT
  USING (
    staff_id = auth.uid()
    OR EXISTS (SELECT 1 FROM donum_accounts da WHERE da.id = auth.uid() AND da.role = 'donum_super_admin')
  );

CREATE POLICY "Applicants can create direct threads"
  ON direct_message_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = direct_message_threads.application_id AND a.applicant_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create direct threads"
  ON direct_message_threads FOR INSERT
  WITH CHECK (
    staff_id = auth.uid()
    OR EXISTS (SELECT 1 FROM donum_accounts da WHERE da.id = auth.uid() AND da.role = 'donum_super_admin')
  );

-- 3. Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES direct_message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_created 
  ON direct_messages(thread_id, created_at);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can read direct messages"
  ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_threads t
      JOIN applications a ON a.id = t.application_id
      WHERE t.id = direct_messages.thread_id
      AND (a.applicant_id = auth.uid() OR t.staff_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM donum_accounts da WHERE da.id = auth.uid() AND da.role = 'donum_super_admin')
  );

CREATE POLICY "Thread participants can send direct messages"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM direct_message_threads t
        JOIN applications a ON a.id = t.application_id
        WHERE t.id = direct_messages.thread_id
        AND (a.applicant_id = auth.uid() OR t.staff_id = auth.uid())
      )
      OR EXISTS (SELECT 1 FROM donum_accounts da WHERE da.id = auth.uid() AND da.role = 'donum_super_admin')
    )
  );

-- Enable Realtime so admins see new messages automatically
-- Run in Supabase SQL Editor: Database > Publications > supabase_realtime, add application_messages and direct_messages
-- Or run: ALTER PUBLICATION supabase_realtime ADD TABLE application_messages, direct_messages;

-- General conversation cannot be erased: run migration 20260217120000_general_conversation_undeletable.sql
