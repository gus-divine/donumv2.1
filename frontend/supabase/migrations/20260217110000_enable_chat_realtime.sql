-- Enable Realtime for chat tables so admins see new messages automatically
-- Run this in Supabase SQL Editor if realtime doesn't work

-- Add application_messages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE application_messages;

-- Add direct_messages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
