'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ProspectSidebar } from '@/components/prospect/shared/ProspectSidebar';
import { ThemeToggle } from '@/components/admin/shared/ThemeToggle';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ChatPanelProvider, useChatPanel } from '@/lib/contexts/ChatPanelContext';
import { getApplications } from '@/lib/api/applications';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

interface ProspectLayoutProps {
  children: React.ReactNode;
}

function getPageTitle(pathname: string): string {
  const titleMap: Record<string, string> = {
    '/prospect/dashboard': 'Dashboard',
    '/prospect/prequalify': 'Prequalification',
    '/prospect/application': 'Application',
    '/prospect/documents': 'Documents',
    '/prospect/status': 'Application Status',
    '/prospect/profile': 'Profile',
  };

  return titleMap[pathname] || 'Prospect Portal';
}

export default function ProspectLayout({ children }: ProspectLayoutProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname || '');
  const { user, session, loading, role } = useAuth();
  const router = useRouter();
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    // Redirect if not a prospect/lead role
    if (!loading && session && role) {
      if (role === 'donum_member') {
        router.push('/members/dashboard');
        return;
      }
      if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push('/admin/dashboard');
        return;
      }
      // If not prospect/lead, redirect to signin
      if (role !== 'donum_prospect') {
        router.push('/auth/signin');
        return;
      }
    }

    // Redirect to signin if no session
    if (!loading && !session) {
      router.push('/auth/signin?redirect=' + encodeURIComponent(pathname || '/prospect/dashboard'));
      return;
    }
  }, [session, loading, router, pathname, role]);

  useEffect(() => {
    // Update date and time every minute
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${formattedMinutes} ${ampm}`;
  };

  // Show nothing while loading or if no session (will redirect in useEffect)
  if (loading || !session) {
    return null;
  }

  return (
    <ChatPanelProvider>
      <ProspectLayoutInner title={title} currentDateTime={currentDateTime} formatTime={formatTime}>
        {children}
      </ProspectLayoutInner>
    </ChatPanelProvider>
  );
}

function ProspectLayoutInner({
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
  const { user } = useAuth();
  const { chatPanelOpen, chatPanelWidth, toggleChatPanel, setApplicationContextFromPage } = useChatPanel();

  // Register application context on every prospect page so chat works from any step
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getApplications({ applicant_id: user.id })
      .then((apps) => {
        if (cancelled) return;
        const latest = apps
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];
        if (latest) {
          const applicantName =
            latest.applicant?.first_name && latest.applicant?.last_name
              ? `${latest.applicant.first_name} ${latest.applicant.last_name}`
              : latest.applicant?.email;
          setApplicationContextFromPage({ applicationId: latest.id, applicantName });
        } else {
          setApplicationContextFromPage(null);
        }
      })
      .catch(() => setApplicationContextFromPage(null));
    return () => {
      cancelled = true;
      setApplicationContextFromPage(null);
    };
  }, [user?.id, setApplicationContextFromPage]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex">
      <ProspectSidebar basePath="/prospect" />
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
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {formatTime(currentDateTime)}
                </span>
                <span className="text-xs text-[var(--text-secondary)] date-full hidden sm:inline whitespace-nowrap">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <button
                onClick={toggleChatPanel}
                className={`p-2 rounded-lg transition-colors ${
                  chatPanelOpen
                    ? 'bg-[var(--core-blue)]/15 text-[var(--core-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }`}
                title={chatPanelOpen ? 'Close messages' : 'Open messages'}
                aria-label={chatPanelOpen ? 'Close messages' : 'Open messages'}
              >
                <MessageSquare className="w-5 h-5" />
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
