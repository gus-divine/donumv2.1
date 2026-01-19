import { createSupabaseClient } from '../supabase/client';

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'document_collection'
  | 'approved'
  | 'rejected'
  | 'funded'
  | 'closed'
  | 'cancelled';

export interface Application {
  id: string;
  applicant_id: string;
  application_number: string;
  status: ApplicationStatus;
  requested_amount: number | null;
  annual_income: number | null;
  net_worth: number | null;
  tax_bracket: string | null;
  risk_tolerance: string | null;
  investment_goals: Record<string, boolean> | null;
  application_type: string | null;
  purpose: string | null;
  notes: string | null;
  internal_notes: string | null;
  assigned_departments: string[];
  assigned_staff: string[];
  primary_staff_id: string | null;
  current_step: string | null;
  workflow_data: Record<string, any> | null;
  required_documents: string[];
  submitted_documents: string[];
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  funded_at: string | null;
  closed_at: string | null;
  rejection_reason: string | null;
  closure_reason: string | null;
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
    name: string | null;
  };
  primary_staff?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
  };
}

export interface CreateApplicationInput {
  applicant_id: string;
  requested_amount?: number;
  annual_income?: number;
  net_worth?: number;
  tax_bracket?: string;
  risk_tolerance?: string;
  investment_goals?: Record<string, boolean>;
  application_type?: string;
  purpose?: string;
  notes?: string;
  status?: ApplicationStatus;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  requested_amount?: number;
  annual_income?: number;
  net_worth?: number;
  tax_bracket?: string;
  risk_tolerance?: string;
  investment_goals?: Record<string, boolean>;
  application_type?: string;
  purpose?: string;
  notes?: string;
  internal_notes?: string;
  assigned_departments?: string[];
  assigned_staff?: string[];
  primary_staff_id?: string | null;
  current_step?: string;
  workflow_data?: Record<string, any>;
  required_documents?: string[];
  submitted_documents?: string[];
  rejection_reason?: string;
  closure_reason?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  applicant_id?: string;
  assigned_departments?: string[];
  assigned_staff?: string[];
  primary_staff_id?: string;
  search?: string; // Search by application number or applicant name
}

export const APPLICATION_STATUSES: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'document_collection', label: 'Document Collection' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'funded', label: 'Funded' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  under_review: 'yellow',
  document_collection: 'orange',
  approved: 'green',
  rejected: 'red',
  funded: 'green',
  closed: 'gray',
  cancelled: 'red',
};

export async function getApplications(filters?: ApplicationFilters): Promise<Application[]> {
  const supabase = createSupabaseClient();
  
  // Fetch applications without relationships to avoid caching
  let query = supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters) {
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.applicant_id) {
      query = query.eq('applicant_id', filters.applicant_id);
    }

    if (filters.assigned_departments && filters.assigned_departments.length > 0) {
      query = query.overlaps('assigned_departments', filters.assigned_departments);
    }

    if (filters.assigned_staff && filters.assigned_staff.length > 0) {
      query = query.overlaps('assigned_staff', filters.assigned_staff);
    }

    if (filters.primary_staff_id) {
      query = query.eq('primary_staff_id', filters.primary_staff_id);
    }

    if (filters.search) {
      // For search, we need to join with donum_accounts to search by name/email
      // But we'll fetch fresh data after
      query = query.or(`application_number.ilike.%${filters.search}%`);
      // Note: We'll filter by applicant name/email after fetching fresh applicant data
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching applications:', error);
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }

  // Always fetch fresh applicant data directly to avoid caching
  if (data && data.length > 0) {
    const applicantIds = [...new Set(data.map((app: any) => app.applicant_id).filter(Boolean))];
    const staffIds = [...new Set(data.map((app: any) => app.primary_staff_id).filter(Boolean))];
    const allUserIds = [...new Set([...applicantIds, ...staffIds])];
    
    if (allUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('donum_accounts')
        .select('id, email, first_name, last_name, name')
        .in('id', allUserIds);
      
      if (usersData) {
        const usersMap = new Map(usersData.map((u: any) => [u.id, u]));
        
        data.forEach((app: any) => {
          if (app.applicant_id && usersMap.has(app.applicant_id)) {
            app.applicant = usersMap.get(app.applicant_id);
          }
          if (app.primary_staff_id && usersMap.has(app.primary_staff_id)) {
            app.primary_staff = usersMap.get(app.primary_staff_id);
          }
        });
      }
    }
    
    // Apply search filter on applicant name/email if needed
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return data.filter((app: any) => {
        const applicant = app.applicant;
        if (!applicant) return false;
        return (
          app.application_number?.toLowerCase().includes(searchLower) ||
          applicant.email?.toLowerCase().includes(searchLower) ||
          applicant.first_name?.toLowerCase().includes(searchLower) ||
          applicant.last_name?.toLowerCase().includes(searchLower) ||
          applicant.name?.toLowerCase().includes(searchLower)
        );
      }) as Application[];
    }
  }

  return (data || []) as Application[];
}

