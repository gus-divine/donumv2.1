'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { MemberSidebar } from '@/components/member/shared/MemberSidebar';
import { ThemeToggle } from '@/components/admin/shared/ThemeToggle';
import { usePathname } from 'next/navigation';

interface MemberLayoutProps {
  children: React.ReactNode;
}

function getPageTitle(pathname: string): string {
  const titleMap: Record<string, string> = {
    '/members/dashboard': 'Dashboard',
    '/members/loans': 'My Loans',
    '/members/payments': 'Payments',
    '/members/documents': 'Documents',
    '/members/profile': 'Profile',
  };

  return titleMap[pathname] || 'Member Portal';
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname || '');
  const { user, session, loading, role } = useAuth();
  const router = useRouter();
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    // Redirect if not a member role
    if (!loading && session && role) {
      if (role === 'donum_prospect') {
        router.push('/prospect/dashboard');
        return;
      }
      if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push('/admin/dashboard');
        return;
      }
      // If not member, redirect to signin
      if (role !== 'donum_member') {
        router.push('/auth/signin');
        return;
      }
    }

    // Redirect to signin if no session
    if (!loading && !session) {
      router.push('/auth/signin?redirect=' + encodeURIComponent(pathname || '/members/dashboard'));
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex">
      {/* Global Sidebar */}
      <MemberSidebar />

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 50px)' }}>
        {/* Header */}
        <header className="admin-header" style={{ height: '50px' }}>
          <div className="px-4 py-2 flex justify-between items-center h-full">
            <div className="flex items-center space-x-4">
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-[var(--text-secondary)]">System Online</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatTime(currentDateTime)}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="admin-main text-sm flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
