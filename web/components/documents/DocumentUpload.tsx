'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { uploadDocument, type DocumentType, type Document } from '@/lib/api/documents';

interface DocumentUploadProps {
  documentType: DocumentType;
  documentName: string;
  required?: boolean;
  applicantId: string;
  applicationId?: string | null;
  loanId?: string | null;
  onUploadSuccess?: (document: Document) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export default function DocumentUpload({
  documentType,
  documentName,
  required = false,
  applicantId,
  applicationId,
  loanId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 10,
  acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png'],
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      setError(`File format not accepted. Accepted formats: ${acceptedFormats.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DocumentUpload] Input change event triggered', {
      files: e.target.files?.length || 0,
      fileName: e.target.files?.[0]?.name
    });
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const document = await uploadDocument(selectedFile, {
        name: documentName,
        document_type: documentType,
        applicant_id: applicantId,
        application_id: applicationId || null,
        loan_id: loanId || null,
      });

      setSelectedFile(null);
      onUploadSuccess?.(document);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
  };

  // Convert accepted formats to MIME types for the accept attribute
  const getAcceptString = () => {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    return acceptedFormats.map(fmt => mimeTypes[fmt] || fmt).join(',');
  };

  // Generate a stable ID that doesn't change on re-renders
  const inputId = useMemo(() => {
    const uniqueId = `${documentType}-${applicantId}${applicationId ? `-${applicationId}` : ''}${loanId ? `-${loanId}` : ''}`;
    return `file-input-${uniqueId}`;
  }, [documentType, applicantId, applicationId, loanId]);

  return (
    <div className="space-y-3">
      {!selectedFile ? (
        <label
          htmlFor={inputId}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative flex flex-col items-center justify-center w-full min-h-[140px] px-6 py-8 border-2 border-dashed rounded-xl transition-all duration-200 ${
            uploading 
              ? 'cursor-not-allowed opacity-50 border-[var(--border)] bg-[var(--surface)] pointer-events-none' 
              : isDragging
              ? 'cursor-pointer border-[var(--core-blue)] bg-[var(--core-blue)]/5 scale-[1.02] shadow-lg'
              : 'cursor-pointer border-[var(--border)] bg-[var(--surface)] hover:border-[var(--core-blue)]/50 hover:bg-[var(--surface-hover)]'
          }`}
        >
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept={getAcceptString()}
            onChange={handleInputChange}
            disabled={uploading}
            className="sr-only"
          />
          
          <div className={`flex flex-col items-center gap-3 ${isDragging ? 'scale-110' : ''} transition-transform duration-200`}>
            <div className={`p-3 rounded-full ${isDragging ? 'bg-[var(--core-blue)]/10' : 'bg-[var(--surface-hover)]'} transition-colors`}>
              <Upload className={`w-6 h-6 ${isDragging ? 'text-[var(--core-blue)]' : 'text-[var(--text-secondary)]'} transition-colors`} />
            </div>
            
            <div className="text-center">
              <p className={`text-sm font-medium mb-1 ${isDragging ? 'text-[var(--core-blue)]' : 'text-[var(--text-primary)]'} transition-colors`}>
                {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {acceptedFormats.join(', ').toUpperCase()} up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </label>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 bg-[var(--core-blue)]/10 rounded-lg">
              <FileText className="w-5 h-5 text-[var(--core-blue)]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {selectedFile.name}
                </p>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                    Uploading...
                  </span>
                ) : (
                  'Upload'
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={uploading}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors disabled:opacity-50"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
