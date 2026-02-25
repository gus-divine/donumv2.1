import { createSupabaseClient } from '../supabase/client';

export interface ApplicationMessage {
  id: string;
  application_id: string;
  sender_id: string;
  content: string;
  role: 'staff' | 'applicant';
  created_at: string;
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export async function getApplicationMessages(applicationId: string): Promise<ApplicationMessage[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('application_messages')
    .select('id, application_id, sender_id, content, role, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[application-messages] Error fetching:', error);
    throw error;
  }

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

export async function sendApplicationMessage(
  applicationId: string,
  content: string,
  role: 'staff' | 'applicant'
): Promise<ApplicationMessage> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('application_messages')
    .insert({
      application_id: applicationId,
      sender_id: user.id,
      content: content.trim(),
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('[application-messages] Error sending:', error);
    throw error;
  }

  const { data: sender } = await supabase
    .from('donum_accounts')
    .select('id, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  return { ...data, sender: sender || undefined };
}
