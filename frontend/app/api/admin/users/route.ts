import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CreateUserInput } from '@/lib/api/users';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body: CreateUserInput = await request.json();

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists in donum_accounts
    const { data: existingAccount } = await supabase
      .from('donum_accounts')
      .select('id, email')
      .eq('email', body.email)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: `A user with email "${body.email}" already exists in the system.` },
        { status: 409 }
      );
    }

    // Check if auth user already exists
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      (u) => u.email === body.email
    );

    let authUserId: string;

    if (existingAuthUser) {
      // User exists in auth but not in donum_accounts - link them
      console.log('[API] Linking existing auth user to donum_accounts:', {
        email: body.email,
        authUserId: existingAuthUser.id,
      });
      authUserId = existingAuthUser.id;
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true, // Skip email confirmation for admin-created users
      });

      if (authError) {
        console.error('[API] Error creating auth user:', authError);
        return NextResponse.json(
          { error: `Failed to create auth user: ${authError.message}` },
          { status: 400 }
        );
      }

      if (!authData.user) {
        return NextResponse.json(
          { error: 'Failed to create user: No user returned from auth' },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;
    }

    // Get current user from session (if available)
    const authHeader = request.headers.get('authorization');
    let currentUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      currentUserId = user?.id || null;
    }

    // Create donum_accounts record
    const { data, error } = await supabase
      .from('donum_accounts')
      .insert({
        id: authUserId,
        email: body.email,
        role: body.role,
        status: body.status || 'pending',
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        phone: body.phone || null,
        company: body.company || null,
        title: body.title || null,
        departments: body.departments || [],
        admin_level: body.admin_level || null,
        timezone: body.timezone || 'America/New_York',
        language: body.language || 'en',
        created_by: currentUserId,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating donum_accounts record:', error);
      return NextResponse.json(
        { error: `Failed to create user account: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
