import { createSupabaseClient } from '@/lib/supabase/client';

const supabase = createSupabaseClient();

export interface FinancialMetrics {
  totalLoansOutstanding: number;
  totalPrincipalDisbursed: number;
  totalPaymentsReceived: number;
  totalInterestCollected: number;
  activeLoansCount: number;
  overduePaymentsCount: number;
  overduePaymentsAmount: number;
  averageLoanSize: number;
  collectionRate: number;
  defaultRate: number;
}

export interface PaymentTrend {
  date: string;
  amount: number;
  count: number;
}

export interface LoanStatusDistribution {
  status: string;
  count: number;
  totalAmount: number;
}

export interface PaymentStatusDistribution {
  status: string;
  count: number;
  totalAmount: number;
}

export interface UpcomingPayment {
  id: string;
  loan_id: string;
  loan_number: string;
  borrower_name: string;
  due_date: string;
  amount_due: number;
  status: string;
}

export interface RecentPayment {
  id: string;
  loan_id: string;
  loan_number: string;
  borrower_name: string;
  paid_date: string;
  amount_paid: number;
  payment_method: string | null;
}

/**
 * Get comprehensive financial metrics
 */
export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  // Get total loans outstanding (active loans)
  const { data: activeLoans, error: activeError } = await supabase
    .from('loans')
    .select('current_balance, principal_amount, status')
    .eq('status', 'active');

  if (activeError) {
    console.error('[getFinancialMetrics] Error fetching active loans:', activeError);
    throw new Error(`Failed to fetch active loans: ${activeError.message}`);
  }

  const totalLoansOutstanding = (activeLoans || []).reduce(
    (sum, loan) => sum + (loan.current_balance || 0),
    0
  );

  const activeLoansCount = activeLoans?.length || 0;

  // Get all loans for principal disbursed
  const { data: allLoans, error: allLoansError } = await supabase
    .from('loans')
    .select('principal_amount, status');

  if (allLoansError) {
    console.error('[getFinancialMetrics] Error fetching all loans:', allLoansError);
    throw new Error(`Failed to fetch all loans: ${allLoansError.message}`);
  }

  const totalPrincipalDisbursed = (allLoans || []).reduce(
    (sum, loan) => sum + (loan.principal_amount || 0),
    0
  );

  const totalLoans = allLoans?.length || 0;
  const averageLoanSize = totalLoans > 0 ? totalPrincipalDisbursed / totalLoans : 0;

  const defaultedLoans = (allLoans || []).filter(loan => loan.status === 'defaulted').length;
  const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;

  // Get total payments received
  const { data: paidPayments, error: paymentsError } = await supabase
    .from('loan_payments')
    .select('amount_paid, amount_due')
    .eq('status', 'paid');

  if (paymentsError) {
    console.error('[getFinancialMetrics] Error fetching payments:', paymentsError);
    throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
  }

  const totalPaymentsReceived = (paidPayments || []).reduce(
    (sum, payment) => sum + (payment.amount_paid || 0),
    0
  );

  const totalAmountDue = (paidPayments || []).reduce(
    (sum, payment) => sum + (payment.amount_due || 0),
    0
  );
  const collectionRate = totalAmountDue > 0 ? (totalPaymentsReceived / totalAmountDue) * 100 : 0;

  // Get total interest collected
  const { data: loansWithInterest, error: interestError } = await supabase
    .from('loans')
    .select('total_interest_paid');

  if (interestError) {
    console.error('[getFinancialMetrics] Error fetching interest:', interestError);
    throw new Error(`Failed to fetch interest: ${interestError.message}`);
  }

  const totalInterestCollected = (loansWithInterest || []).reduce(
    (sum, loan) => sum + (loan.total_interest_paid || 0),
    0
  );

  // Get overdue payments
  const { data: overduePayments, error: overdueError } = await supabase
    .from('loan_payments')
    .select('amount_due')
    .eq('status', 'overdue');

  if (overdueError) {
    console.error('[getFinancialMetrics] Error fetching overdue payments:', overdueError);
    throw new Error(`Failed to fetch overdue payments: ${overdueError.message}`);
  }

  const overduePaymentsCount = overduePayments?.length || 0;
  const overduePaymentsAmount = (overduePayments || []).reduce(
    (sum, payment) => sum + (payment.amount_due || 0),
    0
  );

  return {
    totalLoansOutstanding,
    totalPrincipalDisbursed,
    totalPaymentsReceived,
    totalInterestCollected,
    activeLoansCount,
    overduePaymentsCount,
    overduePaymentsAmount,
    averageLoanSize,
    collectionRate,
    defaultRate,
  };
}

/**
 * Get payment revenue trends over time
 */
