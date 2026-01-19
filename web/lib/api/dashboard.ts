import { createSupabaseClient } from '@/lib/supabase/client';

const supabase = createSupabaseClient();

export interface DashboardStats {
  // User counts
  totalUsers: number;
  totalProspects: number;
  totalMembers: number;
  totalStaff: number;
  activeUsers: number;
  
  // Application counts
  totalApplications: number;
  pendingApplications: number;
  underReviewApplications: number;
  approvedApplications: number;
  fundedApplications: number;
  
  // Loan counts
  totalLoans: number;
  activeLoans: number;
  paidOffLoans: number;
  defaultedLoans: number;
  
  // Payment stats
  totalPayments: number;
  overduePayments: number;
  scheduledPayments: number;
  
  // Department counts
  totalDepartments: number;
  activeDepartments: number;
}

export interface RecentActivity {
  id: string;
  type: 'application' | 'loan' | 'payment' | 'user';
  title: string;
  description: string;
  timestamp: string;
  link?: string;
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Get user counts
  const { data: allUsers, error: usersError } = await supabase
    .from('donum_accounts')
    .select('role, status');

  if (usersError) {
    console.error('[getDashboardStats] Error fetching users:', usersError);
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  const totalUsers = allUsers?.length || 0;
  const totalProspects = (allUsers || []).filter(u => u.role === 'donum_prospect').length;
  const totalMembers = (allUsers || []).filter(u => u.role === 'donum_member').length;
  const totalStaff = (allUsers || []).filter(u => ['donum_staff', 'donum_admin', 'donum_super_admin'].includes(u.role)).length;
  const activeUsers = (allUsers || []).filter(u => u.status === 'active').length;

  // Get application counts
  const { data: allApplications, error: applicationsError } = await supabase
    .from('applications')
    .select('status');

  if (applicationsError) {
    console.error('[getDashboardStats] Error fetching applications:', applicationsError);
    throw new Error(`Failed to fetch applications: ${applicationsError.message}`);
  }

  const totalApplications = allApplications?.length || 0;
  const pendingApplications = (allApplications || []).filter(a => ['draft', 'submitted'].includes(a.status)).length;
  const underReviewApplications = (allApplications || []).filter(a => ['under_review', 'document_collection'].includes(a.status)).length;
  const approvedApplications = (allApplications || []).filter(a => a.status === 'approved').length;
  const fundedApplications = (allApplications || []).filter(a => a.status === 'funded').length;

  // Get loan counts
  const { data: allLoans, error: loansError } = await supabase
    .from('loans')
    .select('status');

  if (loansError) {
    console.error('[getDashboardStats] Error fetching loans:', loansError);
    throw new Error(`Failed to fetch loans: ${loansError.message}`);
  }

  const totalLoans = allLoans?.length || 0;
  const activeLoans = (allLoans || []).filter(l => l.status === 'active').length;
  const paidOffLoans = (allLoans || []).filter(l => l.status === 'paid_off').length;
  const defaultedLoans = (allLoans || []).filter(l => l.status === 'defaulted').length;

  // Get payment counts
  const { data: allPayments, error: paymentsError } = await supabase
    .from('loan_payments')
    .select('status');

  if (paymentsError) {
    console.error('[getDashboardStats] Error fetching payments:', paymentsError);
    throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
  }

  const totalPayments = allPayments?.length || 0;
  const overduePayments = (allPayments || []).filter(p => p.status === 'overdue').length;
  const scheduledPayments = (allPayments || []).filter(p => p.status === 'scheduled').length;

  // Get department counts
  const { data: allDepartments, error: departmentsError } = await supabase
    .from('departments')
    .select('is_active');

  if (departmentsError) {
    console.error('[getDashboardStats] Error fetching departments:', departmentsError);
    throw new Error(`Failed to fetch departments: ${departmentsError.message}`);
  }

  const totalDepartments = allDepartments?.length || 0;
  const activeDepartments = (allDepartments || []).filter(d => d.is_active).length;

  return {
    totalUsers,
    totalProspects,
    totalMembers,
    totalStaff,
    activeUsers,
    totalApplications,
    pendingApplications,
    underReviewApplications,
    approvedApplications,
    fundedApplications,
    totalLoans,
    activeLoans,
    paidOffLoans,
    defaultedLoans,
    totalPayments,
    overduePayments,
    scheduledPayments,
    totalDepartments,
    activeDepartments,
  };
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Get recent applications
  const { data: recentApplications, error: appsError } = await supabase
    .from('applications')
    .select('id, application_number, status, created_at, applicant:donum_accounts!applications_applicant_id_fkey(email, first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!appsError && recentApplications) {
    recentApplications.forEach((app: any) => {
      const applicant = app.applicant;
      const name = applicant 
        ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email
        : 'Unknown';
      
      activities.push({
        id: app.id,
        type: 'application',
        title: `New ${app.status.replace('_', ' ')} application`,
        description: `${name} - ${app.application_number}`,
        timestamp: app.created_at,
        link: `/admin/applications/${app.id}`,
      });
    });
  }

  // Get recent loans
  const { data: recentLoans, error: loansError } = await supabase
    .from('loans')
    .select('id, loan_number, status, disbursed_at, created_at, applicant:donum_accounts!loans_applicant_id_fkey(email, first_name, last_name)')
    .not('disbursed_at', 'is', null)
    .order('disbursed_at', { ascending: false })
    .limit(Math.floor(limit / 2));

  if (!loansError && recentLoans) {
    recentLoans.forEach((loan: any) => {
      const applicant = loan.applicant;
      const name = applicant 
        ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email
        : 'Unknown';
      
      activities.push({
        id: loan.id,
        type: 'loan',
        title: `Loan ${loan.status}`,
        description: `${name} - ${loan.loan_number}`,
        timestamp: loan.disbursed_at || loan.created_at,
        link: `/admin/loans/${loan.id}`,
      });
    });
  }

  // Get recent payments
  const { data: recentPayments, error: paymentsError } = await supabase
    .from('loan_payments')
    .select('id, paid_date, amount_paid, loan:loans!loan_payments_loan_id_fkey(loan_number, applicant:donum_accounts!loans_applicant_id_fkey(email, first_name, last_name))')
    .eq('status', 'paid')
    .not('paid_date', 'is', null)
    .order('paid_date', { ascending: false })
    .limit(Math.floor(limit / 2));

  if (!paymentsError && recentPayments) {
    recentPayments.forEach((payment: any) => {
      const loan = payment.loan;
      const applicant = loan?.applicant;
      const name = applicant 
        ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || applicant.email
        : 'Unknown';
      
      activities.push({
        id: payment.id,
        type: 'payment',
        title: 'Payment received',
        description: `${name} - ${loan?.loan_number || 'N/A'} - $${(payment.amount_paid || 0).toLocaleString()}`,
        timestamp: payment.paid_date,
        link: `/admin/loans/${loan?.id}`,
      });
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
