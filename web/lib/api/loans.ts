import { createSupabaseClient } from '@/lib/supabase/client';
import {
  generateAmortizationSchedule,
  calculateMaturityDate,
  formatDateString,
  type AmortizationSchedule,
} from '@/lib/utils/loan-calculations';

const supabase = createSupabaseClient();

export type LoanStatus = 'pending' | 'active' | 'paid_off' | 'defaulted' | 'cancelled' | 'closed';
export type PaymentStatus = 'pending' | 'scheduled' | 'paid' | 'overdue' | 'missed' | 'cancelled';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Loan {
  id: string;
  loan_number: string;
  application_id: string;
  applicant_id: string;
  plan_code: string | null;
  status: LoanStatus;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  payment_frequency: PaymentFrequency;
  current_balance: number;
  total_paid: number;
  total_interest_paid: number;
  total_principal_paid: number;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  disbursed_at: string | null;
  maturity_date: string | null;
  paid_off_at: string | null;
  closed_at: string | null;
  assigned_departments: string[];
  assigned_staff: string[];
  primary_staff_id: string | null;
  amortization_schedule: Record<string, any>;
  loan_terms: Record<string, any>;
  notes: string | null;
  internal_notes: string | null;
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
    status: string;
  };
  plan?: {
    code: string;
    name: string;
  };
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  payment_number: number;
  status: PaymentStatus;
  scheduled_date: string;
  due_date: string;
  paid_date: string | null;
  amount_due: number;
  principal_amount: number;
  interest_amount: number;
  amount_paid: number;
  late_fee: number;
  penalty_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  processed_by: string | null;
}

export interface LoanFilters {
  search?: string;
  status?: LoanStatus;
  applicant_id?: string;
  application_id?: string;
  plan_code?: string;
  department?: string;
}

export interface CreateLoanInput {
  application_id: string;
  applicant_id: string;
  plan_code?: string | null;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  payment_frequency?: PaymentFrequency;
  assigned_departments?: string[];
  assigned_staff?: string[];
  primary_staff_id?: string | null;
  notes?: string;
  internal_notes?: string;
  loan_terms?: Record<string, any>;
}

export interface UpdateLoanInput {
  status?: LoanStatus;
  current_balance?: number;
  total_paid?: number;
  total_interest_paid?: number;
  total_principal_paid?: number;
  next_payment_date?: string | null;
  next_payment_amount?: number | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  disbursed_at?: string | null;
  maturity_date?: string | null;
  paid_off_at?: string | null;
  closed_at?: string | null;
  assigned_departments?: string[];
  assigned_staff?: string[];
  primary_staff_id?: string | null;
  amortization_schedule?: Record<string, any>;
  loan_terms?: Record<string, any>;
  notes?: string;
  internal_notes?: string;
}

export interface CreatePaymentInput {
  loan_id: string;
  payment_number: number;
  scheduled_date: string;
  due_date: string;
  amount_due: number;
  principal_amount: number;
  interest_amount: number;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}

export interface UpdatePaymentInput {
  status?: PaymentStatus;
  paid_date?: string | null;
  amount_paid?: number;
  late_fee?: number;
  penalty_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}

/**
 * Get all loans with optional filters
 */
