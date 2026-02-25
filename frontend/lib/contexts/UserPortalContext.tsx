'use client';

import { createContext, useContext } from 'react';

export type UserPortalBasePath = '/prospect' | '/members' | '/user/prospect' | '/user/member';

const UserPortalContext = createContext<UserPortalBasePath>('/prospect');

export function UserPortalProvider({ children, basePath }: { children: React.ReactNode; basePath: UserPortalBasePath }) {
  return (
    <UserPortalContext.Provider value={basePath}>
      {children}
    </UserPortalContext.Provider>
  );
}

export function useUserPortalBasePath(): UserPortalBasePath {
  return useContext(UserPortalContext);
}
