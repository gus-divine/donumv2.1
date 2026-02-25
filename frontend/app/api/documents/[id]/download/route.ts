import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAccessToken, requireAuth, createSupabaseUserClient } from '@/lib/api/auth-utils';
import { DOCUMENTS_BUCKET } from '@/lib/api/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const documentId = id;

    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use user-scoped client so RLS enforces document access
    const userSupabase = createSupabaseUserClient(token);
    const { data: document, error: docError } = await userSupabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Create signed URL with service role (we've already verified access via RLS)
    const supabase = createSupabaseServerClient();
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(document.file_path, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('[Document Download] Error creating signed URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Return JSON for client-side fetch (with Authorization header); supports redirect for cookie-based auth
    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error('[Document Download] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
