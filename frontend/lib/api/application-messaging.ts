/**
 * Application messaging API - general chat + direct (private) messages
 * General: application_messages - visible to all assigned staff (or super admin if none)
 * Direct: 1:1 private thread between applicant and specific staff
 */

import { createSupabaseClient } from '../supabase/client';
import { getProspectStaffAssignments } from './prospect-staff-assignments';
import { getApplication, getApplications, type Application } from './applications';
import { getStaffTeammates } from './staff-messaging';

export interface MessageRecipient {
  id: string;
  type: 'general' | 'direct';
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
  /** When no staff assigned, general goes to super admin */
  label?: string;
}

export interface DirectMessage {
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
 * Get available chat recipients for an application:
 * - Prospects: Support (to all staff or support@donumplan.com) + Direct (1:1 per assigned staff)
 * - Staff: Direct only (1:1 per assigned staff) — support thread is prospect-only
 */
export async function getApplicationChatRecipients(
  applicationId: string,
  isStaff: boolean
): Promise<MessageRecipient[]> {
  const application = await getApplication(applicationId);
  if (!application?.applicant_id) {
    return isStaff ? [] : [{ id: 'general', type: 'general', label: 'Support' }];
  }

  const assignments = await getProspectStaffAssignments(application.applicant_id);
  const staffIds = [...new Set(assignments.map((a) => a.staff_id))];

  const recipients: MessageRecipient[] = [];

  // Support thread: only for prospects (they message staff collectively)
  // When no staff assigned: support@donumplan.com receives (per RLS)
  if (!isStaff) {
    recipients.push(
      staffIds.length === 0
        ? { id: 'general', type: 'general', label: 'Support' }
        : { id: 'general', type: 'general', label: 'Support (all assigned)' }
    );
  }

  if (staffIds.length === 0) {
    return recipients;
  }

  const supabase = createSupabaseClient();
  const { data: staff } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', staffIds);

  for (const s of staff || []) {
    const name =
      s.first_name && s.last_name
        ? `${s.first_name} ${s.last_name}`
        : s.email;
    recipients.push({
      id: `direct-${s.id}`,
      type: 'direct',
      staffId: s.id,
      staffName: name,
      staffEmail: s.email,
    });
  }

  return recipients;
}

/**
 * Get or create a direct message thread for application + staff (exported for loading messages)
 */
export async function getOrCreateDirectThread(
  applicationId: string,
  staffId: string
): Promise<string> {
  const supabase = createSupabaseClient();
  const { data: existing } = await supabase
    .from('direct_message_threads')
    .select('id')
    .eq('application_id', applicationId)
    .eq('staff_id', staffId)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('direct_message_threads')
    .insert({ application_id: applicationId, staff_id: staffId })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('direct_message_threads')
        .select('id')
        .eq('application_id', applicationId)
        .eq('staff_id', staffId)
        .single();
      return retry?.id ?? '';
    }
    throw error;
  }
  return created?.id ?? '';
}

/**
 * Get direct messages for application + staff (creates thread if needed for consistency)
 */
export async function getDirectMessagesForStaff(
  applicationId: string,
  staffId: string
): Promise<DirectMessage[]> {
  const threadId = await getOrCreateDirectThread(applicationId, staffId);
  return getDirectMessages(threadId);
}

/**
 * Get direct messages for a thread
 */
export async function getDirectMessages(threadId: string): Promise<DirectMessage[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('direct_messages')
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
 * Conversation summary for list view
 */
export interface ConversationSummary {
  applicationId: string;
  applicantName?: string;
  applicationNumber?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  lastSenderName?: string;
  unreadCount: number;
}

/**
 * Get unread message count for the current user (messages from others since lastViewedAt)
 */
export async function getUnreadMessageCount(lastViewedAt: string | null): Promise<number> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  if (!lastViewedAt) return 0;

  const since = new Date(lastViewedAt).toISOString();
  let count = 0;

  const { data: appMsgs } = await supabase
    .from('application_messages')
    .select('id, sender_id, created_at')
    .gt('created_at', since);

  for (const m of appMsgs || []) {
    if (m.sender_id !== user.id) count++;
  }

  const { data: directMsgs } = await supabase
    .from('direct_messages')
    .select('id, sender_id, created_at')
    .gt('created_at', since);

  for (const m of directMsgs || []) {
    if (m.sender_id !== user.id) count++;
  }

  const { data: staffDmMsgs } = await supabase
    .from('staff_dm_messages')
    .select('id, sender_id, created_at')
    .gt('created_at', since);

  for (const m of staffDmMsgs || []) {
    if (m.sender_id !== user.id) count++;
  }

  return count;
}

export type NewConversationOption =
  | { type: 'application'; id: string; applicantName?: string; applicationNumber?: string }
  | { type: 'general'; applicationId: string; applicantName?: string }
  | { type: 'staff'; staffId: string; staffName: string; applicationId: string; applicantName?: string }
  | { type: 'teammate'; teammateId: string; teammateName: string };

/**
 * Get options for starting a new conversation:
 * Staff: applications (client conversations) + teammates (staff-to-staff DMs)
 * Prospect: team members/partners assigned to them (prospect_staff_assignments)
 */
