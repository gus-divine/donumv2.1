-- Staff-to-staff direct messages (Slack-like teammates chat)
-- Threads are between two staff members; application_id is null

CREATE TABLE IF NOT EXISTS staff_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_dm_threads_user1 ON staff_dm_threads(user1_id);
CREATE INDEX IF NOT EXISTS idx_staff_dm_threads_user2 ON staff_dm_threads(user2_id);

CREATE TABLE IF NOT EXISTS staff_dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES staff_dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES donum_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_dm_messages_thread ON staff_dm_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_staff_dm_messages_created ON staff_dm_messages(thread_id, created_at);

-- RLS
ALTER TABLE staff_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_dm_messages ENABLE ROW LEVEL SECURITY;

-- Staff can see threads where they're a participant
CREATE POLICY "Staff can view own dm threads"
  ON staff_dm_threads FOR SELECT
  USING (
    (user1_id = auth.uid() OR user2_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    )
  );

-- Staff can create threads (with self as participant)
CREATE POLICY "Staff can create dm threads"
  ON staff_dm_threads FOR INSERT
  WITH CHECK (
    (user1_id = auth.uid() OR user2_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid()
      AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    )
  );

-- Participants can read messages in their thread
CREATE POLICY "Thread participants can read staff dm messages"
  ON staff_dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_dm_threads t
      WHERE t.id = staff_dm_messages.thread_id
      AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    )
  );

-- Participants can send messages
CREATE POLICY "Thread participants can send staff dm messages"
  ON staff_dm_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM staff_dm_threads t
      WHERE t.id = staff_dm_messages.thread_id
      AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    )
  );

-- Super admin can delete any staff DM (optional - for moderation)
CREATE POLICY "Super admin can delete staff dm messages"
  ON staff_dm_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
    )
  );

CREATE POLICY "Super admin can delete staff dm threads"
  ON staff_dm_threads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donum_accounts da
      WHERE da.id = auth.uid() AND da.role = 'donum_super_admin'
    )
  );

-- Realtime: add staff_dm_messages to realtime publication for live updates
-- Run in Supabase SQL Editor if not already: ALTER PUBLICATION supabase_realtime ADD TABLE staff_dm_messages;