export async function getLoans(filters?: LoanFilters): Promise<Loan[]> {
  let query = supabase
    .from('loans')
    .select(`
      *,
      applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!loans_application_id_fkey(id, application_number, status),
      plan:donum_plans!loans_plan_code_fkey(code, name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`loan_number.ilike.%${filters.search}%,applicant:donum_accounts.email.ilike.%${filters.search}%`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.applicant_id) {
    query = query.eq('applicant_id', filters.applicant_id);
  }

  if (filters?.application_id) {
    query = query.eq('application_id', filters.application_id);
  }

  if (filters?.plan_code) {
    query = query.eq('plan_code', filters.plan_code);
  }

  if (filters?.department) {
    query = query.contains('assigned_departments', [filters.department]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getLoans] Error:', error);
    throw new Error(`Failed to fetch loans: ${error.message}`);
  }

  return (data || []) as Loan[];
}

/**
 * Get a single loan by ID
 */
export async function getLoanById(loanId: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from('loans')
    .select(`
      *,
      applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!loans_application_id_fkey(id, application_number, status),
      plan:donum_plans!loans_plan_code_fkey(code, name)
    `)
    .eq('id', loanId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[getLoanById] Error:', error);
    throw new Error(`Failed to fetch loan: ${error.message}`);
  }

  return data as Loan;
}

/**
 * Get loans by application ID
 */
export async function getLoansByApplicationId(applicationId: string): Promise<Loan[]> {
  return getLoans({ application_id: applicationId });
}

/**
 * Get loans by applicant ID
 */
export async function getLoansByApplicantId(applicantId: string): Promise<Loan[]> {
  return getLoans({ applicant_id: applicantId });
}

/**
 * Create payment records for a loan
 */
async function createPaymentSchedule(
  loanId: string,
  schedule: AmortizationSchedule
): Promise<LoanPayment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create payments');
  }

  const payments = schedule.payments.map((payment) => ({
    loan_id: loanId,
    payment_number: payment.paymentNumber,
    status: 'scheduled' as PaymentStatus,
    scheduled_date: payment.scheduledDate,
    due_date: payment.dueDate,
    amount_due: payment.amountDue,
    principal_amount: payment.principalAmount,
    interest_amount: payment.interestAmount,
    amount_paid: 0,
    processed_by: user.id,
  }));

  const { data, error } = await supabase
    .from('loan_payments')
    .insert(payments)
    .select('*');

  if (error) {
    console.error('[createPaymentSchedule] Error:', error);
    throw new Error(`Failed to create payment schedule: ${error.message}`);
  }

  return (data || []) as LoanPayment[];
}

/**
 * Create a new loan and generate payment schedule
 */
export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create loans');
  }

  const paymentFrequency = input.payment_frequency || 'monthly';
  const startDate = new Date();
  
  // Generate amortization schedule
  const amortizationSchedule = generateAmortizationSchedule(
    input.principal_amount,
    input.interest_rate,
    input.term_months,
    paymentFrequency,
    startDate
  );

  // Calculate maturity date
  const maturityDate = calculateMaturityDate(startDate, input.term_months);

  // Get first payment info
  const firstPayment = amortizationSchedule.payments[0];

  const loanData = {
    ...input,
    payment_frequency: paymentFrequency,
    current_balance: input.principal_amount,
    assigned_departments: input.assigned_departments || [],
    assigned_staff: input.assigned_staff || [],
    loan_terms: input.loan_terms || {},
    amortization_schedule: amortizationSchedule as any, // JSONB field - store full schedule object
    next_payment_date: firstPayment ? firstPayment.dueDate : null,
    next_payment_amount: firstPayment ? firstPayment.amountDue : null,
    maturity_date: formatDateString(maturityDate),
    created_by: user.id,
  };

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert(loanData)
    .select(`
      *,
      applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!loans_application_id_fkey(id, application_number, status),
      plan:donum_plans!loans_plan_code_fkey(code, name)
    `)
    .single();

  if (loanError) {
    console.error('[createLoan] Error:', loanError);
    throw new Error(`Failed to create loan: ${loanError.message}`);
  }

  // Create payment schedule
  try {
    await createPaymentSchedule(loan.id, amortizationSchedule);
  } catch (paymentError) {
    console.error('[createLoan] Error creating payment schedule:', paymentError);
    // Don't fail loan creation if payment schedule fails - can be created manually later
    // But log the error for debugging
  }

  return loan as Loan;
}

/**
 * Update a loan
 */
export async function updateLoan(loanId: string, input: UpdateLoanInput): Promise<Loan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update loans');
  }

  const updateData = {
    ...input,
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from('loans')
    .update(updateData)
    .eq('id', loanId)
    .select(`
      *,
      applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name),
      application:applications!loans_application_id_fkey(id, application_number, status),
      plan:donum_plans!loans_plan_code_fkey(code, name)
    `)
    .single();

  if (error) {
    console.error('[updateLoan] Error:', error);
    throw new Error(`Failed to update loan: ${error.message}`);
  }

  return data as Loan;
}

/**
 * Delete a loan (soft delete by setting status to cancelled)
 */
export async function deleteLoan(loanId: string): Promise<void> {
  await updateLoan(loanId, { status: 'cancelled', closed_at: new Date().toISOString() });
}

/**
 * Get payments for a loan
 */
export async function getLoanPayments(loanId: string): Promise<LoanPayment[]> {
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_number', { ascending: true });

  if (error) {
    console.error('[getLoanPayments] Error:', error);
    throw new Error(`Failed to fetch loan payments: ${error.message}`);
  }

  return (data || []) as LoanPayment[];
}

/**
 * Create a payment
 */
export async function createPayment(input: CreatePaymentInput): Promise<LoanPayment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create payments');
  }

  const paymentData = {
    ...input,
    processed_by: user.id,
  };

  const { data, error } = await supabase
    .from('loan_payments')
    .insert(paymentData)
    .select('*')
    .single();

  if (error) {
    console.error('[createPayment] Error:', error);
    throw new Error(`Failed to create payment: ${error.message}`);
  }

  return data as LoanPayment;
}

/**
 * Update a payment
 */
export async function updatePayment(paymentId: string, input: UpdatePaymentInput): Promise<LoanPayment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update payments');
  }

  const updateData = {
    ...input,
    processed_by: user.id,
  };

  const { data, error } = await supabase
    .from('loan_payments')
    .update(updateData)
    .eq('id', paymentId)
    .select('*')
    .single();

  if (error) {
    console.error('[updatePayment] Error:', error);
    throw new Error(`Failed to update payment: ${error.message}`);
  }

  return data as LoanPayment;
}

/**
 * Record a payment (mark as paid)
 */
export async function recordPayment(
  paymentId: string,
  amountPaid: number,
  paidDate?: string,
  paymentMethod?: string,
  paymentReference?: string
): Promise<LoanPayment> {
  return updatePayment(paymentId, {
    status: 'paid',
    amount_paid: amountPaid,
    paid_date: paidDate || new Date().toISOString().split('T')[0],
    payment_method: paymentMethod,
    payment_reference: paymentReference,
  });
}
