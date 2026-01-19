'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserAccessiblePages, type PagePermission } from '@/lib/permissions';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  UserSearch,
  UserCheck,
  Briefcase,
  Building2,
  BookOpen,
  TrendingUp,
  CreditCard,
  Users,
  Activity,
  LogOut,
} from 'lucide-react';

interface AdminSidebarProps {}

const allTabs = [
  {
    id: 'overview',
    name: 'Overview',
    path: '/admin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    id: 'applications',
    name: 'Applications',
    path: '/admin/applications',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'prospects',
    name: 'Prospects',
    path: '/admin/prospects',
    icon: <UserSearch className="w-5 h-5" />
  },
  {
    id: 'members',
    name: 'Members',
    path: '/admin/members',
    icon: <UserCheck className="w-5 h-5" />
  },
  {
    id: 'staff',
    name: 'Staff',
    path: '/admin/staff',
    icon: <Briefcase className="w-5 h-5" />
  },
  {
    id: 'departments',
    name: 'Departments',
    path: '/admin/departments',
    icon: <Building2 className="w-5 h-5" />
  },
  {
    id: 'plans',
    name: 'Plans',
    path: '/admin/plans',
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    id: 'finance',
    name: 'Financial Overview',
    path: '/admin/finance',
    icon: <TrendingUp className="w-5 h-5" />
  },
  {
    id: 'loans',
    name: 'Loans',
    path: '/admin/loans',
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    id: 'users',
    name: 'Users',
    path: '/admin/users',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'system',
    name: 'System Health',
    path: '/admin/system',
    icon: <Activity className="w-5 h-5" />
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
          <LogOut className="w-5 h-5 flex-shrink-0" />
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
