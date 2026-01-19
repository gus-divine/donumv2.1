'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getLoans, type Loan } from '@/lib/api/loans';
import { getLoanPayments, type LoanPayment } from '@/lib/api/loans';
import { getApplications, type Application } from '@/lib/api/applications';
import { 
  CreditCard, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  User,
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalLoans: number;
  activeLoans: number;
  totalBalance: number;
  nextPaymentAmount: number | null;
  nextPaymentDate: string | null;
  overduePayments: number;
  totalPaid: number;
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLoans: 0,
    activeLoans: 0,
    totalBalance: 0,
    nextPaymentAmount: null,
    nextPaymentDate: null,
    overduePayments: 0,
    totalPaid: 0,
  });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<LoanPayment[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<{ name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createSupabaseClient();
      
      // Load loans
      const loansData = await getLoans({ applicant_id: user.id });
      setLoans(loansData);
      
      const activeLoans = loansData.filter(l => l.status === 'active');
      const totalBalance = activeLoans.reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
      const totalPaid = loansData.reduce((sum, loan) => sum + (loan.total_paid || 0), 0);
      
      // Find next payment
      let nextPaymentAmount: number | null = null;
      let nextPaymentDate: string | null = null;
      
      for (const loan of activeLoans) {
        if (loan.next_payment_date && loan.next_payment_amount) {
          if (!nextPaymentDate || new Date(loan.next_payment_date) < new Date(nextPaymentDate)) {
            nextPaymentDate = loan.next_payment_date;
            nextPaymentAmount = loan.next_payment_amount;
          }
        }
      }
      
      // Load upcoming payments
      const allPayments: LoanPayment[] = [];
      for (const loan of activeLoans) {
        try {
          const payments = await getLoanPayments(loan.id);
          allPayments.push(...payments);
        } catch (err) {
          console.error(`Error loading payments for loan ${loan.id}:`, err);
        }
      }
      
      const upcoming = allPayments
        .filter(p => ['scheduled', 'pending'].includes(p.status))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5);
      
      setUpcomingPayments(upcoming);
      
      const overduePayments = allPayments.filter(p => p.status === 'overdue').length;
      
      // Load assigned staff
      const { data: assignment } = await supabase
        .from('prospect_staff_assignments')
        .select('staff_id')
        .eq('prospect_id', user.id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle();
      
      if (assignment?.staff_id) {
        const { data: staffData } = await supabase
          .from('donum_accounts')
          .select('first_name, last_name, email')
          .eq('id', assignment.staff_id)
          .single();
        
        if (staffData) {
          setAssignedStaff({
            name: `${staffData.first_name || ''} ${staffData.last_name || ''}`.trim() || staffData.email,
            email: staffData.email,
          });
        }
      }
      
      setStats({
        totalLoans: loansData.length,
        activeLoans: activeLoans.length,
        totalBalance,
        nextPaymentAmount,
        nextPaymentDate,
        overduePayments,
        totalPaid,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="20rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
          </div>

          {/* Quick Access Skeleton */}
          <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="10rem" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                  <div className="flex-1 space-y-2">
                    <Skeleton height="1rem" width="80%" />
                    <Skeleton height="0.875rem" width="60%" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
            <Skeleton height="1.5rem" width="10rem" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton height="0.875rem" width="8rem" />
                  <Skeleton height="2rem" width="12rem" />
                  <Skeleton height="0.875rem" width="6rem" />
                </div>
              ))}
            </div>
          </div>

          {/* Loans List Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="12rem" className="mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 border border-[var(--border)] rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2">
                      <Skeleton height="1.5rem" width="16rem" />
                      <Skeleton height="1rem" width="12rem" />
                    </div>
                    <Skeleton height="1.5rem" width="8rem" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Skeleton height="0.875rem" width="8rem" />
                      <Skeleton height="1.25rem" width="10rem" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton height="0.875rem" width="8rem" />
                      <Skeleton height="1.25rem" width="10rem" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton height="0.875rem" width="8rem" />
                      <Skeleton height="1.25rem" width="10rem" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-l-4 border-red-500 pl-4 py-2">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your loans, payments, and account information
          </p>
        </div>

        {/* Overdue Payments Alert */}
        {stats.overduePayments > 0 && (
          <div className="mb-8 border-l-4 border-red-500 pl-4 py-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Overdue Payments Alert
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  You have {stats.overduePayments} overdue payment{stats.overduePayments !== 1 ? 's' : ''}. Please make a payment to avoid late fees.
                </p>
                <button
                  onClick={() => router.push('/members/payments')}
                  className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                >
                  View Payments →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Access */}
        <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/members/loans')}
              className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-blue)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
            >
              <CreditCard className="w-5 h-5 text-[var(--core-blue)] group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">My Loans</p>
                <p className="text-sm text-[var(--text-secondary)]">{stats.activeLoans} active loan{stats.activeLoans !== 1 ? 's' : ''}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-blue)] transition-colors" />
            </button>

            <button
              onClick={() => router.push('/members/payments')}
              className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-gold)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
            >
              <DollarSign className="w-5 h-5 text-[var(--core-gold)] group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">Make Payment</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {stats.nextPaymentAmount ? `Due: ${formatCurrency(stats.nextPaymentAmount)}` : 'No payments due'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-gold)] transition-colors" />
            </button>

            <button
              onClick={() => router.push('/members/documents')}
              className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-blue)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
            >
              <FileText className="w-5 h-5 text-[var(--core-blue)] group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">Documents</p>
                <p className="text-sm text-[var(--text-secondary)]">View and manage</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-blue)] transition-colors" />
            </button>

            <button
              onClick={() => router.push('/members/profile')}
              className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-gold)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
            >
              <User className="w-5 h-5 text-[var(--core-gold)] group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">Profile</p>
                <p className="text-sm text-[var(--text-secondary)]">Update information</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-gold)] transition-colors" />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4">
              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Total Balance</span>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalBalance)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{stats.activeLoans} active loan{stats.activeLoans !== 1 ? 's' : ''}</p>
            </div>
            <div className="p-4">
              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Next Payment</span>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats.nextPaymentAmount ? formatCurrency(stats.nextPaymentAmount) : '-'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {stats.nextPaymentDate ? `Due ${formatDate(stats.nextPaymentDate)}` : 'No payments due'}
              </p>
            </div>
            <div className="p-4">
              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Total Paid</span>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Across all loans</p>
            </div>
          </div>
        </div>

        {/* My Loans */}
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">My Loans</h2>
            {loans.length > 0 && (
              <button
                onClick={() => router.push('/members/loans')}
                className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors flex items-center gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {loans.length === 0 ? (
            <div className="p-8 text-center border border-[var(--border)] rounded-lg">
              <CreditCard className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No loans found.</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">Your loans will appear here once they are created.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.slice(0, 3).map((loan) => (
                <div
                  key={loan.id}
                  onClick={() => router.push(`/members/loans/${loan.id}`)}
                  className="p-6 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        {loan.loan_number}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {loan.plan?.name || 'Loan Plan'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      loan.status === 'active'
                        ? 'text-blue-600 dark:text-blue-400'
                        : loan.status === 'paid_off'
                        ? 'text-green-600 dark:text-green-400'
                        : loan.status === 'defaulted'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {loan.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Current Balance</span>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(loan.current_balance)}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Next Payment</span>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {loan.next_payment_amount ? formatCurrency(loan.next_payment_amount) : '-'}
                      </p>
                      {loan.next_payment_date && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Due {formatDate(loan.next_payment_date)}</p>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Total Paid</span>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(loan.total_paid)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Payments */}
        {upcomingPayments.length > 0 && (
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming Payments</h2>
              <button
                onClick={() => router.push('/members/payments')}
                className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors flex items-center gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === 'overdue'
                        ? 'bg-red-100 dark:bg-red-900/20'
                        : payment.status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      {payment.status === 'overdue' ? (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : payment.status === 'paid' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        Payment #{payment.payment_number}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Due {formatDate(payment.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(payment.amount_due)}
                    </p>
                    <p className={`text-xs ${
                      payment.status === 'overdue'
                        ? 'text-red-600 dark:text-red-400'
                        : payment.status === 'paid'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-[var(--text-secondary)]'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Staff */}
        {assignedStaff && (
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Assigned Staff</h2>
            <div className="p-4 border border-[var(--border)] rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--core-blue)] flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{assignedStaff.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{assignedStaff.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
