import { createSupabaseClient } from '../supabase/client';

export interface ApplicationPlan {
  id: string;
  application_id: string;
  plan_code: string;
  assigned_by: string | null;
  assigned_at: string;
  custom_loan_amount: number | null;
  custom_max_amount: number | null;
  custom_terms: Record<string, any>;
  calculator_results: Record<string, any>;
  last_calculated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationPlanInput {
  application_id: string;
  plan_code: string;
  custom_loan_amount?: number;
  custom_max_amount?: number;
  custom_terms?: Record<string, any>;
  calculator_results?: Record<string, any>;
  notes?: string;
}

export interface UpdateApplicationPlanInput {
  plan_code?: string;
  custom_loan_amount?: number | null;
  custom_max_amount?: number | null;
  custom_terms?: Record<string, any>;
  calculator_results?: Record<string, any>;
  last_calculated_at?: string | null;
  notes?: string | null;
}

/**
 * Get all application plans for a specific application
 */
export async function getApplicationPlansByApplicationId(
  applicationId: string
): Promise<ApplicationPlan[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('application_plans')
    .select('*')
    .eq('application_id', applicationId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching application plans:', error);
    throw new Error(`Failed to fetch application plans: ${error.message}`);
  }

  return (data || []) as ApplicationPlan[];
}

/**
 * Get a specific application plan by ID
 */
export async function getApplicationPlanById(
  id: string
): Promise<ApplicationPlan | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('application_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching application plan:', error);
    throw new Error(`Failed to fetch application plan: ${error.message}`);
  }

  return data as ApplicationPlan;
}

/**
 * Get the active plan for an application (most recently assigned)
 */
export async function getActiveApplicationPlan(
  applicationId: string
): Promise<ApplicationPlan | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('application_plans')
    .select('*')
    .eq('application_id', applicationId)
    .order('assigned_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching active application plan:', error);
    throw new Error(`Failed to fetch active application plan: ${error.message}`);
  }

  // Return the first item if exists, otherwise null
  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as ApplicationPlan;
}

/**
 * Create a new application plan assignment
 */
export async function createApplicationPlan(
  input: CreateApplicationPlanInput
): Promise<ApplicationPlan> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to create an application plan');
  }

  const { data, error } = await supabase
    .from('application_plans')
    .insert({
      application_id: input.application_id,
      plan_code: input.plan_code,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      custom_loan_amount: input.custom_loan_amount || null,
      custom_max_amount: input.custom_max_amount || null,
      custom_terms: input.custom_terms || {},
      calculator_results: input.calculator_results || {},
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating application plan:', error);
    throw new Error(`Failed to create application plan: ${error.message}`);
  }

  return data as ApplicationPlan;
}

/**
 * Update an existing application plan
 */
export async function updateApplicationPlan(
  id: string,
  input: UpdateApplicationPlanInput
): Promise<ApplicationPlan> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to update an application plan');
  }

  const updateData: any = {};
  if (input.plan_code !== undefined) {
    updateData.plan_code = input.plan_code;
    // If changing plan, update assigned_at to reflect new assignment
    updateData.assigned_at = new Date().toISOString();
    updateData.assigned_by = user.id;
  }
  if (input.custom_loan_amount !== undefined) updateData.custom_loan_amount = input.custom_loan_amount;
  if (input.custom_max_amount !== undefined) updateData.custom_max_amount = input.custom_max_amount;
  if (input.custom_terms !== undefined) updateData.custom_terms = input.custom_terms;
  if (input.calculator_results !== undefined) {
    updateData.calculator_results = input.calculator_results;
    updateData.last_calculated_at = new Date().toISOString();
  }
  if (input.last_calculated_at !== undefined) updateData.last_calculated_at = input.last_calculated_at;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('application_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating application plan:', error);
    throw new Error(`Failed to update application plan: ${error.message}`);
  }

  return data as ApplicationPlan;
}

/**
 * Assign or update a plan for an application
 * If a plan already exists for this application, it updates it; otherwise creates a new one
 */
export async function assignPlanToApplication(
  applicationId: string,
  planCode: string,
  customizations?: {
    custom_loan_amount?: number;
    custom_max_amount?: number;
    custom_terms?: Record<string, any>;
    notes?: string;
  }
): Promise<ApplicationPlan> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to assign a plan');
  }

  // Check if a plan already exists for this application
  const existing = await getActiveApplicationPlan(applicationId);

  if (existing) {
    // Update existing plan
    return updateApplicationPlan(existing.id, {
      plan_code: planCode,
      custom_loan_amount: customizations?.custom_loan_amount,
      custom_max_amount: customizations?.custom_max_amount,
      custom_terms: customizations?.custom_terms,
      notes: customizations?.notes,
    });
  } else {
    // Create new plan assignment
    return createApplicationPlan({
      application_id: applicationId,
      plan_code: planCode,
      custom_loan_amount: customizations?.custom_loan_amount,
      custom_max_amount: customizations?.custom_max_amount,
      custom_terms: customizations?.custom_terms,
      notes: customizations?.notes,
    });
  }
}

/**
 * Delete an application plan
 */
export async function deleteApplicationPlan(id: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('application_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting application plan:', error);
    throw new Error(`Failed to delete application plan: ${error.message}`);
  }
}

/**
 * Update calculator results for an application plan
 */
export async function updateCalculatorResults(
  id: string,
  results: Record<string, any>
): Promise<ApplicationPlan> {
  return updateApplicationPlan(id, {
    calculator_results: results,
    last_calculated_at: new Date().toISOString(),
  });
}
