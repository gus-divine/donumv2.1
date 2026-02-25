import { createSupabaseClient } from '../supabase/client';

export interface DepartmentMember {
  id: string;
  department_name: string;
  member_id: string;
  assigned_at: string;
  assigned_by: string | null;
  unassigned_at: string | null;
  unassigned_by: string | null;
  is_active: boolean;
  assignment_notes: string | null;
}

export interface CreateDepartmentMemberInput {
  department_name: string;
  member_id: string;
  assignment_notes?: string;
}

/**
 * Get all active members assigned to a department
 */
export async function getDepartmentMembers(departmentName: string): Promise<DepartmentMember[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('department_members')
    .select('*')
    .eq('department_name', departmentName)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('[Department Members API] Error fetching department members:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      departmentName,
    });
    throw new Error(`Failed to fetch department members: ${error.message}`);
  }

  return data || [];
}

/**
 * Assign a member to a department
 */
export async function assignMemberToDepartment(input: CreateDepartmentMemberInput): Promise<DepartmentMember> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if assignment already exists (active)
  const { data: existing } = await supabase
    .from('department_members')
    .select('id')
    .eq('department_name', input.department_name)
    .eq('member_id', input.member_id)
    .eq('is_active', true)
    .single();

  if (existing) {
    throw new Error('Member is already assigned to this department');
  }

  // Deactivate any existing inactive assignments
  await supabase
    .from('department_members')
    .update({ is_active: false, unassigned_at: null })
    .eq('department_name', input.department_name)
    .eq('member_id', input.member_id)
    .eq('is_active', false);

  const { data, error } = await supabase
    .from('department_members')
    .insert({
      department_name: input.department_name,
      member_id: input.member_id,
      assigned_by: user?.id || null,
      assignment_notes: input.assignment_notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[Department Members API] Error assigning member:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      input,
    });
    throw new Error(`Failed to assign member: ${error.message}`);
  }

  return data;
}

/**
 * Unassign a member from a department (soft delete)
 */
export async function unassignMemberFromDepartment(
  departmentName: string,
  memberId: string
): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('department_members')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      unassigned_by: user?.id || null,
    })
    .eq('department_name', departmentName)
    .eq('member_id', memberId)
    .eq('is_active', true);

  if (error) {
    console.error('[Department Members API] Error unassigning member:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      departmentName,
      memberId,
    });
    throw new Error(`Failed to unassign member: ${error.message}`);
  }
}

/**
 * Get all departments a member is assigned to
 */
export async function getMemberDepartments(memberId: string): Promise<string[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('department_members')
    .select('department_name')
    .eq('member_id', memberId)
    .eq('is_active', true);

  if (error) {
    console.error('[Department Members API] Error fetching member departments:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      memberId,
    });
    throw new Error(`Failed to fetch member departments: ${error.message}`);
  }

  return (data || []).map(d => d.department_name);
}
