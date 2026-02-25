import { createSupabaseClient } from '../supabase/client';

export interface DonumPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  min_income: number | null;
  min_assets: number | null;
  min_age: number | null;
  required_asset_types: string[] | null;
  requires_charitable_intent: boolean;
  tax_deduction_percent: number;
  benefits: string[];
  calculator_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  min_income?: number;
  min_assets?: number;
  min_age?: number;
  required_asset_types?: string[];
  requires_charitable_intent?: boolean;
  tax_deduction_percent: number;
  benefits?: string[];
  calculator_config?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  min_income?: number;
  min_assets?: number;
  min_age?: number;
  required_asset_types?: string[];
  requires_charitable_intent?: boolean;
  tax_deduction_percent?: number;
  benefits?: string[];
  calculator_config?: Record<string, any>;
  is_active?: boolean;
}

export async function getAllPlans(includeInactive = false): Promise<DonumPlan[]> {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('donum_plans')
    .select('*')
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching plans:', error);
    throw new Error(`Failed to fetch plans: ${error.message}`);
  }

  return (data || []) as DonumPlan[];
}

export async function getPlanByCode(code: string): Promise<DonumPlan | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('donum_plans')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching plan:', error);
    throw new Error(`Failed to fetch plan: ${error.message}`);
  }

  return data as DonumPlan;
}

export async function getPlanById(id: string): Promise<DonumPlan | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('donum_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching plan:', error);
    throw new Error(`Failed to fetch plan: ${error.message}`);
  }

  return data as DonumPlan;
}

export async function createPlan(input: CreatePlanInput): Promise<DonumPlan> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to create a plan');
  }

  const { data, error } = await supabase
    .from('donum_plans')
    .insert({
      code: input.code,
      name: input.name,
      description: input.description || null,
      min_income: input.min_income || null,
      min_assets: input.min_assets || null,
      min_age: input.min_age || null,
      required_asset_types: input.required_asset_types || null,
      requires_charitable_intent: input.requires_charitable_intent ?? true,
      tax_deduction_percent: input.tax_deduction_percent,
      benefits: input.benefits || [],
      calculator_config: input.calculator_config || {},
      is_active: input.is_active ?? true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating plan:', error);
    throw new Error(`Failed to create plan: ${error.message}`);
  }

  return data as DonumPlan;
}

export async function updatePlan(id: string, input: UpdatePlanInput): Promise<DonumPlan> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be authenticated to update a plan');
  }

  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.min_income !== undefined) updateData.min_income = input.min_income;
  if (input.min_assets !== undefined) updateData.min_assets = input.min_assets;
  if (input.min_age !== undefined) updateData.min_age = input.min_age;
  if (input.required_asset_types !== undefined) updateData.required_asset_types = input.required_asset_types;
  if (input.requires_charitable_intent !== undefined) updateData.requires_charitable_intent = input.requires_charitable_intent;
  if (input.tax_deduction_percent !== undefined) updateData.tax_deduction_percent = input.tax_deduction_percent;
  if (input.benefits !== undefined) updateData.benefits = input.benefits;
  if (input.calculator_config !== undefined) updateData.calculator_config = input.calculator_config;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('donum_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating plan:', error);
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  return data as DonumPlan;
}

export async function deletePlan(id: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('donum_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting plan:', error);
    throw new Error(`Failed to delete plan: ${error.message}`);
  }
}
