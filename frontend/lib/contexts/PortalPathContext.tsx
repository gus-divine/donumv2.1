'use client';

import { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

type BasePath = '/admin' | '/team';

const PortalPathContext = createContext<BasePath>('/admin');

export function PortalPathProvider({ children, basePath }: { children: React.ReactNode; basePath: BasePath }) {
  return (
    <PortalPathContext.Provider value={basePath}>
      {children}
    </PortalPathContext.Provider>
  );
}

export function usePortalPathContext(): BasePath {
  const context = useContext(PortalPathContext);
  const pathname = usePathname() || '';
  if (pathname.startsWith('/team')) return '/team';
  return context;
}

/** Convert admin path to current portal path */
export function useResolvedPath(adminPath: string): string {
  const basePath = usePortalPathContext();
  if (adminPath.startsWith('/admin') && basePath === '/team') {
    return adminPath.replace(/^\/admin/, '/team');
  }
  return adminPath;
}
