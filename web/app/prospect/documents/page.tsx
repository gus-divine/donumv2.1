'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getDocumentsByApplicantId, type Document, type DocumentType } from '@/lib/api/documents';
import DocumentUpload from '@/components/documents/DocumentUpload';
import { Download, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const REQUIRED_DOCUMENTS: Array<{ id: DocumentType; name: string; required: boolean }> = [
  { id: 'tax_return', name: 'Tax Return (Most Recent)', required: true },
  { id: 'bank_statement', name: 'Bank Statements (3 months)', required: true },
  { id: 'proof_income', name: 'Proof of Income', required: true },
  { id: 'identity', name: 'Government ID', required: true },
  { id: 'financial_statement', name: 'Financial Statement', required: false },
  { id: 'other', name: 'Other Documents', required: false },
];

export default function ProspectDocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const docs = await getDocumentsByApplicantId(user.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = async (document: Document) => {
    await loadDocuments();
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getDocumentForType = (docType: DocumentType): Document | undefined => {
    return documents.find(d => d.document_type === docType);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'under_review':
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'under_review':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--core-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading documents...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <button
        onClick={() => router.push('/prospect/dashboard')}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        ← Back to Dashboard
      </button>
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Documents</h1>
          <p className="text-[var(--text-secondary)]">
            Upload the required documents to complete your application. You can upload documents as you obtain them.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const document = getDocumentForType(doc.id);
            const uploaded = !!document;

            return (
              <div
                key={doc.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {doc.name}
                      </h3>
                      {doc.required && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                      {uploaded && (
                        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          {document.status.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                    {uploaded && (
                      <div className="space-y-1 mb-3">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Uploaded: {new Date(document.created_at).toLocaleDateString()}
                        </p>
                        {document.rejection_reason && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Rejection reason: {document.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {uploaded && document.status === 'approved' && (
                      <a
                        href={`/api/documents/${document.id}/download`}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {user && (
                      <DocumentUpload
                        documentType={doc.id}
                        documentName={doc.name}
                        required={doc.required}
                        applicantId={user.id}
                        onUploadSuccess={handleUploadSuccess}
                        onUploadError={handleUploadError}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Accepted file formats: PDF, JPG, JPEG, PNG. Maximum file size: 10MB per document.
          </p>
        </div>
      </div>
    </main>
  );
}
