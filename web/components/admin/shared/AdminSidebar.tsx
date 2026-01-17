'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserAccessiblePages, type PagePermission } from '@/lib/permissions';
import Image from 'next/image';

interface AdminSidebarProps {}

const allTabs = [
  {
    id: 'overview',
    name: 'Overview',
    path: '/admin/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    )
  },
  {
    id: 'applications',
    name: 'Applications',
    path: '/admin/applications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M16 2v2"/>
        <path d="M17.915 22a6 6 0 0 0-12 0"/>
        <path d="M8 2v2"/>
        <circle cx="12" cy="12" r="4"/>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
      </svg>
    )
  },
  {
    id: 'members',
    name: 'Members',
    path: '/admin/members',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
        <path d="M6.376 18.91a6 6 0 0 1 11.249.003"/>
        <circle cx="12" cy="11" r="4"/>
      </svg>
    )
  },
  {
    id: 'staff',
    name: 'Staff',
    path: '/admin/staff',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M13.5 8h-3"/>
        <path d="m15 2-1 2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"/>
        <path d="M16.899 22A5 5 0 0 0 7.1 22"/>
        <path d="m9 2 3 6"/>
        <circle cx="12" cy="15" r="3"/>
      </svg>
    )
  },
  {
    id: 'departments',
    name: 'Departments',
    path: '/admin/departments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 16h.01"/>
        <path d="M16 16h.01"/>
        <path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
        <path d="M8 16h.01"/>
      </svg>
    )
  },
  {
    id: 'finance',
    name: 'Financial Overview',
    path: '/admin/finance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M13 17V9"/>
        <path d="M18 17V5"/>
        <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
        <path d="M8 17v-3"/>
      </svg>
    )
  },
  {
    id: 'loans',
    name: 'Loans',
    path: '/admin/loans',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M10 18v-7"/>
        <path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/>
        <path d="M14 18v-7"/>
        <path d="M18 18v-7"/>
        <path d="M3 22h18"/>
        <path d="M6 18v-7"/>
      </svg>
    )
  },
  {
    id: 'users',
    name: 'Users',
    path: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 21a8 8 0 0 0-16 0"/>
        <circle cx="10" cy="8" r="5"/>
        <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
      </svg>
    )
  },
  {
    id: 'system',
    name: 'System Health',
    path: '/admin/system',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
      </svg>
    )
  },
];

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accessiblePages, setAccessiblePages] = useState<Set<string>>(new Set());
  const { signOut, user, role, departments } = useAuth();
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

  // Load accessible pages based on role and departments
  useEffect(() => {
    const loadAccessiblePages = async () => {
      if (!role) return;
      
      const pages = await getUserAccessiblePages(role, departments);
      const pagePaths = new Set(pages.map(p => p.pagePath));
      setAccessiblePages(pagePaths);
    };

    loadAccessiblePages();
  }, [role, departments]);

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
          {allTabs.filter(tab => {
            // Super admins and admins see all tabs
            if (role === 'donum_super_admin' || role === 'donum_admin') {
              return true;
            }
            // Staff users only see tabs they have permission for
            return accessiblePages.has(tab.path);
          }).map((tab) => {
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
                onMouseEnter={(e) => {
                    if (!isActive) {
                    e.currentTarget.style.backgroundImage = `url(/icons/ui/${isDarkMode ? 'Subtract-dark.svg' : 'Subtract.svg'})`;
                  }
                }}
                onMouseLeave={(e) => {
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
