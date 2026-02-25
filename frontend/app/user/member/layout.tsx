'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { MemberSidebar } from '@/components/member/shared/MemberSidebar';
import { ThemeToggle } from '@/components/admin/shared/ThemeToggle';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ChatPanelProvider, useChatPanel } from '@/lib/contexts/ChatPanelContext';
import { useUnreadChatCount } from '@/lib/hooks/useUnreadChatCount';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

const BASE = '/user/member';

const TITLE_MAP: Record<string, string> = {
  [`${BASE}/dashboard`]: 'Dashboard',
  [`${BASE}/loans`]: 'My Loans',
  [`${BASE}/payments`]: 'Payments',
  [`${BASE}/documents`]: 'Documents',
  [`${BASE}/profile`]: 'Profile',
};

function getPageTitle(pathname: string): string {
  return TITLE_MAP[pathname || ''] || 'Member Portal';
}

export default function UserMemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname || '');
  const { session, loading, role } = useAuth();
  const router = useRouter();
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && session && role) {
      if (role === 'donum_prospect') {
        router.push('/user/prospect/dashboard');
        return;
      }
      if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push('/auth/signin');
        return;
      }
      if (role !== 'donum_member') {
        router.push('/auth/signin');
        return;
      }
    }
    if (!loading && !session) {
      router.push('/auth/signin?redirect=' + encodeURIComponent(pathname || `${BASE}/dashboard`));
    }
  }, [session, loading, router, pathname, role]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading || !session) return null;

  return (
    <ChatPanelProvider>
      <UserMemberLayoutInner title={title} currentDateTime={currentDateTime} formatTime={formatTime}>
        {children}
      </UserMemberLayoutInner>
    </ChatPanelProvider>
  );
}

function UserMemberLayoutInner({
  children,
  title,
  currentDateTime,
  formatTime,
}: {
  children: React.ReactNode;
  title: string;
  currentDateTime: Date;
  formatTime: (d: Date) => string;
}) {
  const { chatPanelOpen, chatPanelWidth, toggleChatPanel } = useChatPanel();
  const { unreadCount } = useUnreadChatCount(chatPanelOpen);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex">
      <MemberSidebar basePath={BASE} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 50px)' }}>
        <header className="admin-header" style={{ height: '50px' }}>
          <div className="px-3 sm:px-4 py-2 flex justify-between items-center h-full gap-2 min-w-0">
            <div className="flex items-center min-w-0 flex-shrink">
              <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h1>
              <div className="hidden md:flex items-center space-x-2 ml-4 flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-[var(--text-secondary)]">System Online</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 header-quick-access flex-shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatTime(currentDateTime)}</span>
                <span className="text-xs text-[var(--text-secondary)] date-full hidden sm:inline whitespace-nowrap">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <button
                onClick={toggleChatPanel}
                className={`relative p-2 rounded-lg transition-colors ${
                  chatPanelOpen
                    ? 'bg-[var(--core-blue)]/15 text-[var(--core-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }`}
                title={chatPanelOpen ? 'Close messages' : 'Open messages'}
                aria-label={chatPanelOpen ? 'Close messages' : 'Open messages'}
              >
                <MessageSquare className="w-5 h-5" />
                {!chatPanelOpen && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main
          className={`admin-main text-sm flex-1 transition-all duration-300 ${chatPanelOpen ? 'chat-panel-open' : ''}`}
          style={{ paddingRight: chatPanelOpen ? chatPanelWidth : 0 }}
        >
          {children}
        </main>
      </div>
      <ChatPanel />
    </div>
  );
}
