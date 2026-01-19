import { NextRequest, NextResponse } from 'next/server';
import { getDocumentDownloadUrl } from '@/lib/api/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = id;
    const downloadUrl = await getDocumentDownloadUrl(documentId);
    
    // Redirect to the signed URL
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('[Document Download] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
