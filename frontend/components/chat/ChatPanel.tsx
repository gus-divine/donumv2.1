'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Send, User, MessageSquare, ChevronDown, ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Lock, Plus } from 'lucide-react';
import {
  getApplicationMessages,
  sendApplicationMessage,
  type ApplicationMessage,
} from '@/lib/api/application-messages';
import {
  getApplicationChatRecipients,
  getDirectMessagesForStaff,
  sendDirectMessage,
  getRecentConversations,
  getOrCreateDirectThread,
  getOptionsForNewConversation,
  type MessageRecipient,
  type DirectMessage,
  type ConversationSummary,
  type NewConversationOption,
} from '@/lib/api/application-messaging';
import {
  getOrCreateStaffDmThread,
  getStaffDmMessages,
  sendStaffDmMessage,
  getRecentStaffDmConversations,
  type StaffDmMessage,
  type StaffDmConversationSummary,
} from '@/lib/api/staff-messaging';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  useChatPanel,
  ADMIN_HEADER_HEIGHT,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
} from '@/lib/contexts/ChatPanelContext';
import { Skeleton } from '@/components/ui/skeleton';

const MIN_MAIN_CONTENT_WIDTH = 320;

function ConversationListSkeleton() {
  return (
    <div className="py-1 space-y-0.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Skeleton width={36} height={10} className="shrink-0" />
            <Skeleton width={Math.min(80 + i * 15, 120)} height={12} />
          </div>
          <Skeleton width={Math.min(100 + i * 10, 140)} height={10} className="mt-0.5" />
        </div>
      ))}
    </div>
  );
}