export async function getOptionsForNewConversation(
  userId: string,
  isStaff: boolean,
  limit = 20
): Promise<NewConversationOption[]> {
  if (isStaff) {
    const [applications, teammates] = await Promise.all([
      getApplications(undefined),
      getStaffTeammates(userId),
    ]);
    const opts: NewConversationOption[] = [];
    // Client conversations (applications)
    for (const app of applications.slice(0, Math.ceil(limit / 2))) {
      opts.push({
        type: 'application',
        id: app.id,
        applicantName: app.applicant
          ? `${app.applicant.first_name || ''} ${app.applicant.last_name || ''}`.trim() || app.applicant.email
          : undefined,
        applicationNumber: app.application_number,
      });
    }
    // Teammates (staff-to-staff DMs)
    for (const t of teammates.slice(0, Math.ceil(limit / 2))) {
      opts.push({
        type: 'teammate',
        teammateId: t.id,
        teammateName: t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : t.email,
      });
    }
    return opts;
  }

  // Prospect: show assigned staff/partners, or support@donumplan.com when no one assigned
  const applications = await getApplications({ applicant_id: userId });
  const primaryApp = applications[0];
  if (!primaryApp) return [];

  const applicantName = primaryApp.applicant
    ? `${primaryApp.applicant.first_name || ''} ${primaryApp.applicant.last_name || ''}`.trim() || primaryApp.applicant.email
    : undefined;

  const assignments = await getProspectStaffAssignments(userId);
  const staffIds = [...new Set(assignments.map((a) => a.staff_id))];

  const supabase = createSupabaseClient();

  // When no staff assigned: general goes to support@donumplan.com (per RLS)
  if (staffIds.length === 0) {
    return [{
      type: 'general' as const,
      applicationId: primaryApp.id,
      applicantName,
    }];
  }

  const { data: staff } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', staffIds);

  return (staff || []).slice(0, limit).map((s) => ({
    type: 'staff' as const,
    staffId: s.id,
    staffName: s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.email,
    applicationId: primaryApp.id,
    applicantName,
  }));
}

/**
 * Get recent conversations (applications with messages) for the current user
 */
export async function getRecentConversations(limit = 10): Promise<ConversationSummary[]> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const summaries: ConversationSummary[] = [];
  const seenApps = new Set<string>();

  const { data: appMsgs } = await supabase
    .from('application_messages')
    .select('id, application_id, sender_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const appIds = [...new Set((appMsgs || []).map((m: any) => m.application_id))];
  if (appIds.length === 0) return [];

  const { data: applications } = await supabase
    .from('applications')
    .select('id, application_number')
    .in('id', appIds);

  const { data: applicants } = await supabase
    .from('applications')
    .select('id, applicant_id')
    .in('id', appIds);

  const applicantIds = [...new Set((applicants || []).map((a: any) => a.applicant_id).filter(Boolean))];
  const { data: accounts } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', applicantIds);

  const accountMap = new Map((accounts || []).map((a: any) => [a.id, a]));
  const appMap = new Map((applications || []).map((a: any) => [a.id, a]));
  const applicantMap = new Map((applicants || []).map((a: any) => [a.id, a.applicant_id]));

  const { data: senders } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .in('id', [...new Set((appMsgs || []).map((m: any) => m.sender_id))]);

  const senderMap = new Map((senders || []).map((s: any) => [s.id, s]));

  // Supabase returns `T[] | null`; keep our grouping structure always-array.
  const byApp = new Map<string, any[]>();
  for (const m of appMsgs || []) {
    if (!byApp.has(m.application_id)) byApp.set(m.application_id, []);
    byApp.get(m.application_id)!.push(m);
  }

  for (const [appId, msgs] of byApp) {
    if (summaries.length >= limit) break;
    const sorted = msgs.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const last = sorted[0];
    const applicantId = applicantMap.get(appId);
    const applicant = applicantId ? accountMap.get(applicantId) : null;
    const applicantName = applicant
      ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email
      : undefined;
    const lastSender = senderMap.get(last.sender_id);
    const lastSenderName = lastSender
      ? `${lastSender.first_name || ''} ${lastSender.last_name || ''}`.trim() || lastSender.email
      : undefined;
    const app = appMap.get(appId);
    summaries.push({
      applicationId: appId,
      applicantName,
      applicationNumber: app?.application_number,
      lastMessageAt: last.created_at,
      lastMessagePreview: last.content?.slice(0, 50) + (last.content?.length > 50 ? '...' : ''),
      lastSenderName,
      unreadCount: 0,
    });
  }

  return summaries.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).slice(0, limit);
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(
  applicationId: string,
  staffId: string,
  content: string
): Promise<DirectMessage> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const threadId = await getOrCreateDirectThread(applicationId, staffId);
  const { data, error } = await supabase
    .from('direct_messages')
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

/**
 * Super-admin only: erase general conversation for an application.
 */
export async function deleteApplicationConversation(applicationId: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('application_messages')
    .delete()
    .eq('application_id', applicationId);
  if (error) throw error;
}

/**
 * Super-admin only: erase direct conversation for an application+staff pair.
 */
export async function deleteDirectConversation(
  applicationId: string,
  staffId: string
): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: thread } = await supabase
    .from('direct_message_threads')
    .select('id')
    .eq('application_id', applicationId)
    .eq('staff_id', staffId)
    .single();

  if (!thread?.id) return;

  const { error } = await supabase
    .from('direct_message_threads')
    .delete()
    .eq('id', thread.id);
  if (error) throw error;
}
