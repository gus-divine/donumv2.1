-- Enhanced application messaging: general chat + direct (private) messages
-- General chat: application_messages - when no staff assigned, super admin receives
-- Direct chat: 1:1 private between applicant and specific staff

-- 1. Update application_messages RLS: staff sees only assigned applications; super admin sees all
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
        -- Staff/admin see only applications where they're assigned to the prospect
        (
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

-- 2. Direct message threads: one per (application, staff) for 1:1 private chat
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

-- RLS for direct_message_threads
ALTER TABLE direct_message_threads ENABLE ROW LEVEL SECURITY;

-- Applicant can see threads for their applications
CREATE POLICY "Applicants can view own direct threads"
  ON direct_message_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = direct_message_threads.application_id
      AND a.applicant_id = auth.uid()
    )
  );

-- Staff can see threads where they're the staff
CREATE POLICY "Staff can view own direct threads"
  ON direct_message_threads
  FOR SELECT
  USING (
    staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
    )
  );

-- Applicant can create thread with assigned staff (or super admin when no one assigned)
CREATE POLICY "Applicants can create direct threads"
  ON direct_message_threads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = direct_message_threads.application_id
      AND a.applicant_id = auth.uid()
    )
  );

-- Staff/super admin can create threads (when initiating with applicant)
CREATE POLICY "Staff can create direct threads"
  ON direct_message_threads
  FOR INSERT
  WITH CHECK (
    staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
    )
  );

-- RLS for direct_messages
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages in their thread
CREATE POLICY "Thread participants can read direct messages"
  ON direct_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_threads t
      JOIN applications a ON a.id = t.application_id
      WHERE t.id = direct_messages.thread_id
      AND (a.applicant_id = auth.uid() OR t.staff_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
    )
  );

-- Participants can send messages
CREATE POLICY "Thread participants can send direct messages"
  ON direct_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM direct_message_threads t
        JOIN applications a ON a.id = t.application_id
        WHERE t.id = direct_messages.thread_id
        AND (a.applicant_id = auth.uid() OR t.staff_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM donum_accounts da
        WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
      )
    )
  );
