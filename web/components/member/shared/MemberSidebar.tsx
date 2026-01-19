'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Image from 'next/image';

interface MemberSidebarProps {}

const memberTabs = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/members/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    )
  },
  {
    id: 'loans',
    name: 'My Loans',
    path: '/members/loans',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
      </svg>
    )
  },
  {
    id: 'payments',
    name: 'Payments',
    path: '/members/payments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    )
  },
  {
    id: 'documents',
    name: 'Documents',
    path: '/members/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
        <path d="M10 9H8"/>
      </svg>
    )
  },
  {
    id: 'profile',
    name: 'Profile',
    path: '/members/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    )
  },
];

export function MemberSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { signOut, user } = useAuth();
  const pathname = usePathname();

  // Initialize sidebar width CSS variable and detect theme
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '50px');
    
    // Detect current theme
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    setIsCollapsed(false);
    document.documentElement.style.setProperty('--sidebar-width', '200px');
  };

  const handleMouseLeave = () => {
    setIsCollapsed(true);
    document.documentElement.style.setProperty('--sidebar-width', '50px');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside
      className={`admin-sidebar transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-[50px]' : 'w-[200px]'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo Header */}
      <div className="p-2 flex items-center gap-3 cursor-pointer relative justify-between">
        <Image
          src="/DonumLogo.svg"
          alt="Donum Logo"
          width={32}
          height={32}
          className="object-contain flex-shrink-0"
          style={{ width: 'auto', height: '32px' }}
        />
        <h1
          className={`font-bold text-[1.125rem] leading-none text-[var(--text-secondary)] uppercase tracking-[4px] flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'w-0 opacity-0 p-0 m-0' : 'opacity-100'
          }`}
        >
          DONUM
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5">
        <ul className="list-none p-0 m-0">
          {memberTabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <li key={tab.id} className="w-full flex justify-center mb-0">
                <Link
                  href={tab.path}
                  className={`relative flex items-center px-2.5 py-4 text-[var(--text-secondary)] transition-all duration-200 border-0 font-medium text-[0.75rem] tracking-[0.5px] cursor-pointer w-full h-[40px] min-h-[40px] max-h-[40px] m-auto rounded-none box-border ${
                    isActive
                      ? 'bg-cover bg-center bg-no-repeat text-[var(--text-primary)] font-semibold'
                      : 'hover:bg-cover hover:bg-center hover:bg-no-repeat hover:opacity-90 hover:text-[var(--text-primary)]'
                  } ${isCollapsed ? 'justify-center px-4' : ''}`}
                  style={{
                    backgroundImage: isActive 
                      ? `url(/icons/ui/${isDarkMode ? 'Subtract-dark.svg' : 'Subtract.svg'})` 
                      : undefined
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundImage = `url(/icons/ui/${isDarkMode ? 'Subtract-dark.svg' : 'Subtract.svg'})`;
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundImage = 'none';
                    }
                  }}
                  title={isCollapsed ? tab.name : ''}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-[var(--core-gold)]"></div>
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                    isCollapsed ? 'w-full h-full ml-2.5' : 'w-6 h-6'
                  }`}>
                    <div className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}>
                      {tab.icon}
                    </div>
                  </div>

                  {/* Label */}
                  <span className={`font-medium text-[0.75rem] tracking-[0.5px] whitespace-nowrap overflow-hidden transition-all duration-300 ml-3 ${
                    isCollapsed ? 'w-0 opacity-0 m-0 p-0' : 'opacity-100'
                  }`}>
                    {tab.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button Footer */}
      <div className="p-5">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center px-2.5 py-2 text-[var(--text-secondary)] rounded font-medium text-[0.75rem] tracking-[0.5px] cursor-pointer transition-all duration-200 gap-2 h-[32px] min-h-[32px] max-h-[32px] ${
            isCollapsed ? 'px-2 justify-center' : ''
          } hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className={`transition-all duration-300 ${
            isCollapsed ? 'w-0 opacity-0 m-0 p-0' : 'opacity-100'
          }`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
