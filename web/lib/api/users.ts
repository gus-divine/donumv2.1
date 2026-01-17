import { createSupabaseClient } from '../supabase/client';

export type UserRole = 
  | 'donum_super_admin'
  | 'donum_admin'
  | 'donum_staff'
  | 'donum_member'
  | 'donum_partner'
  | 'donum_prospect';

export type UserStatus = 
  | 'pending'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'archived';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  first_name: string | null;
  last_name: string | null;
  name: string | null; // Generated field
  avatar_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  cell_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  company: string | null;
  title: string | null;
  job_title: string | null;
  industry: string | null;
  territory: string | null;
  territories: string[] | null;
  license_number: string | null;
  license_state: string | null;
  license_expiry: string | null;
  specializations: string[] | null;
  certifications: Record<string, unknown> | null;
  member_capacity: number | null;
  commission_rate: number | null;
  annual_income: number | null;
  net_worth: number | null;
  tax_bracket: string | null;
  risk_tolerance: string | null;
  investment_goals: Record<string, unknown> | null;
  marital_status: string | null;
  dependents: number | null;
  onboarding_complete: boolean;
  admin_level: string | null;
  departments: string[];
  permissions: Record<string, unknown> | null;
  security_clearance: string | null;
  communication_prefs: Record<string, unknown> | null;
  timezone: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_login_at: string | null;
  login_count: number;
  email_verified: boolean;
  phone_verified: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  privacy_policy_accepted: boolean;
  privacy_policy_accepted_at: string | null;
  metadata: Record<string, unknown> | null;
  notes: string | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  title?: string;
  departments?: string[];
  admin_level?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  cell_phone?: string;
  company?: string;
  title?: string;
  job_title?: string;
  departments?: string[];
  admin_level?: string;
  timezone?: string;
  language?: string;
  notes?: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  search?: string;
}

export async function getUsers(filters?: UserFilters): Promise<User[]> {
  console.log('[Users API] Fetching users...', { filters });
  const supabase = createSupabaseClient();
  
  let query = supabase
    .from('donum_accounts')
    .select('*');

  if (filters?.role) {
    query = query.eq('role', filters.role);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.department) {
    query = query.contains('departments', [filters.department]);
  }

  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase();
    query = query.or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[Users API] Error fetching users:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  console.log('[Users API] Users fetched successfully:', { count: data?.length || 0 });
  return data || [];
}

export async function getUser(id: string): Promise<User | null> {
  console.log('[Users API] Fetching user:', { id });
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('donum_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Users API] Error fetching user:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      id,
    });
    return null;
  }

  console.log('[Users API] User fetched:', { id, email: data?.email });
  return data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  console.log('[Users API] Creating user:', { email: input.email, role: input.role });
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Use API route for admin user creation (handles existing auth users)
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Users API] Error creating user via API:', data);
    throw new Error(data.error || 'Failed to create user');
  }

  console.log('[Users API] User created successfully:', { id: data.id, email: data.email });
  return data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  console.log('[Users API] Updating user:', { id, updates: input });
  const supabase = createSupabaseClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.email !== undefined) updateData.email = input.email;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.first_name !== undefined) updateData.first_name = input.first_name;
  if (input.last_name !== undefined) updateData.last_name = input.last_name;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.cell_phone !== undefined) updateData.cell_phone = input.cell_phone;
  if (input.company !== undefined) updateData.company = input.company;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.job_title !== undefined) updateData.job_title = input.job_title;
  if (input.departments !== undefined) updateData.departments = input.departments;
  if (input.admin_level !== undefined) updateData.admin_level = input.admin_level;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.language !== undefined) updateData.language = input.language;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('donum_accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Users API] Error updating user:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      id,
    });
    throw new Error(`Failed to update user: ${error.message}`);
  }

  console.log('[Users API] User updated successfully:', { id: data.id, email: data.email });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  console.log('[Users API] Deleting user:', { id });
  const supabase = createSupabaseClient();

  // Delete from donum_accounts (this will cascade delete related records)
  // Note: Auth user deletion requires API route with service role key
  // TODO: Create API route /api/admin/users/[id] for proper user deletion
  const { error: accountError } = await supabase
    .from('donum_accounts')
    .delete()
    .eq('id', id);

  if (accountError) {
    console.error('[Users API] Error deleting user account:', {
      message: accountError.message,
      code: accountError.code,
      details: accountError.details,
      hint: accountError.hint,
      id,
    });
    throw new Error(`Failed to delete user: ${accountError.message}`);
  }

  // Note: Auth user deletion should be handled via API route
  // The donum_accounts record is deleted, auth user will need manual cleanup
  // or API route implementation

  console.log('[Users API] User account deleted successfully:', { id });
  console.warn('[Users API] Note: Auth user deletion requires API route with service role key');
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  console.log('[Users API] Updating user password:', { id });
  // Note: Password updates require API route with service role key
  // TODO: Create API route /api/admin/users/[id]/password for password updates
  throw new Error('Password updates require API route with service role key. Not implemented yet.');
}

export const USER_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'donum_super_admin', label: 'Super Admin' },
  { value: 'donum_admin', label: 'Admin' },
  { value: 'donum_staff', label: 'Staff' },
  { value: 'donum_member', label: 'Member' },
  { value: 'donum_partner', label: 'Partner' },
  { value: 'donum_prospect', label: 'Prospect' },
];

export const USER_STATUSES: Array<{ value: UserStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
];
