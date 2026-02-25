import { createSupabaseClient } from '@/lib/supabase/client';

const supabase = createSupabaseClient();

export type DocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
export type DocumentType = 'tax_return' | 'bank_statement' | 'proof_income' | 'identity' | 'financial_statement' | 'loan_agreement' | 'payment_receipt' | 'other';

export interface Document {
  id: string;
  document_number: string;
  name: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  applicant_id: string;
  application_id: string | null;
  loan_id: string | null;
  description: string | null;
  notes: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  applicant?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  application?: {
    id: string;
    application_number: string;
  };
  loan?: {
    id: string;
    loan_number: string;
  };
  reviewer?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreateDocumentInput {
  name: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  applicant_id: string;
  application_id?: string | null;
  loan_id?: string | null;
  description?: string;
  expires_at?: string | null;
}

export interface UpdateDocumentInput {
  name?: string;
  document_type?: DocumentType;
  status?: DocumentStatus;
  description?: string;
  notes?: string;
  rejection_reason?: string;
  expires_at?: string | null;
}

export interface DocumentFilters {
  applicant_id?: string;
  application_id?: string;
  loan_id?: string;
  document_type?: DocumentType;
  status?: DocumentStatus;
}

/**
 * Storage bucket name for documents
 */
export const DOCUMENTS_BUCKET = 'documents';

/**
 * Get all documents with optional filters
 */
export async function getDocuments(filters?: DocumentFilters): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select(`
      *,
      applicant:donum_accounts!documents_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!documents_application_id_fkey(id, application_number),
      loan:loans!documents_loan_id_fkey(id, loan_number),
      reviewer:donum_accounts!documents_reviewed_by_fkey(id, email, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.applicant_id) {
    query = query.eq('applicant_id', filters.applicant_id);
  }

  if (filters?.application_id) {
    query = query.eq('application_id', filters.application_id);
  }

  if (filters?.loan_id) {
    query = query.eq('loan_id', filters.loan_id);
  }

  if (filters?.document_type) {
    query = query.eq('document_type', filters.document_type);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getDocuments] Error:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data || []) as Document[];
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(documentId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      applicant:donum_accounts!documents_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!documents_application_id_fkey(id, application_number),
      loan:loans!documents_loan_id_fkey(id, loan_number),
      reviewer:donum_accounts!documents_reviewed_by_fkey(id, email, first_name, last_name)
    `)
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[getDocumentById] Error:', error);
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  return data as Document;
}

/**
 * Get documents by applicant ID
 */
export async function getDocumentsByApplicantId(applicantId: string): Promise<Document[]> {
  return getDocuments({ applicant_id: applicantId });
}

/**
 * Get documents by application ID
 */
export async function getDocumentsByApplicationId(applicationId: string): Promise<Document[]> {
  return getDocuments({ application_id: applicationId });
}

/**
 * Get documents by loan ID
 */
export async function getDocumentsByLoanId(loanId: string): Promise<Document[]> {
  return getDocuments({ loan_id: loanId });
}

/**
 * Upload a file to Supabase Storage and create document record
 */
export async function uploadDocument(
  file: File,
  input: Omit<CreateDocumentInput, 'file_name' | 'file_path' | 'file_size' | 'mime_type'>
): Promise<Document> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to upload documents');
  }

  // Generate unique file path
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().substring(0, 8);
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}-${randomId}.${fileExtension}`;
  
  // Determine storage path based on context
  let storagePath: string;
  if (input.application_id) {
    storagePath = `applications/${input.application_id}/${fileName}`;
  } else if (input.loan_id) {
    storagePath = `loans/${input.loan_id}/${fileName}`;
  } else {
    storagePath = `prospects/${input.applicant_id}/${fileName}`;
  }

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadDocument] Storage upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Create document record
  const documentData: CreateDocumentInput = {
    ...input,
    file_name: file.name,
    file_path: uploadData.path,
    file_size: file.size,
    mime_type: file.type,
  };

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      ...documentData,
      created_by: user.id,
    })
    .select(`
      *,
      applicant:donum_accounts!documents_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!documents_application_id_fkey(id, application_number),
      loan:loans!documents_loan_id_fkey(id, loan_number)
    `)
    .single();

  if (documentError) {
    // If document creation fails, try to delete the uploaded file
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    console.error('[uploadDocument] Document creation error:', documentError);
    throw new Error(`Failed to create document record: ${documentError.message}`);
  }

  return document as Document;
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput
): Promise<Document> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update documents');
  }

  const updateData: any = {
    ...input,
    updated_by: user.id,
  };

  // If status is being changed to approved/rejected, set reviewed_by and reviewed_at
  if (input.status && (input.status === 'approved' || input.status === 'rejected')) {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', documentId)
    .select(`
      *,
      applicant:donum_accounts!documents_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!documents_application_id_fkey(id, application_number),
      loan:loans!documents_loan_id_fkey(id, loan_number),
      reviewer:donum_accounts!documents_reviewed_by_fkey(id, email, first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('[updateDocument] Error:', error);
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return data as Document;
}

/**
 * Delete a document (removes from storage and database)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to delete documents');
  }

  // Get document to get file path
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Only allow deletion if status is pending
  if (document.status !== 'pending') {
    throw new Error('Only pending documents can be deleted');
  }

  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    console.error('[deleteDocument] Storage deletion error:', storageError);
    // Continue with database deletion even if storage deletion fails
  }

  // Delete document record
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    console.error('[deleteDocument] Database deletion error:', deleteError);
    throw new Error(`Failed to delete document: ${deleteError.message}`);
  }
}

/**
 * Get download URL for a document
 */
export async function getDocumentDownloadUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.file_path, expiresIn);

  if (error) {
    console.error('[getDocumentDownloadUrl] Error:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Review a document (approve or reject)
 */
export async function reviewDocument(
  documentId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<Document> {
  const updateData: UpdateDocumentInput = {
    status,
    rejection_reason: status === 'rejected' ? rejectionReason : undefined,
  };

  return updateDocument(documentId, updateData);
}
