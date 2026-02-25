/**
 * Staff-to-staff direct messaging (Slack-like teammates chat)
 */

import { createSupabaseClient } from '../supabase/client';

export interface StaffTeammate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface StaffDmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

/**
 * Get all staff/teammates (excluding current user) for staff-to-staff DMs
 */
export async function getStaffTeammates(excludeUserId: string): Promise<StaffTeammate[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('role', ['donum_staff', 'donum_admin', 'donum_super_admin'])
    .neq('id', excludeUserId)
    .order('first_name')
    .order('last_name');

  if (error) {
    console.error('[Staff Messaging] Error fetching teammates:', error);
    throw new Error(`Failed to fetch teammates: ${error.message}`);
  }
  return data || [];
}

/**
 * Get or create a staff DM thread between two staff members.
 * Uses canonical order (user1_id < user2_id) to avoid duplicates.
 */
export async function getOrCreateStaffDmThread(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  const supabase = createSupabaseClient();
  const [user1, user2] = currentUserId < otherUserId
    ? [currentUserId, otherUserId]
    : [otherUserId, currentUserId];

  const { data: existing } = await supabase
    .from('staff_dm_threads')
    .select('id')
    .eq('user1_id', user1)
    .eq('user2_id', user2)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('staff_dm_threads')
    .insert({ user1_id: user1, user2_id: user2 })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('staff_dm_threads')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();
      return retry?.id ?? '';
    }
    throw error;
  }
  return created?.id ?? '';
}

/**
 * Get messages for a staff DM thread
 */
export async function getStaffDmMessages(threadId: string): Promise<StaffDmMessage[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('staff_dm_messages')
    .select('id, thread_id, sender_id, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const messages = data || [];
  if (messages.length === 0) return [];

  const senderIds = [...new Set(messages.map((m: any) => m.sender_id))];
  const { data: senders } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', senderIds);

  const senderMap = new Map((senders || []).map((s: any) => [s.id, s]));
  return messages.map((row: any) => ({
    ...row,
    sender: senderMap.get(row.sender_id),
  }));
}

/**
 * Send a staff DM message
 */
export async function sendStaffDmMessage(
  threadId: string,
  content: string
): Promise<StaffDmMessage> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('staff_dm_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  const { data: sender } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  return { ...data, sender: sender || undefined };
}

export interface StaffDmConversationSummary {
  type: 'staff_dm';
  threadId: string;
  teammateId: string;
  teammateName: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  lastSenderName?: string;
  unreadCount: number;
}

/**
 * Get recent staff DM conversations for the current user
 */
export async function getRecentStaffDmConversations(
  limit = 10
): Promise<StaffDmConversationSummary[]> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: threads } = await supabase
    .from('staff_dm_threads')
    .select('id, user1_id, user2_id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (!threads || threads.length === 0) return [];

  const threadIds = threads.map((t: any) => t.id);
  const { data: lastMsgs } = await supabase
    .from('staff_dm_messages')
    .select('thread_id, sender_id, content, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  if (!lastMsgs || lastMsgs.length === 0) return [];

  const latestByThread = new Map<string, typeof lastMsgs[0]>();
  for (const m of lastMsgs) {
    if (!latestByThread.has(m.thread_id)) {
      latestByThread.set(m.thread_id, m);
    }
  }

  const senderIds = [...new Set(lastMsgs.map((m: any) => m.sender_id))];
  const { data: senders } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', senderIds);
  const senderMap = new Map((senders || []).map((s: any) => [s.id, s]));

  const summaries: StaffDmConversationSummary[] = [];
  for (const t of threads) {
    const last = latestByThread.get(t.id);
    if (!last) continue;

    const teammateId = t.user1_id === user.id ? t.user2_id : t.user1_id;
    const teammate = senderMap.get(teammateId);
    const teammateName = teammate
      ? (teammate.first_name && teammate.last_name
          ? `${teammate.first_name} ${teammate.last_name}`
          : teammate.email)
      : 'Teammate';

    const lastSender = senderMap.get(last.sender_id);
    const lastSenderName = lastSender
      ? (lastSender.first_name && lastSender.last_name
          ? `${lastSender.first_name} ${lastSender.last_name}`
          : lastSender.email)
      : undefined;

    summaries.push({
      type: 'staff_dm',
      threadId: t.id,
      teammateId,
      teammateName,
      lastMessageAt: last.created_at,
      lastMessagePreview: last.content?.slice(0, 50) + (last.content?.length > 50 ? '...' : ''),
      lastSenderName,
      unreadCount: 0,
    });
  }

  return summaries
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, limit);
}
