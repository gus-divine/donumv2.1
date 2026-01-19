'use client';

import { useState, useEffect } from 'react';
import { getDocuments, reviewDocument, deleteDocument, type Document, type DocumentFilters } from '@/lib/api/documents';
import { CheckCircle, XCircle, Clock, Download, Trash2, FileText } from 'lucide-react';

interface DocumentListProps {
  filters?: DocumentFilters;
  showActions?: boolean;
  onDocumentUpdate?: () => void;
}

export default function DocumentList({ filters, showActions = true, onDocumentUpdate }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await getDocuments(filters);
      setDocuments(docs);
    } catch (err) {
      console.error('[DocumentList] Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (documentId: string) => {
    setReviewing(documentId);
    try {
      await reviewDocument(documentId, 'approved');
      await loadDocuments();
      onDocumentUpdate?.();
    } catch (err) {
      console.error('[DocumentList] Error approving document:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve document');
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (documentId: string) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    setReviewing(documentId);
    try {
      await reviewDocument(documentId, 'rejected', reason);
      await loadDocuments();
      onDocumentUpdate?.();
    } catch (err) {
      console.error('[DocumentList] Error rejecting document:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject document');
    } finally {
      setReviewing(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      console.log('[DocumentList] Deleting document:', { documentId });
      setDeletingId(documentId);
      await deleteDocument(documentId);
      console.log('[DocumentList] Document deleted, reloading list...');
      await loadDocuments();
      onDocumentUpdate?.();
    } catch (err) {
      console.error('[DocumentList] Error deleting document:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'under_review':
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 dark:text-green-400';
      case 'rejected':
        return 'text-red-600 dark:text-red-400';
      case 'under_review':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'pending':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-amber-600 dark:text-amber-400';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--core-blue)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No documents found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-b-0"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{document.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(document.status)}`}>
                {getStatusIcon(document.status)}
                {document.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-0.5 text-xs text-[var(--text-secondary)]">
              <p>{document.document_type.replace('_', ' ')} • {formatFileSize(document.file_size)}</p>
              <p>Uploaded {new Date(document.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}</p>
              {document.reviewed_at && (
                <p>Reviewed {new Date(document.reviewed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}</p>
              )}
              {document.rejection_reason && (
                <p className="text-red-600 dark:text-red-400 mt-1">
                  {document.rejection_reason}
                </p>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1 ml-4">
              <a
                href={`/api/documents/${document.id}/download`}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              {document.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(document.id)}
                    disabled={reviewing === document.id}
                    className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReject(document.id)}
                    disabled={reviewing === document.id}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {document.status === 'pending' && (
                <button
                  onClick={() => handleDelete(document.id)}
                  disabled={deletingId === document.id}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