export async function getPaymentTrends(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<PaymentTrend[]> {
  const { data, error } = await supabase
    .from('loan_payments')
    .select('paid_date, amount_paid')
    .eq('status', 'paid')
    .gte('paid_date', startDate.toISOString().split('T')[0])
    .lte('paid_date', endDate.toISOString().split('T')[0])
    .order('paid_date', { ascending: true });

  if (error) {
    console.error('[getPaymentTrends] Error:', error);
    throw new Error(`Failed to fetch payment trends: ${error.message}`);
  }

  // Group by date
  const grouped = new Map<string, { amount: number; count: number }>();

  (data || []).forEach((payment) => {
    if (!payment.paid_date) return;

    let key: string;
    const date = new Date(payment.paid_date);

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = grouped.get(key) || { amount: 0, count: 0 };
    grouped.set(key, {
      amount: existing.amount + (payment.amount_paid || 0),
      count: existing.count + 1,
    });
  });

  return Array.from(grouped.entries())
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get loan status distribution
 */
export async function getLoanStatusDistribution(): Promise<LoanStatusDistribution[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('status, principal_amount');

  if (error) {
    console.error('[getLoanStatusDistribution] Error:', error);
    throw new Error(`Failed to fetch loan status distribution: ${error.message}`);
  }

  const grouped = new Map<string, { count: number; totalAmount: number }>();

  (data || []).forEach((loan) => {
    const existing = grouped.get(loan.status) || { count: 0, totalAmount: 0 };
    grouped.set(loan.status, {
      count: existing.count + 1,
      totalAmount: existing.totalAmount + (loan.principal_amount || 0),
    });
  });

  return Array.from(grouped.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalAmount: data.totalAmount,
  }));
}

/**
 * Get payment status distribution
 */
export async function getPaymentStatusDistribution(): Promise<PaymentStatusDistribution[]> {
  const { data, error } = await supabase
    .from('loan_payments')
    .select('status, amount_due');

  if (error) {
    console.error('[getPaymentStatusDistribution] Error:', error);
    throw new Error(`Failed to fetch payment status distribution: ${error.message}`);
  }

  const grouped = new Map<string, { count: number; totalAmount: number }>();

  (data || []).forEach((payment) => {
    const existing = grouped.get(payment.status) || { count: 0, totalAmount: 0 };
    grouped.set(payment.status, {
      count: existing.count + 1,
      totalAmount: existing.totalAmount + (payment.amount_due || 0),
    });
  });

  return Array.from(grouped.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalAmount: data.totalAmount,
  }));
}

/**
 * Get upcoming payments (next 7 days)
 */
export async function getUpcomingPayments(): Promise<UpcomingPayment[]> {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const { data, error } = await supabase
    .from('loan_payments')
    .select(`
      id,
      loan_id,
      due_date,
      amount_due,
      status,
      loan:loans!loan_payments_loan_id_fkey(
        loan_number,
        applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name)
      )
    `)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', nextWeek.toISOString().split('T')[0])
    .in('status', ['scheduled', 'pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[getUpcomingPayments] Error:', error);
    throw new Error(`Failed to fetch upcoming payments: ${error.message}`);
  }

  return (data || []).map((payment: any) => {
    const applicant = payment.loan?.applicant;
    const borrowerName = applicant
      ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email || 'Unknown'
      : 'Unknown';

    return {
      id: payment.id,
      loan_id: payment.loan_id,
      loan_number: payment.loan?.loan_number || 'N/A',
      borrower_name: borrowerName,
      due_date: payment.due_date,
      amount_due: payment.amount_due || 0,
      status: payment.status,
    };
  });
}

/**
 * Get recent payments (last 10)
 */
export async function getRecentPayments(): Promise<RecentPayment[]> {
  const { data, error } = await supabase
    .from('loan_payments')
    .select(`
      id,
      loan_id,
      paid_date,
      amount_paid,
      payment_method,
      loan:loans!loan_payments_loan_id_fkey(
        loan_number,
        applicant:donum_accounts!loans_applicant_id_fkey(id, email, first_name, last_name)
      )
    `)
    .eq('status', 'paid')
    .not('paid_date', 'is', null)
    .order('paid_date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[getRecentPayments] Error:', error);
    throw new Error(`Failed to fetch recent payments: ${error.message}`);
  }

  return (data || []).map((payment: any) => {
    const applicant = payment.loan?.applicant;
    const borrowerName = applicant
      ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email || 'Unknown'
      : 'Unknown';

    return {
      id: payment.id,
      loan_id: payment.loan_id,
      loan_number: payment.loan?.loan_number || 'N/A',
      borrower_name: borrowerName,
      paid_date: payment.paid_date || '',
      amount_paid: payment.amount_paid || 0,
      payment_method: payment.payment_method || null,
    };
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
