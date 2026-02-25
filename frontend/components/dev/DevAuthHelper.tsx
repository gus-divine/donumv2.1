'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Development helper that exposes auth refresh function to window object
 * Only active in development mode
 * 
 * Usage in browser console:
 *   window.refreshAuth()
 */
export function DevAuthHelper() {
  const { refreshAuth } = useAuth();

  useEffect(() => {
    // Only expose in development
    if (process.env.NODE_ENV === 'development') {
      // Expose refresh function to window for easy console access
      (window as any).refreshAuth = async () => {
        console.log('[Dev] Refreshing auth state...');
        await refreshAuth();
        console.log('[Dev] Auth refresh complete!');
      };

      // Also expose a helper to clear storage and refresh
      (window as any).clearAuthAndRefresh = async () => {
        console.log('[Dev] Clearing storage and refreshing auth...');
        localStorage.clear();
        sessionStorage.clear();
        await refreshAuth();
        console.log('[Dev] Storage cleared and auth refreshed!');
        console.log('[Dev] You may need to reload the page.');
      };

      console.log('[Dev] Auth helpers available:');
      console.log('  - window.refreshAuth() - Refresh auth state');
      console.log('  - window.clearAuthAndRefresh() - Clear storage and refresh');
    }

    return () => {
      // Cleanup on unmount
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).refreshAuth;
        delete (window as any).clearAuthAndRefresh;
      }
    };
  }, [refreshAuth]);

  return null; // This component doesn't render anything
}
