'use client';

import { usePathname } from 'next/navigation';

/**
 * Returns the portal base path for the current route.
 * Use for building navigation links that work on both admin and team subdomains.
 */
export function useBasePath(): '/admin' | '/team' {
  const pathname = usePathname() || '';
  return pathname.startsWith('/team') ? '/team' : '/admin';
}

/**
 * Map admin path to current portal path (for staff on team subdomain)
 */
export function usePortalPath(adminPath: string): string {
  const basePath = useBasePath();
  if (basePath === '/team' && adminPath.startsWith('/admin')) {
    return adminPath.replace(/^\/admin/, '/team');
  }
  return adminPath;
}