export async function getApplication(id: string): Promise<Application | null> {
  const supabase = createSupabaseClient();

  // Fetch application without relationship to avoid caching
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching application:', error);
    throw new Error(`Failed to fetch application: ${error.message}`);
  }

  // Always fetch fresh applicant data directly
  if (data && (data as any).applicant_id) {
    const { data: applicantData, error: applicantError } = await supabase
      .from('donum_accounts')
      .select('id, email, first_name, last_name, name')
      .eq('id', (data as any).applicant_id)
      .single();
    
    if (applicantError) {
      console.error('[Applications API] Error fetching applicant:', applicantError);
    } else if (applicantData) {
      (data as any).applicant = applicantData;
    }
  }

  // Fetch primary staff if exists
  if (data && (data as any).primary_staff_id) {
    const { data: staffData } = await supabase
      .from('donum_accounts')
      .select('id, email, first_name, last_name, name')
      .eq('id', (data as any).primary_staff_id)
      .single();
    
    if (staffData) {
      (data as any).primary_staff = staffData;
    }
  }

  return data as Application;
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to create an application');
  }

  const applicationData: any = {
    applicant_id: input.applicant_id,
    status: input.status || 'draft',
    requested_amount: input.requested_amount || null,
    annual_income: input.annual_income || null,
    net_worth: input.net_worth || null,
    tax_bracket: input.tax_bracket || null,
    risk_tolerance: input.risk_tolerance || null,
    investment_goals: input.investment_goals || {},
    application_type: input.application_type || 'loan',
    purpose: input.purpose || null,
    notes: input.notes || null,
    workflow_data: (input as any).workflow_data || {},
    created_by: user.id,
    updated_by: user.id,
  };

  // Set submitted_at if status is submitted
  if (applicationData.status === 'submitted') {
    applicationData.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('applications')
    .insert(applicationData)
    .select(`
      *,
      applicant:donum_accounts!applications_applicant_id_fkey(id, email, first_name, last_name, name),
      primary_staff:donum_accounts!applications_primary_staff_id_fkey(id, email, first_name, last_name, name)
    `)
    .single();

  if (error) {
    console.error('Error creating application:', error);
    throw new Error(`Failed to create application: ${error.message}`);
  }

  return data as Application;
}

export async function updateApplication(id: string, input: UpdateApplicationInput): Promise<Application> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to update an application');
  }

  const updateData: any = {
    ...input,
    updated_by: user.id,
  };

  // Set timeline fields based on status changes
  if (input.status) {
    const currentApp = await getApplication(id);
    if (currentApp && currentApp.status !== input.status) {
      const now = new Date().toISOString();
      
      switch (input.status) {
        case 'submitted':
          updateData.submitted_at = currentApp.submitted_at || now;
          break;
        case 'under_review':
          updateData.reviewed_at = currentApp.reviewed_at || now;
          break;
        case 'approved':
          updateData.approved_at = currentApp.approved_at || now;
          break;
        case 'rejected':
          updateData.rejected_at = currentApp.rejected_at || now;
          break;
        case 'funded':
          updateData.funded_at = currentApp.funded_at || now;
          break;
        case 'closed':
        case 'cancelled':
          updateData.closed_at = currentApp.closed_at || now;
          break;
      }
    }
  }

  // Update without relationship query to avoid caching
  const { data, error } = await supabase
    .from('applications')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating application:', error);
    throw new Error(`Failed to update application: ${error.message}`);
  }

  // Always fetch fresh applicant data directly with a delay to ensure user update has propagated
  if (data && (data as any).applicant_id) {
    // Small delay to ensure the user update has propagated
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { data: applicantData, error: applicantError } = await supabase
      .from('donum_accounts')
      .select('id, email, first_name, last_name, name')
      .eq('id', (data as any).applicant_id)
      .single();
    
    if (applicantError) {
      console.error('[Applications API] Error fetching applicant:', applicantError);
    } else if (applicantData) {
      (data as any).applicant = applicantData;
    }
  }

  // Fetch primary staff if exists
  if (data && (data as any).primary_staff_id) {
    const { data: staffData } = await supabase
      .from('donum_accounts')
      .select('id, email, first_name, last_name, name')
      .eq('id', (data as any).primary_staff_id)
      .single();
    
    if (staffData) {
      (data as any).primary_staff = staffData;
    }
  }

  return data as Application;
}

export async function deleteApplication(id: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting application:', error);
    throw new Error(`Failed to delete application: ${error.message}`);
  }
}

export async function submitApplication(id: string): Promise<Application> {
  return updateApplication(id, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });
}

export async function approveApplication(id: string): Promise<Application> {
  return updateApplication(id, {
    status: 'approved',
    approved_at: new Date().toISOString(),
  });
}

export async function rejectApplication(id: string, reason: string): Promise<Application> {
  return updateApplication(id, {
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejection_reason: reason,
  });
}

export async function fundApplication(id: string): Promise<Application> {
  return updateApplication(id, {
    status: 'funded',
    funded_at: new Date().toISOString(),
  });
}