function NewConversationOptionsSkeleton() {
  return (
    <div className="py-1 space-y-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-3 py-2.5 flex items-center gap-2">
          <Skeleton width={16} height={16} variant="circular" className="shrink-0" />
          <Skeleton width={Math.min(90 + i * 12, 150)} height={12} />
        </div>
      ))}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <Skeleton width={32} height={32} variant="circular" className="shrink-0" />
          <div className={`flex-1 min-w-0 ${i % 2 === 0 ? 'text-right' : ''}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Skeleton width={80} height={14} />
              <Skeleton width={50} height={12} />
            </div>
            <Skeleton
              width={i % 2 === 0 ? 180 : 220}
              height={40}
              variant="rectangular"
              className="inline-block"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type DisplayMessage =
  | (ApplicationMessage & { _type?: 'general' })
  | (DirectMessage & { _type: 'direct' })
  | (StaffDmMessage & { _type: 'staff_dm' });

function formatSenderName(msg: DisplayMessage): string {
  const s = (msg as any).sender;
  if (s?.first_name || s?.last_name) {
    return `${s.first_name || ''} ${s.last_name || ''}`.trim();
  }
  return s?.email || 'Unknown';
}

function isStaffMessage(msg: DisplayMessage, currentStaffId?: string): boolean {
  if ('role' in msg && msg.role) return msg.role === 'staff';
  if (msg._type === 'direct' && currentStaffId && msg.sender_id === currentStaffId) return true;
  if (msg._type === 'staff_dm') return true; // staff DM is always staff-to-staff
  return false;
}

export function ChatPanel() {
  const {
    chatPanelOpen,
    chatPanelWidth,
    setChatPanelWidth,
    setChatPanelOpen,
    currentApplication,
    currentStaffDm,
    currentThread,
    setCurrentThread,
    setCurrentApplication,
    setCurrentStaffDm,
  } = useChatPanel();
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [recipients, setRecipients] = useState<MessageRecipient[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [staffDmConversations, setStaffDmConversations] = useState<StaffDmConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [showThreadDropdown, setShowThreadDropdown] = useState(false);
  const [conversationsExpanded, setConversationsExpanded] = useState(true);
  const [showNewConversationPicker, setShowNewConversationPicker] = useState(false);
  const [newConversationOptions, setNewConversationOptions] = useState<NewConversationOption[]>([]);
  const [newConversationOptionsLoading, setNewConversationOptionsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(chatPanelWidth);
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createSupabaseClient>['channel']> | null>(null);

  const CONVERSATIONS_LIST_WIDTH = 180;
  const CONVERSATIONS_COLLAPSED_WIDTH = 48;

  const applicationId = currentApplication?.applicationId ?? null;
  const applicantName = currentApplication?.applicantName;
  const isStaff = role && ['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role);

  useEffect(() => {
    widthRef.current = chatPanelWidth;
  }, [chatPanelWidth]);

  // Fetch conversations list when panel opens (Slack-like: clients + teammates)
  useEffect(() => {
    if (!chatPanelOpen) return;
    setConversationsLoading(true);
    Promise.all([
      getRecentConversations(20),
      isStaff ? getRecentStaffDmConversations(20) : Promise.resolve([]),
    ])
      .then(([clientConvs, staffConvs]) => {
        setConversations(clientConvs);
        setStaffDmConversations(staffConvs);
      })
      .catch(() => {
        setConversations([]);
        setStaffDmConversations([]);
      })
      .finally(() => setConversationsLoading(false));
  }, [chatPanelOpen, isStaff]);

  // Refresh conversations when sending a message (so list updates)
  const refreshConversations = useCallback(() => {
    getRecentConversations(20).then(setConversations).catch(() => {});
    if (isStaff) getRecentStaffDmConversations(20).then(setStaffDmConversations).catch(() => {});
  }, [isStaff]);

  const handleOpenNewConversationPicker = useCallback(() => {
    if (!user?.id) return;
    setShowNewConversationPicker(true);
    setNewConversationOptionsLoading(true);
    getOptionsForNewConversation(user.id, !!isStaff, 20)
      .then(setNewConversationOptions)
      .catch(() => setNewConversationOptions([]))
      .finally(() => setNewConversationOptionsLoading(false));
  }, [user?.id, isStaff]);

  const handleSelectNewConversationOption = useCallback(
    async (opt: NewConversationOption) => {
      if (opt.type === 'application') {
        setCurrentApplication({
          applicationId: opt.id,
          applicantName: opt.applicantName || opt.applicationNumber || 'Application',
        });
        if (!isStaff) setCurrentThread({ type: 'general' });
      } else if (opt.type === 'general') {
        setCurrentApplication({
          applicationId: opt.applicationId,
          applicantName: opt.applicantName || 'Application',
        });
        setCurrentThread({ type: 'general' });
      } else if (opt.type === 'staff') {
        setCurrentApplication({
          applicationId: opt.applicationId,
          applicantName: opt.applicantName || 'Application',
        });
        setCurrentThread({
          type: 'direct',
          staffId: opt.staffId,
          staffName: opt.staffName,
        });
      } else if (opt.type === 'teammate' && user?.id) {
        const threadId = await getOrCreateStaffDmThread(user.id, opt.teammateId);
        setCurrentStaffDm({
          threadId,
          teammateId: opt.teammateId,
          teammateName: opt.teammateName,
        });
      }
      setShowNewConversationPicker(false);
      refreshConversations();
    },
    [setCurrentApplication, setCurrentStaffDm, setCurrentThread, isStaff, user?.id, refreshConversations]
  );

  // Fetch recipients when application changes
  useEffect(() => {
    if (!applicationId) return;
    getApplicationChatRecipients(applicationId, !!isStaff)
      .then((recs) => {
        setRecipients(recs);
        // Staff: default to first direct thread (support is prospect-only)
        if (isStaff && recs.length > 0) {
          const firstDirect = recs.find((r) => r.type === 'direct');
          if (firstDirect) {
            setCurrentThread({
              type: 'direct',
              staffId: firstDirect.staffId,
              staffName: firstDirect.staffName,
            });
          }
        }
      })
      .catch(() => setRecipients(isStaff ? [] : [{ id: 'general', type: 'general', label: 'Support' }]));
  }, [applicationId, isStaff, setCurrentThread]);

  // Load messages based on current thread (application client chat or staff DM)
  useEffect(() => {
    if (!chatPanelOpen) return;
    setLoading(true);
    // Staff-to-staff DM
    if (currentStaffDm) {
      getStaffDmMessages(currentStaffDm.threadId)
        .then((msgs) => msgs.map((m) => ({ ...m, _type: 'staff_dm' as const })))
        .then(setMessages)
        .catch((err) => console.error('[ChatPanel] Error loading staff DM messages:', err))
        .finally(() => setLoading(false));
      return;
    }
    if (!applicationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    // Application-based chat
    if (currentThread.type === 'general' && !isStaff) {
      getApplicationMessages(applicationId)
        .then((msgs) => msgs.map((m) => ({ ...m, _type: 'general' as const })))
        .then(setMessages)
        .catch((err) => console.error('[ChatPanel] Error loading messages:', err))
        .finally(() => setLoading(false));
    } else if (currentThread.staffId) {
      getDirectMessagesForStaff(applicationId, currentThread.staffId)
        .then((msgs) => msgs.map((m) => ({ ...m, _type: 'direct' as const })))
        .then(setMessages)
        .catch((err) => console.error('[ChatPanel] Error loading direct messages:', err))
        .finally(() => setLoading(false));
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [chatPanelOpen, applicationId, currentStaffDm, currentThread.type, currentThread.staffId]);

  // Realtime: subscribe to new messages so admin sees them automatically
  useEffect(() => {
    if (!chatPanelOpen) return;
    const supabase = createSupabaseClient();
    let cancelled = false;

    const refetchMessages = () => {
      if (currentStaffDm) {
        getStaffDmMessages(currentStaffDm.threadId)
          .then((msgs) => msgs.map((m) => ({ ...m, _type: 'staff_dm' as const })))
          .then(setMessages)
          .catch(() => {});
      } else if (applicationId && currentThread.type === 'general' && !isStaff) {
        getApplicationMessages(applicationId)
          .then((msgs) => msgs.map((m) => ({ ...m, _type: 'general' as const })))
          .then(setMessages)
          .catch(() => {});
      } else if (applicationId && currentThread.staffId) {
        getDirectMessagesForStaff(applicationId, currentThread.staffId)
          .then((msgs) => msgs.map((m) => ({ ...m, _type: 'direct' as const })))
          .then(setMessages)
          .catch(() => {});
      }
    };

    const removeChannel = () => {
      const ch = realtimeChannelRef.current;
      if (ch) {
        supabase.removeChannel(ch);
        realtimeChannelRef.current = null;
      }
    };

    if (currentStaffDm) {
      removeChannel();
      realtimeChannelRef.current = supabase
        .channel(`chat-staff-dm-${currentStaffDm.threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'staff_dm_messages',
            filter: `thread_id=eq.${currentStaffDm.threadId}`,
          },
          refetchMessages
        )
        .subscribe();
    } else if (applicationId && currentThread.type === 'general' && !isStaff) {
      realtimeChannelRef.current = supabase
        .channel(`chat-app-${applicationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'application_messages',
            filter: `application_id=eq.${applicationId}`,
          },
          refetchMessages
        )
        .subscribe();
    } else if (applicationId && currentThread.staffId) {
      getOrCreateDirectThread(applicationId, currentThread.staffId).then((threadId) => {
        if (cancelled || !threadId) return;
        removeChannel();
        realtimeChannelRef.current = supabase
          .channel(`chat-dm-${threadId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'direct_messages',
              filter: `thread_id=eq.${threadId}`,
            },
            refetchMessages
          )
          .subscribe();
      });
    }

    return () => {
      cancelled = true;
      removeChannel();
    };
  }, [chatPanelOpen, applicationId, currentStaffDm, currentThread.type, currentThread.staffId, isStaff]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSidebarWidthPx = useCallback(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 50;
  }, []);

  const getMaxWidthForViewport = useCallback(() => {
    const sidebarWidth = getSidebarWidthPx();
    const available = window.innerWidth - sidebarWidth - MIN_MAIN_CONTENT_WIDTH;
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, available));
  }, [getSidebarWidthPx]);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const startX = e.clientX;
      const startWidth = widthRef.current;
      const sidebarWidth = getSidebarWidthPx();

      const onPointerMove = (ev: PointerEvent) => {
        const diff = startX - ev.clientX;
        const available = window.innerWidth - sidebarWidth - MIN_MAIN_CONTENT_WIDTH;
        const max = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, available));
        const next = Math.max(MIN_PANEL_WIDTH, Math.min(max, startWidth + diff));
        setChatPanelWidth(next);
      };

      const onPointerUp = () => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },
    [getSidebarWidthPx, setChatPanelWidth]
  );

  useEffect(() => {
    if (!chatPanelOpen) return;
    const onResize = () => {
      const max = getMaxWidthForViewport();
      if (widthRef.current > max) setChatPanelWidth(max);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [chatPanelOpen, getMaxWidthForViewport, setChatPanelWidth]);

  const handleSend = async () => {
    if (!input.trim() || sending || !user) return;
    const content = input.trim();
    // Staff DM: need currentStaffDm; Client chat: need applicationId
    if (currentStaffDm) {
      setInput('');
      setSending(true);
      try {
        const newMsg = await sendStaffDmMessage(currentStaffDm.threadId, content);
        setMessages((prev) => [...prev, { ...newMsg, _type: 'staff_dm' }]);
        refreshConversations();
      } catch (err) {
        console.error('[ChatPanel] Error sending staff DM:', err);
        setInput(content);
      } finally {
        setSending(false);
      }
      return;
    }
    if (!applicationId) return;
    setInput('');
    setSending(true);
    try {
      if (currentThread.type === 'general') {
        if (isStaff) return; // support thread is prospect-only
        const newMsg = await sendApplicationMessage(
          applicationId,
          content,
          isStaff ? 'staff' : 'applicant'
        );
        setMessages((prev) => [...prev, { ...newMsg, _type: 'general' }]);
      } else if (currentThread.staffId) {
        const newMsg = await sendDirectMessage(applicationId, currentThread.staffId, content);
        setMessages((prev) => [...prev, { ...newMsg, _type: 'direct' }]);
      }
      refreshConversations();
    } catch (err) {
      console.error('[ChatPanel] Error sending:', err);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const generalRecipient = recipients.find((r) => r.type === 'general');
  const currentRecipientLabel =
    currentThread.type === 'general'
      ? generalRecipient?.label || 'Support'
      : currentThread.staffName || 'Direct message';

  const selectThread = (r: MessageRecipient) => {
    if (r.type === 'general') {
      setCurrentThread({ type: 'general' });
    } else {
      setCurrentThread({
        type: 'direct',
        staffId: r.staffId,
        staffName: r.staffName,
      });
    }
    setShowThreadDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => setChatPanelOpen(false);

  const selectConversation = (c: ConversationSummary) => {
    setCurrentApplication({
      applicationId: c.applicationId,
      applicantName: c.applicantName,
    });
  };

  const selectStaffDmConversation = (c: StaffDmConversationSummary) => {
    setCurrentStaffDm({
      threadId: c.threadId,
      teammateId: c.teammateId,
      teammateName: c.teammateName,
    });
  };

  const goBackToList = () => {
    setCurrentApplication(null);
    setCurrentStaffDm(null);
    setConversationsExpanded(true);
  };

  if (!chatPanelOpen) return null;

  const maxWidth = getMaxWidthForViewport();

  return (
    <>
      {/* Backdrop for mobile - matches site overlay style */}
      <div
        className="fixed inset-0 z-30 sm:hidden"
        style={{
          background: 'color-mix(in srgb, var(--foreground) 15%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`chat-panel fixed flex flex-row z-40 ${
          isResizing ? 'select-none transition-none' : 'transition-all duration-300'
        }`}
        style={{
          top: `${ADMIN_HEADER_HEIGHT}px`,
          right: 0,
          height: `calc(100vh - ${ADMIN_HEADER_HEIGHT}px)`,
          width: `${chatPanelWidth}px`,
          minWidth: `${MIN_PANEL_WIDTH}px`,
          maxWidth: `${maxWidth}px`,
          background: 'var(--background)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: '8px 0 0 8px',
        }}
      >
        {/* Resize handle - left edge */}
        <div
          onPointerDown={handleResizeStart}
          className={`absolute left-0 top-0 w-4 h-full cursor-ew-resize z-50 select-none flex items-center justify-center transition-colors ${
            isResizing ? 'bg-[var(--core-gold)]/20' : 'hover:bg-[var(--core-gold)]/10'
          }`}
          title="Drag to resize"
          aria-label="Resize panel"
        >
          <div className="w-0.5 h-12 rounded-full bg-[var(--core-gold)] opacity-50" aria-hidden />
        </div>

        {/* Left: Conversations list - collapsible */}
        <div
          className="flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--background)] overflow-hidden transition-all duration-300"
          style={{ width: conversationsExpanded ? CONVERSATIONS_LIST_WIDTH : CONVERSATIONS_COLLAPSED_WIDTH }}
        >
          <div className="flex-shrink-0 flex items-center border-b border-[var(--border)] min-h-[44px]">
            {conversationsExpanded ? (
              <>
                <h3 className="flex-1 px-3 py-2.5 font-semibold text-[0.75rem] text-[var(--text-primary)]">
                  Conversations
                </h3>
                <button
                  onClick={handleOpenNewConversationPicker}
                  className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title="Start new conversation"
                  aria-label="Start new conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConversationsExpanded(false)}
                  className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title="Collapse conversations"
                  aria-label="Collapse conversations"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConversationsExpanded(true)}
                className="w-full flex items-center justify-center py-3 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Expand conversations"
                aria-label="Expand conversations"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          {conversationsExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto relative">
            {showNewConversationPicker ? (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-[0.75rem] font-medium text-[var(--text-primary)]">Start new conversation</span>
                  <button
                    onClick={() => setShowNewConversationPicker(false)}
                    className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto py-1">
                  {newConversationOptionsLoading ? (
                    <NewConversationOptionsSkeleton />
                  ) : newConversationOptions.length === 0 ? (
                    <div className="p-4 text-[0.75rem] text-[var(--text-muted)]">
                      {isStaff ? 'No applications or teammates available.' : 'No team members assigned to you yet.'}
                    </div>
                  ) : (
                    <>
                      {newConversationOptions.map((opt) =>
                      opt.type === 'teammate' ? (
                        <button
                          key={opt.teammateId}
                          onClick={() => handleSelectNewConversationOption(opt)}
                          className="w-full px-3 py-2.5 text-left text-[0.75rem] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate flex items-center gap-2"
                        >
                          <User className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                          {opt.teammateName}
                        </button>
                      ) : opt.type === 'application' ? (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectNewConversationOption(opt)}
                          className="w-full px-3 py-2.5 text-left text-[0.75rem] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                        >
                          {opt.applicationNumber
                            ? `${opt.applicantName || 'Application'} · ${opt.applicationNumber}`
                            : opt.applicantName || opt.applicationNumber || opt.id}
                        </button>
                      ) : opt.type === 'general' ? (
                        <button
                          key={opt.applicationId}
                          onClick={() => handleSelectNewConversationOption(opt)}
                          className="w-full px-3 py-2.5 text-left text-[0.75rem] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                        >
                          Support
                        </button>
                      ) : (
                        <button
                          key={opt.staffId}
                          onClick={() => handleSelectNewConversationOption(opt)}
                          className="w-full px-3 py-2.5 text-left text-[0.75rem] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                        >
                          {opt.staffName}
                        </button>
                      )
                    )}
                    </>
                  )}
                </div>
              </div>
            ) : conversationsLoading ? (
              <ConversationListSkeleton />
            ) : conversations.length === 0 && staffDmConversations.length === 0 ? (
              <div className="p-4 text-[0.75rem] text-[var(--text-muted)]">
                {isStaff
                  ? 'No conversations yet. Start a chat with a client or teammate.'
                  : 'Your conversations will appear here.'}
              </div>
            ) : (
              <div className="py-1">
                {conversations.length > 0 && (
                  <>
                    {isStaff && (
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Client conversations
                      </div>
                    )}
                    {conversations.map((c) => {
                      const isSelected = currentApplication?.applicationId === c.applicationId;
                      return (
                        <button
                          key={c.applicationId}
                          onClick={() => selectConversation(c)}
                          className={`relative w-full px-3 py-2.5 text-left transition-all duration-200 font-medium text-[0.75rem] tracking-[0.5px] ${
                            isSelected
                              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--core-gold)] rounded-r" />
                          )}
                          <div className="font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                            <span className="text-[10px] font-normal text-[var(--text-muted)] uppercase shrink-0">{isStaff ? 'Direct' : 'Support'}</span>
                            <span className="truncate">· {c.applicantName || c.applicationNumber || 'Application'}</span>
                          </div>
                          {c.lastMessagePreview && (
                            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 leading-snug">
                              {c.lastSenderName && `${c.lastSenderName}: `}
                              {c.lastMessagePreview}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
                {isStaff && staffDmConversations.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 mt-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-t border-[var(--border)] pt-3">
                      Direct messages
                    </div>
                    {staffDmConversations.map((c) => {
                      const isSelected = currentStaffDm?.threadId === c.threadId;
                      return (
                        <button
                          key={c.threadId}
                          onClick={() => selectStaffDmConversation(c)}
                          className={`relative w-full px-3 py-2.5 text-left transition-all duration-200 font-medium text-[0.75rem] tracking-[0.5px] ${
                            isSelected
                              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--core-gold)] rounded-r" />
                          )}
                          <div className="font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                            <User className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                            <span className="truncate">{c.teammateName}</span>
                          </div>
                          {c.lastMessagePreview && (
                            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 leading-snug">
                              {c.lastSenderName && `${c.lastSenderName}: `}
                              {c.lastMessagePreview}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Right: Chat area */}
        <div className="flex-1 min-w-0 flex flex-col bg-[var(--background)]">
        {/* Header - matches admin-header styling */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
          style={{
            background: 'color-mix(in srgb, var(--surface) 80%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {(currentApplication || currentStaffDm) && (
              <button
                onClick={goBackToList}
                className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-[0.75rem] text-[var(--text-primary)]">
                {currentApplication || currentStaffDm ? 'Messages' : 'Select a conversation'}
              </h3>
              {(applicantName || currentStaffDm?.teammateName) && (
                <p className="text-[0.75rem] text-[var(--text-secondary)] truncate mt-0.5">
                  {currentStaffDm?.teammateName ?? applicantName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thread selector - below header */}
        {currentApplication && recipients.length > 1 && (
          <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/50">
            <div className="relative">
              <button
                onClick={() => setShowThreadDropdown((v) => !v)}
                className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--core-blue)] hover:text-[var(--core-blue-light)] transition-colors"
              >
                {currentRecipientLabel}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showThreadDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowThreadDropdown(false)}
                    aria-hidden
                  />
                  <div
                    className="absolute left-0 top-full mt-1 z-50 min-w-[180px] py-1 rounded-lg"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    {recipients.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectThread(r)}
                        className={`w-full px-3 py-2 text-left text-[0.75rem] font-medium tracking-[0.5px] transition-colors flex items-center gap-2 ${
                          (r.type === 'general' && currentThread.type === 'general') ||
                          (r.type === 'direct' && r.staffId === currentThread.staffId)
                            ? 'bg-[var(--core-gold)]/15 text-[var(--core-gold)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {r.type === 'general' ? (
                          <>
                            <span title="Support conversation cannot be erased" className="flex-shrink-0">
                              <Lock className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
                            </span>
                            {r.label || 'Support'}
                          </>
                        ) : (
                          r.staffName
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages or empty state */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {!currentApplication && !currentStaffDm ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageSquare className="w-14 h-14 text-[var(--text-muted)] mb-4" />
              <p className="text-[0.875rem] text-[var(--text-secondary)] font-medium">
                Select a conversation from the list to view and send messages.
              </p>
            </div>
          ) : loading ? (
            <MessagesSkeleton />
          ) : currentApplication && isStaff && recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-14 h-14 text-[var(--text-muted)] mb-4" />
              <p className="text-[0.875rem] text-[var(--text-secondary)] font-medium">No staff assigned</p>
              <p className="text-[0.75rem] text-[var(--text-muted)] mt-2">
                Assign staff to this application to start a direct conversation.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-14 h-14 text-[var(--text-muted)] mb-4" />
              <p className="text-[0.875rem] text-[var(--text-secondary)] font-medium">No messages yet</p>
              <p className="text-[0.75rem] text-[var(--text-muted)] mt-2">
                {isStaff
                  ? 'Send a message to the applicant to get started.'
                  : 'Send a message to your team to get started.'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const staffMsg = isStaffMessage(msg, currentThread.staffId);
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        staffMsg
                          ? 'bg-[var(--core-blue)]/15 text-[var(--core-blue)]'
                          : 'bg-[var(--core-gold)]/15 text-[var(--core-gold)]'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {formatSenderName(msg)}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2.5 text-[0.875rem] ${
                          isOwn
                            ? 'bg-[var(--core-blue)]/15 text-[var(--text-primary)]'
                            : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]'
                        }`}
                        style={{ borderRadius: '8px' }}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input - when conversation selected (staff DM or client chat with recipients) */}
        {((currentStaffDm) || (currentApplication && !(isStaff && recipients.length === 0))) && (
        <div
          className="flex-shrink-0 border-t border-[var(--border)] p-3"
          style={{ background: 'var(--background)' }}
        >
          <div
            className="flex gap-2 items-end rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 focus-within:border-[var(--border-focus)] focus-within:ring-2 focus-within:ring-[var(--core-blue)]/20 transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending}
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] disabled:opacity-50 min-h-[36px] max-h-[100px] text-[0.875rem] py-2 px-3"
              style={{ fontFamily: 'inherit' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 p-2.5 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{
                background: 'var(--core-blue)',
              }}
              title="Send message"
              aria-label="Send message"
            >
              {sending ? (
                <span className="text-xs">...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[0.7rem] text-[var(--text-muted)] mt-1.5 px-0.5">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
        )}
        </div>
      </div>
    </>
  );
}
