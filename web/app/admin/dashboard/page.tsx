'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { MetricCard } from '@/components/admin/dashboard/MetricCard';
import { StatusDistributionChart } from '@/components/admin/finance/StatusDistributionChart';
import {
  getDashboardStats,
  getRecentActivity,
  type DashboardStats,
  type RecentActivity,
} from '@/lib/api/dashboard';
import {
  getLoanStatusDistribution,
  getPaymentStatusDistribution,
  type LoanStatusDistribution,
  type PaymentStatusDistribution,
} from '@/lib/api/finance';
import {
  Users,
  UserCheck,
  UserSearch,
  Briefcase,
  FileText,
  CreditCard,
  DollarSign,
  Building2,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loanStatusDist, setLoanStatusDist] = useState<LoanStatusDistribution[]>([]);
  const [paymentStatusDist, setPaymentStatusDist] = useState<PaymentStatusDistribution[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData, loanDistData, paymentDistData] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(8),
        getLoanStatusDistribution(),
        getPaymentStatusDistribution(),
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
      setLoanStatusDist(loanDistData);
      setPaymentStatusDist(paymentDistData);
    } catch (err) {
      console.error('[AdminDashboard] Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application':
        return <FileText className="w-4 h-4" />;
      case 'loan':
        return <CreditCard className="w-4 h-4" />;
      case 'payment':
        return <DollarSign className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="mb-8">
              <Skeleton height="2rem" width="16rem" className="mb-2" />
              <Skeleton height="1rem" width="40rem" />
            </div>

            {/* Quick Access Skeleton */}
            <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="10rem" className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                    <div className="flex-1 space-y-2">
                      <Skeleton height="1rem" width="80%" />
                      <Skeleton height="0.875rem" width="60%" />
                    </div>
                    <Skeleton height="1rem" width="1rem" variant="circular" />
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics Skeleton */}
            <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="10rem" className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton height="1rem" width="10rem" />
                    <Skeleton height="2rem" width="8rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue Payments Alert Skeleton */}
            <div className="mb-8 border-l-4 border-red-500 pl-4 py-2">
              <div className="flex items-start gap-3">
                <Skeleton height="1.25rem" width="1.25rem" variant="circular" />
                <div className="flex-1 space-y-2">
                  <Skeleton height="1rem" width="16rem" />
                  <Skeleton height="0.875rem" width="20rem" />
                </div>
              </div>
            </div>

            {/* Distribution Charts Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-6" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton height="20rem" width="100%" variant="rectangular" />
                <Skeleton height="20rem" width="100%" variant="rectangular" />
              </div>
            </div>

            {/* Detailed Statistics Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
              <Skeleton height="1.5rem" width="16rem" className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton height="1rem" width="10rem" />
                    <Skeleton height="1.5rem" width="6rem" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="12rem" className="mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
                    <Skeleton height="2.5rem" width="2.5rem" variant="circular" />
                    <div className="flex-1 space-y-2">
                      <Skeleton height="1rem" width="20rem" />
                      <Skeleton height="0.875rem" width="12rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-7xl mx-auto">
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <h1 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h1>
              <p className="text-[var(--text-secondary)]">{error}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Overview of your Donum 2.1 system — monitor activity, track performance, and manage operations
            </p>
          </div>

          {/* Quick Links - Moved to Top */}
          <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/admin/applications')}
                className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-blue)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <FileText className="w-5 h-5 text-[var(--core-blue)] group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Applications</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage all applications</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-blue)] transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/loans')}
                className="flex items-center gap-3 p-4 border-l-4 border-[var(--core-gold)] hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <CreditCard className="w-5 h-5 text-[var(--core-gold)] group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Loans</p>
                  <p className="text-sm text-[var(--text-secondary)]">View loan portfolio</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-gold)] transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/finance')}
                className="flex items-center gap-3 p-4 border-l-4 border-green-500 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <TrendingUp className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Financial Overview</p>
                  <p className="text-sm text-[var(--text-secondary)]">View financial metrics</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-green-500 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/prospects')}
                className="flex items-center gap-3 p-4 border-l-4 border-purple-500 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <UserSearch className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Prospects</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage prospects</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-purple-500 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/members')}
                className="flex items-center gap-3 p-4 border-l-4 border-blue-400 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <UserCheck className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Members</p>
                  <p className="text-sm text-[var(--text-secondary)]">View all members</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/staff')}
                className="flex items-center gap-3 p-4 border-l-4 border-orange-500 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <Briefcase className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Staff</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage staff members</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-orange-500 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/departments')}
                className="flex items-center gap-3 p-4 border-l-4 border-indigo-500 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <Building2 className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Departments</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage departments</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-indigo-500 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center gap-3 p-4 border-l-4 border-gray-500 hover:bg-[var(--surface-hover)] transition-colors text-left group"
              >
                <Users className="w-5 h-5 text-gray-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Users</p>
                  <p className="text-sm text-[var(--text-secondary)]">Manage all users</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-gray-500 transition-colors" />
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          {stats && (
            <>
              <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Key Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Users"
                    value={stats.totalUsers}
                    subtitle={`${stats.activeUsers} active`}
                  />
                  <MetricCard
                    title="Total Applications"
                    value={stats.totalApplications}
                    subtitle={`${stats.pendingApplications} pending`}
                  />
                  <MetricCard
                    title="Active Loans"
                    value={stats.activeLoans}
                    subtitle={`${stats.totalLoans} total`}
                  />
                  <MetricCard
                    title="Departments"
                    value={stats.activeDepartments}
                    subtitle={`${stats.totalDepartments} total`}
                  />
                </div>
              </div>

              {/* Charts */}
              <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Distribution Charts</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StatusDistributionChart
                    title="Loan Status Distribution"
                    loanData={loanStatusDist}
                    type="loan"
                  />
                  <StatusDistributionChart
                    title="Payment Status Distribution"
                    paymentData={paymentStatusDist}
                    type="payment"
                  />
                </div>
              </div>

              {/* Alerts - Moved Lower */}
              {stats.overduePayments > 0 && (
                <div className="mb-6 border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Overdue Payments Alert
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {stats.overduePayments} payment{stats.overduePayments !== 1 ? 's' : ''} {stats.overduePayments !== 1 ? 'are' : 'is'} overdue.
                      </p>
                      <button
                        onClick={() => router.push('/admin/finance')}
                        className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                      >
                        View financial overview →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Stats Grid */}
              <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Detailed Statistics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User Breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">User Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard
                        title="Prospects"
                        value={stats.totalProspects}
                      />
                      <MetricCard
                        title="Members"
                        value={stats.totalMembers}
                      />
                      <MetricCard
                        title="Staff"
                        value={stats.totalStaff}
                      />
                      <MetricCard
                        title="Active Users"
                        value={stats.activeUsers}
                      />
                    </div>
                  </div>

                  {/* Application Status */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">Application Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard
                        title="Pending Review"
                        value={stats.pendingApplications}
                      />
                      <MetricCard
                        title="Under Review"
                        value={stats.underReviewApplications}
                      />
                      <MetricCard
                        title="Approved"
                        value={stats.approvedApplications}
                      />
                      <MetricCard
                        title="Funded"
                        value={stats.fundedApplications}
                      />
                    </div>
                  </div>

                  {/* Loan Status */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">Loan Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard
                        title="Active Loans"
                        value={stats.activeLoans}
                      />
                      <MetricCard
                        title="Paid Off"
                        value={stats.paidOffLoans}
                      />
                      <MetricCard
                        title="Defaulted"
                        value={stats.defaultedLoans}
                      />
                      <MetricCard
                        title="Total Loans"
                        value={stats.totalLoans}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Activity */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => activity.link && router.push(activity.link)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-[var(--surface-hover)] rounded-lg transition-colors text-left group"
                  >
                    <div className="p-2 bg-[var(--surface)] rounded-lg group-hover:bg-[var(--core-blue)]/10 transition-colors">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] text-sm group-hover:text-[var(--core-blue)] transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                    {activity.link && (
                      <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </PermissionGuard>
  );
}
