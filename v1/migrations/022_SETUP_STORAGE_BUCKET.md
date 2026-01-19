# Storage Bucket Setup for Documents

After applying migration `022_create_documents_system.sql`, you need to create the storage bucket in Supabase.

## Steps to Create Storage Bucket

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** or **"Create bucket"**
   - Bucket name: `documents`
   - **Public bucket**: Unchecked (private bucket)
   - Click **"Create bucket"**

3. **Set Bucket Policies**
   - Click on the `documents` bucket
   - Go to **"Policies"** tab
   - Add the following policies:

### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN ('applications', 'loans', 'prospects')
);
```

### Policy 2: Allow users to view their own documents
```sql
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Documents in applications folder
    (storage.foldername(name))[1] = 'applications'
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id::text = (storage.foldername(name))[2]
      AND a.applicant_id = auth.uid()
    )
  )
  OR
  -- Documents in loans folder
  (
    (storage.foldername(name))[1] = 'loans'
    AND EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id::text = (storage.foldername(name))[2]
      AND l.applicant_id = auth.uid()
    )
  )
  OR
  -- Documents in prospects folder
  (
    (storage.foldername(name))[1] = 'prospects'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
);
```

### Policy 3: Allow staff to view assigned documents
```sql
CREATE POLICY "Staff can view assigned documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.donum_accounts da
    WHERE da.id = auth.uid()
    AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    AND (
      -- Documents for applications assigned to staff
      (
        (storage.foldername(name))[1] = 'applications'
        AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.id::text = (storage.foldername(name))[2]
          AND (
            a.assigned_departments && da.departments
            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
            OR a.primary_staff_id = da.id
          )
        )
      )
      OR
      -- Documents for loans assigned to staff
      (
        (storage.foldername(name))[1] = 'loans'
        AND EXISTS (
          SELECT 1 FROM public.loans l
          WHERE l.id::text = (storage.foldername(name))[2]
          AND (
            l.assigned_departments && da.departments
            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
            OR l.primary_staff_id = da.id
          )
        )
      )
      OR
      -- Documents for prospects assigned to staff
      (
        (storage.foldername(name))[1] = 'prospects'
        AND EXISTS (
          SELECT 1 FROM public.prospect_staff_assignments psa
          WHERE psa.prospect_id::text = (storage.foldername(name))[2]
          AND psa.staff_id = da.id
          AND psa.is_active = true
        )
      )
    )
  )
);
```

### Policy 4: Allow users to delete their own pending documents
```sql
CREATE POLICY "Users can delete their own pending documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = name
    AND d.status = 'pending'
    AND d.applicant_id = auth.uid()
  )
);
```

### Policy 5: Allow staff to delete assigned pending documents
```sql
CREATE POLICY "Staff can delete assigned pending documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.donum_accounts da ON da.id = auth.uid()
    WHERE d.file_path = name
    AND d.status = 'pending'
    AND da.role IN ('donum_staff', 'donum_admin', 'donum_super_admin')
    AND (
      -- Document linked to application assigned to staff
      (
        d.application_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.id = d.application_id
          AND (
            a.assigned_departments && da.departments
            OR a.assigned_staff @> ARRAY[da.id]::UUID[]
            OR a.primary_staff_id = da.id
          )
        )
      )
      OR
      -- Document linked to loan assigned to staff
      (
        d.loan_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.loans l
          WHERE l.id = d.loan_id
          AND (
            l.assigned_departments && da.departments
            OR l.assigned_staff @> ARRAY[da.id]::UUID[]
            OR l.primary_staff_id = da.id
          )
        )
      )
    )
  )
);
```

## File Path Structure

Documents are stored with the following structure:
- `applications/{application_id}/{timestamp}-{random}.{ext}` - Documents linked to applications
- `loans/{loan_id}/{timestamp}-{random}.{ext}` - Documents linked to loans
- `prospects/{applicant_id}/{timestamp}-{random}.{ext}` - General prospect documents

## Verification

After setting up the bucket and policies:

1. Try uploading a document from the prospect documents page
2. Verify the file appears in the `documents` bucket
3. Check that the document record is created in the `documents` table
4. Test downloading the document
5. Test document review (approve/reject) from admin interface
