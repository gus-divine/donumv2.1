'use client';

import { createSupabaseClient } from '@/lib/supabase/client';

interface DocumentDownloadLinkProps {
  documentId: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Client-side document download that sends the auth token.
 * Use this instead of <a href> since Supabase session is in localStorage, not cookies.
 */
export function DocumentDownloadLink({
  documentId,
  children,
  className,
  title = 'Download',
}: DocumentDownloadLinkProps) {
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.href = '/auth/signin?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      const res = await fetch(`/api/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }

      const data = await res.json();
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[DocumentDownload]', err);
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}
