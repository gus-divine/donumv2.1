'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createSupabaseClient } from '../supabase/client';
import type { UserRole } from '../permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  departments: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  departments: [],
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use singleton client instance to avoid multiple GoTrueClient instances
    const supabase = createSupabaseClient();

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] Error getting session:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('[Auth] Failed to get session:', {
          message: error instanceof Error ? error.message : String(error),
          error,
        });
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setRole(null);
        setDepartments([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(user: User, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 2;
    
    try {
      // Use singleton client instance to avoid multiple GoTrueClient instances
      const supabase = createSupabaseClient();
      
      // Ensure we have a valid session before querying
      let { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      // If session error or no session, try refreshing
      if (sessionError || !currentSession) {
        if (retryCount < MAX_RETRIES) {
          console.log('[Auth] No session, attempting to refresh...');
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession) {
            currentSession = refreshedSession;
            setSession(refreshedSession);
          } else {
            console.error('[Auth] No session available when fetching user data');
            setLoading(false);
            return;
          }
        } else {
          console.error('[Auth] No session available after retries');
          setLoading(false);
          return;
        }
      }
      
      const { data, error } = await supabase
        .from('donum_accounts')
        .select('role, departments')
        .eq('id', user.id)
        .single();

      if (error) {
        // Check if it's an RLS/policy error that might be fixed by refreshing session
        const isRLSError = error.code === '42501' || 
                          error.code === '42P17' || 
                          error.message?.includes('row-level security') ||
                          error.message?.includes('infinite recursion');
        
        // Check if it's a 403/500 that might be fixed by refreshing
        const isServerError = error.code === '500' || 
                             (typeof error.status === 'number' && error.status >= 500) ||
                             (typeof error.statusCode === 'number' && error.statusCode >= 500);
        
        // Log comprehensive error information
        const errorInfo: Record<string, unknown> = {
          userId: user.id,
          retryCount,
        };
        
        // Safely extract error properties
        if ('message' in error) errorInfo.message = error.message;
        if ('code' in error) errorInfo.code = error.code;
        if ('details' in error) errorInfo.details = error.details;
        if ('hint' in error) errorInfo.hint = error.hint;
        if ('status' in error) errorInfo.status = error.status;
        if ('statusCode' in error) errorInfo.statusCode = error.statusCode;
        
        console.error('[Auth] Error fetching user data:', errorInfo);
        
        // If RLS error or server error, try refreshing session and retry
        if ((isRLSError || isServerError) && retryCount < MAX_RETRIES) {
          console.log('[Auth] RLS/Server error detected, refreshing session and retrying...');
          
          // Refresh the session to get a new JWT token
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('[Auth] Failed to refresh session:', refreshError);
            setLoading(false);
            return;
          }
          
          if (refreshedSession) {
            setSession(refreshedSession);
            // Retry fetching user data with refreshed session
            return fetchUserData(user, retryCount + 1);
          }
        }
        
        // Additional debugging info for final failure
        errorInfo.errorType = error.constructor?.name;
        errorInfo.errorString = String(error);
        errorInfo.errorKeys = Object.keys(error);
        
        try {
          errorInfo.errorJSON = JSON.stringify(error, null, 2);
        } catch (e) {
          errorInfo.errorJSON = 'Could not stringify error';
        }
        
        console.error('[Auth] Final error after retries:', errorInfo);
        setLoading(false);
        return;
      }

      setRole(data?.role as UserRole || null);
      setDepartments(data?.departments || []);
      setLoading(false);
    } catch (error) {
      console.error('[Auth] Failed to fetch user data:', {
        message: error instanceof Error ? error.message : String(error),
        error,
        userId: user.id,
        retryCount,
      });
      setLoading(false);
    }
  }

  async function refreshAuth() {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Refresh the session to get a new JWT token
      const { data: { session: refreshedSession }, error } = 
        await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[Auth] Failed to refresh auth:', error);
        return;
      }
      
      if (refreshedSession?.user) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await fetchUserData(refreshedSession.user);
      }
    }
  }

  async function signOut() {
    // Use singleton client instance to avoid multiple GoTrueClient instances
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setDepartments([]);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        departments,
        loading,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
