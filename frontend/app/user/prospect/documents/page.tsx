'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getDocumentsByApplicantId, type Document, type DocumentType } from '@/lib/api/documents';
import DocumentUpload from '@/components/documents/DocumentUpload';
import { Download, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [unsavedFiles, setUnsavedFiles] = useState<Set<DocumentType>>(new Set());

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  // Warn user before leaving if they have unsaved files
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedFiles.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved documents ready to upload. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedFiles]);

  const loadDocuments = async (isBackgroundRefresh = false) => {
    if (!user) return;
    
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
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

  const handleUploadSuccess = async () => {
    await loadDocuments(true);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getDocumentsForType = (docType: DocumentType): Document[] => {
    return documents.filter(d => d.document_type === docType);
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
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
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
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <Skeleton height="1.5rem" width="10rem" />
          </div>

          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="12rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
          </div>

          {/* Document List Skeleton */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`pt-4 pb-6 ${index < 5 ? 'border-b border-[var(--border)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Skeleton height="1.5rem" width="16rem" className="mb-3" />
                      <div className="flex items-center gap-3 mb-3">
                        <Skeleton height="1.25rem" width="5rem" />
                        <Skeleton height="1.25rem" width="6rem" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton height="1rem" width="20rem" />
                        <Skeleton height="0.875rem" width="12rem" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Skeleton height="2rem" width="5rem" />
                      <Skeleton height="2.5rem" width="2.5rem" variant="rectangular" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            if (unsavedFiles.size > 0) {
              const confirmed = window.confirm(
                `You have ${unsavedFiles.size} document${unsavedFiles.size > 1 ? 's' : ''} ready to upload. Are you sure you want to leave? Your progress will be lost.`
              );
              if (!confirmed) return;
            }
            router.push('/user/prospect/dashboard');
          }}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          ← Back to Dashboard
        </button>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Documents</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload the required documents to complete your application. You can upload documents as you obtain them.
          </p>
        </div>

        {error && (
          <div className="mb-6 border-l-4 border-red-500 pl-4 py-2">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Warning for unsaved files */}
        {unsavedFiles.size > 0 && (
          <div className="mb-6 border-l-4 border-yellow-500 pl-4 py-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Unsaved Document{unsavedFiles.size > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  You have {unsavedFiles.size} document{unsavedFiles.size > 1 ? 's' : ''} ready to upload. Please upload {unsavedFiles.size > 1 ? 'them' : 'it'} before navigating away to avoid losing your progress.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning for missing required documents */}
        {(() => {
          const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
          const uploadedRequiredDocs = requiredDocs.filter(doc => {
            const docsForType = getDocumentsForType(doc.id);
            return docsForType.some(d => d.status === 'approved');
          });
          const missingRequired = requiredDocs.length - uploadedRequiredDocs.length;
          
          if (missingRequired > 0) {
            return (
              <div className="mb-6 border-l-4 border-yellow-500 pl-4 py-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                      Missing Required Documents
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      You have {missingRequired} required document{missingRequired !== 1 ? 's' : ''} that {missingRequired !== 1 ? 'need' : 'needs'} to be uploaded and approved to complete your application.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
          <div className="space-y-4">
            {REQUIRED_DOCUMENTS.map((doc, index) => {
              const docsForType = getDocumentsForType(doc.id);
              const hasUploaded = docsForType.length > 0;
              const hasRejected = docsForType.some(d => d.status === 'rejected');
              const hasApproved = docsForType.some(d => d.status === 'approved');

              return (
                <div
                  key={doc.id}
                  className={`pt-4 pb-6 ${index < REQUIRED_DOCUMENTS.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                        {doc.name}
                      </h3>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        {doc.required && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 px-2 py-1 rounded border border-red-500/30 whitespace-nowrap">
                            Required
                          </span>
                        )}
                        {hasUploaded && docsForType.length === 1 && (
                          <span className={`text-xs inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${getStatusColor(docsForType[0].status)}`}>
                            {getStatusIcon(docsForType[0].status)}
                            <span>{formatStatus(docsForType[0].status)}</span>
                          </span>
                        )}
                        {hasUploaded && docsForType.length > 1 && (
                          <span className={`text-xs inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${getStatusColor(docsForType[0].status)}`}>
                            {getStatusIcon(docsForType[0].status)}
                            <span>
                              {docsForType.filter(d => d.status === 'approved').length} of {docsForType.length} approved
                              {docsForType.every(d => d.status === docsForType[0].status) && (
                                <> • {formatStatus(docsForType[0].status)}</>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                      {docsForType.length > 0 && (
                        <div className="space-y-3 mb-3">
                          {docsForType.map((document) => {
                            const hasMixedStatus = docsForType.some(d => d.status !== docsForType[0].status);
                            const showPerFileStatus = hasMixedStatus || document.rejection_reason;
                            return (
                              <div key={document.id} className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">
                                    {document.file_name}
                                  </p>
                                  {showPerFileStatus && (
                                    <span className={`text-xs inline-flex items-center gap-1 font-medium ${getStatusColor(document.status)}`}>
                                      {getStatusIcon(document.status)}
                                      {formatStatus(document.status)}
                                    </span>
                                  )}
                                  {document.status === 'approved' && (
                                    <a
                                      href={`/api/documents/${document.id}/download`}
                                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                      title="Download"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  Uploaded: {new Date(document.created_at).toLocaleDateString()}
                                </p>
                                {document.rejection_reason && (
                                  <div className="mt-1 border-l-4 border-red-500 pl-3 py-1">
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      Rejection reason: {document.rejection_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {hasRejected && !hasApproved && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            This document was rejected.
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Please upload a new file addressing the feedback above.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                    {user && (
                      <DocumentUpload
                        documentType={doc.id}
                        documentName={doc.name}
                        required={doc.required}
                        applicantId={user.id}
                        onUploadSuccess={handleUploadSuccess}
                        onUploadError={handleUploadError}
                        onFileSelected={(hasFile) => {
                          setUnsavedFiles(prev => {
                            const newSet = new Set(prev);
                            if (hasFile) {
                              newSet.add(doc.id);
                            } else {
                              newSet.delete(doc.id);
                            }
                            return newSet;
                          });
                        }}
                        autoUpload
                        multiple
                      />
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--core-gold)]">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Accepted file formats: PDF, JPG, JPEG, PNG. Maximum file size: 10MB per document.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
