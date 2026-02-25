import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { email, first_name, last_name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists in donum_accounts
    const { data: existingAccount } = await supabase
      .from('donum_accounts')
      .select('id, email')
      .eq('email', trimmedEmail)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: `A user with email "${trimmedEmail}" already exists.` },
        { status: 409 }
      );
    }

    // Check if user already exists in auth (invite fails for existing auth users)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = authUsers?.find((u) => u.email?.toLowerCase() === trimmedEmail);
    if (existingAuthUser) {
      return NextResponse.json(
        { error: `A user with email "${trimmedEmail}" already has an account. Use "Add one now" to link them instead.` },
        { status: 409 }
      );
    }

    const siteOrigin = request.headers.get('origin') || request.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2003';
    const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      trimmedEmail,
      {
        redirectTo: `${siteOrigin}/auth/signin`,
        data: {
          first_name: first_name || null,
          last_name: last_name || null,
        },
      }
    );

    if (inviteError) {
      console.error('[API] Invite error:', inviteError);
      return NextResponse.json(
        { error: inviteError.message || 'Failed to send invite' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user: No user returned' },
        { status: 500 }
      );
    }

    // Create donum_accounts record for the invited user
    const { error: dbError } = await supabase
      .from('donum_accounts')
      .insert({
        id: authData.user.id,
        email: trimmedEmail,
        role: 'donum_prospect',
        status: 'pending',
        first_name: first_name || null,
        last_name: last_name || null,
      });

    if (dbError) {
      console.error('[API] Error creating donum_accounts:', dbError);
      return NextResponse.json(
        { error: `Invite sent but failed to create profile: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Invitation sent successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
