import { createSupabaseClient } from '../supabase/client';

export interface ProspectStaffAssignment {
  id: string;
  prospect_id: string;
  staff_id: string;
  assigned_at: string;
  assigned_by: string | null;
  unassigned_at: string | null;
  unassigned_by: string | null;
  is_active: boolean;
  is_primary: boolean;
  assignment_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProspectStaffAssignmentInput {
  prospect_id: string;
  staff_id: string;
  is_primary?: boolean;
  assignment_notes?: string;
}

export interface UpdateProspectStaffAssignmentInput {
  is_primary?: boolean;
  assignment_notes?: string;
}

/**
 * Get all active staff assignments for a prospect
 */
export async function getProspectStaffAssignments(prospectId: string): Promise<ProspectStaffAssignment[]> {
  console.log('[Prospect Staff Assignments API] Fetching assignments for prospect:', { prospectId });
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('prospect_staff_assignments')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('[Prospect Staff Assignments API] Error fetching assignments:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      prospectId,
    });
    throw new Error(`Failed to fetch prospect staff assignments: ${error.message}`);
  }

  console.log('[Prospect Staff Assignments API] Assignments fetched:', { prospectId, count: data?.length || 0 });
  return data || [];
}

/**
 * Get all prospects assigned to a staff member
 */
export async function getStaffProspectAssignments(staffId: string): Promise<ProspectStaffAssignment[]> {
  console.log('[Prospect Staff Assignments API] Fetching assignments for staff:', { staffId });
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('prospect_staff_assignments')
    .select('*')
    .eq('staff_id', staffId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('[Prospect Staff Assignments API] Error fetching staff assignments:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      staffId,
    });
    throw new Error(`Failed to fetch staff prospect assignments: ${error.message}`);
  }

  return data || [];
}

/**
 * Assign a staff member to a prospect
 */
export async function assignStaffToProspect(input: CreateProspectStaffAssignmentInput): Promise<ProspectStaffAssignment> {
  console.log('[Prospect Staff Assignments API] Assigning staff to prospect:', { 
    prospectId: input.prospect_id, 
    staffId: input.staff_id,
    isPrimary: input.is_primary 
  });
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If setting as primary, unset any existing primary assignment
  if (input.is_primary) {
    const { error: unsetError } = await supabase
      .from('prospect_staff_assignments')
      .update({ is_primary: false })
      .eq('prospect_id', input.prospect_id)
      .eq('is_active', true)
      .eq('is_primary', true);

    if (unsetError) {
      console.error('[Prospect Staff Assignments API] Error unsetting primary:', unsetError);
      throw new Error(`Failed to unset existing primary assignment: ${unsetError.message}`);
    }
  }

  // Check if assignment already exists (active)
  const { data: existing } = await supabase
    .from('prospect_staff_assignments')
    .select('id')
    .eq('prospect_id', input.prospect_id)
    .eq('staff_id', input.staff_id)
    .eq('is_active', true)
    .single();

  if (existing) {
    // Update existing assignment instead of creating duplicate
    const { data, error } = await supabase
      .from('prospect_staff_assignments')
      .update({
        is_primary: input.is_primary || false,
        assignment_notes: input.assignment_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[Prospect Staff Assignments API] Error updating assignment:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        input,
      });
      throw new Error(`Failed to update assignment: ${error.message}`);
    }

    console.log('[Prospect Staff Assignments API] Assignment updated:', { id: data.id });
    return data;
  }

  // Create new assignment
  const { data, error } = await supabase
    .from('prospect_staff_assignments')
    .insert({
      prospect_id: input.prospect_id,
      staff_id: input.staff_id,
      assigned_by: user?.id || null,
      is_primary: input.is_primary || false,
      assignment_notes: input.assignment_notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[Prospect Staff Assignments API] Error creating assignment:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      input,
    });
    throw new Error(`Failed to assign staff: ${error.message}`);
  }

  console.log('[Prospect Staff Assignments API] Assignment created:', { id: data.id });
  return data;
}

/**
 * Update a prospect-staff assignment
 */
export async function updateProspectStaffAssignment(
  assignmentId: string,
  input: UpdateProspectStaffAssignmentInput
): Promise<ProspectStaffAssignment> {
  console.log('[Prospect Staff Assignments API] Updating assignment:', { assignmentId, input });
  const supabase = createSupabaseClient();

  // If setting as primary, unset any existing primary assignment for this prospect
  if (input.is_primary) {
    const { data: currentAssignment } = await supabase
      .from('prospect_staff_assignments')
      .select('prospect_id')
      .eq('id', assignmentId)
      .single();

    if (currentAssignment) {
      const { error: unsetError } = await supabase
        .from('prospect_staff_assignments')
        .update({ is_primary: false })
        .eq('prospect_id', currentAssignment.prospect_id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .neq('id', assignmentId);

      if (unsetError) {
        console.error('[Prospect Staff Assignments API] Error unsetting primary:', unsetError);
        throw new Error(`Failed to unset existing primary assignment: ${unsetError.message}`);
      }
    }
  }

  const { data, error } = await supabase
    .from('prospect_staff_assignments')
    .update({
      is_primary: input.is_primary !== undefined ? input.is_primary : undefined,
      assignment_notes: input.assignment_notes !== undefined ? input.assignment_notes : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('[Prospect Staff Assignments API] Error updating assignment:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      assignmentId,
      input,
    });
    throw new Error(`Failed to update assignment: ${error.message}`);
  }

  console.log('[Prospect Staff Assignments API] Assignment updated:', { id: data.id });
  return data;
}

/**
 * Unassign a staff member from a prospect (soft delete via trigger)
 */
export async function unassignStaffFromProspect(
  prospectId: string,
  staffId: string
): Promise<void> {
  console.log('[Prospect Staff Assignments API] Unassigning staff from prospect:', { 
    prospectId, 
    staffId 
  });
  const supabase = createSupabaseClient();

  // Find the active assignment
  const { data: assignment } = await supabase
    .from('prospect_staff_assignments')
    .select('id')
    .eq('prospect_id', prospectId)
    .eq('staff_id', staffId)
    .eq('is_active', true)
    .single();

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  // Delete will trigger soft-delete (sets is_active = false, unassigned_at = NOW())
  const { error } = await supabase
    .from('prospect_staff_assignments')
    .delete()
    .eq('id', assignment.id);

  if (error) {
    console.error('[Prospect Staff Assignments API] Error unassigning staff:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      prospectId,
      staffId,
    });
    throw new Error(`Failed to unassign staff: ${error.message}`);
  }

  console.log('[Prospect Staff Assignments API] Staff unassigned successfully');
}

/**
 * Get primary staff for a prospect
 */
export async function getPrimaryStaffForProspect(prospectId: string): Promise<ProspectStaffAssignment | null> {
  console.log('[Prospect Staff Assignments API] Fetching primary staff for prospect:', { prospectId });
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('prospect_staff_assignments')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('is_active', true)
    .eq('is_primary', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - no primary staff assigned
      return null;
    }
    console.error('[Prospect Staff Assignments API] Error fetching primary staff:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      prospectId,
    });
    throw new Error(`Failed to fetch primary staff: ${error.message}`);
  }

  return data;
}
