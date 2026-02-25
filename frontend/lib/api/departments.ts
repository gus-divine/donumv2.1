import { createSupabaseClient } from '../supabase/client';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  prospect_assignment_enabled?: boolean; // New field name
  member_assignment_enabled?: boolean; // New field
  lead_assignment_enabled?: boolean; // Legacy field name (for backward compatibility)
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DepartmentPagePermission {
  id: string;
  department_name: string;
  page_path: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  prospect_assignment_enabled?: boolean;
  member_assignment_enabled?: boolean;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  prospect_assignment_enabled?: boolean;
  member_assignment_enabled?: boolean;
}

export async function getDepartments(): Promise<Department[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[Departments API] Error fetching departments:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to fetch departments: ${error.message}`);
  }

  return data || [];
}

export async function getDepartment(id: string): Promise<Department | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Departments API] Error fetching department:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      id,
    });
    return null;
  }

  return data;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: input.name,
      description: input.description || null,
      color: input.color || '#6366F1',
      icon: input.icon || 'users',
      is_active: input.is_active !== undefined ? input.is_active : true,
      prospect_assignment_enabled: input.prospect_assignment_enabled !== undefined ? input.prospect_assignment_enabled : true,
      member_assignment_enabled: input.member_assignment_enabled !== undefined ? input.member_assignment_enabled : true,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Departments API] Error creating department:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      input: { name: input.name },
    });
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return data;
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Department> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: Record<string, unknown> = {
    updated_by: user?.id || null,
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.prospect_assignment_enabled !== undefined) updateData.prospect_assignment_enabled = input.prospect_assignment_enabled;
  if (input.member_assignment_enabled !== undefined) updateData.member_assignment_enabled = input.member_assignment_enabled;

  const { data, error } = await supabase
    .from('departments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Departments API] Error updating department:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      id,
    });
    throw new Error(`Failed to update department: ${error.message}`);
  }

  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Departments API] Error deleting department:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      id,
    });
    throw new Error(`Failed to delete department: ${error.message}`);
  }
}

export async function getDepartmentPermissions(departmentName: string): Promise<DepartmentPagePermission[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('department_page_permissions')
    .select('*')
    .eq('department_name', departmentName)
    .order('page_path', { ascending: true });

  if (error) {
    console.error('[Departments API] Error fetching department permissions:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      departmentName,
    });
    throw new Error(`Failed to fetch permissions: ${error.message}`);
  }

  return data || [];
}

export async function updateDepartmentPermissions(
  departmentName: string,
  permissions: Array<{
    page_path: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>
): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  for (const perm of permissions) {
    const { error } = await supabase
      .from('department_page_permissions')
      .upsert({
        department_name: departmentName,
        page_path: perm.page_path,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'department_name,page_path',
      });

    if (error) {
      console.error('[Departments API] Error updating permission:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        page: perm.page_path,
        departmentName,
      });
      throw new Error(`Failed to update permissions: ${error.message}`);
    }
  }
}

export const ADMIN_PAGES = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/staff', label: 'Staff' },
  { path: '/admin/members', label: 'Members' },
  { path: '/admin/applications', label: 'Applications' },
  { path: '/admin/loans', label: 'Loans' },
  { path: '/admin/departments', label: 'Departments' },
  { path: '/admin/finance', label: 'Finance' },
  { path: '/admin/system', label: 'System' },
] as const;
