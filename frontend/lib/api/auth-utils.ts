import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AdminRole = 'donum_super_admin' | 'donum_admin';

const ADMIN_ROLES: AdminRole[] = ['donum_super_admin', 'donum_admin'];

/**
 * Get the access token from the request (Authorization header or Supabase auth cookie)
 */
export function getAccessToken(request: NextRequest): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Check Supabase auth cookie (sb-<project-ref>-auth-token)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectRef = match?.[1];
      if (projectRef) {
        const cookieName = `sb-${projectRef}-auth-token`;
        const cookie = request.cookies.get(cookieName)?.value;
        if (cookie) {
          const parsed = JSON.parse(cookie) as { access_token?: string };
          return parsed.access_token ?? null;
        }
      }
    } catch {
      // Ignore cookie parse errors
    }
  }

  return null;
}

/**
 * Require admin authentication for API routes.
 * Returns the current user's ID if authorized, or a 401/403 NextResponse if not.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; role: string } | NextResponse> {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Fetch donum_accounts to check role
  const { data: account, error: accountError } = await supabase
    .from('donum_accounts')
    .select('id, role')
    .eq('id', authUser.id)
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { error: 'Account not found' },
      { status: 403 }
    );
  }

  if (!ADMIN_ROLES.includes(account.role as AdminRole)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return { userId: account.id, role: account.role };
}

/**
 * Require any authenticated user for API routes.
 * Returns the current user's ID if authorized, or a 401 NextResponse if not.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  return { userId: user.id };
}

/**
 * Create a Supabase client that authenticates as the given user (for RLS).
 * Use this when you need to run queries that respect RLS policies.
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase env vars');

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
