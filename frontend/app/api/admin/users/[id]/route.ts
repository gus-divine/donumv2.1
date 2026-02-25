import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createSupabaseServerClient();

    // Get the user to delete
    const { data: user, error: fetchError } = await supabase
      .from('donum_accounts')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete from donum_accounts (this will cascade delete related records)
    const { error: deleteError } = await supabase
      .from('donum_accounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API] Error deleting user account:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Delete from auth (requires admin client)
    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
      if (authDeleteError) {
        console.error('[API] Error deleting auth user:', authDeleteError);
        // Don't fail the request if auth deletion fails - the account is already deleted
        // Just log it
      }
    } catch (authError) {
      console.error('[API] Error deleting auth user:', authError);
      // Continue - account is already deleted from donum_accounts
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
