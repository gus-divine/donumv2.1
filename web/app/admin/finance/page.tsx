'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { FinancialMetricCard } from '@/components/admin/finance/FinancialMetricCard';
import { RevenueChart } from '@/components/admin/finance/RevenueChart';
import { StatusDistributionChart } from '@/components/admin/finance/StatusDistributionChart';
import { LoanDisbursementChart } from '@/components/admin/finance/LoanDisbursementChart';
import { UpcomingPaymentsTable } from '@/components/admin/finance/UpcomingPaymentsTable';
import { RecentPaymentsTable } from '@/components/admin/finance/RecentPaymentsTable';
import {
  getFinancialMetrics,
  getPaymentTrends,
  getLoanStatusDistribution,
  getPaymentStatusDistribution,
  getLoanDisbursementTrends,
  getUpcomingPayments,
  getRecentPayments,
  formatCurrency,
  formatPercentage,
  type FinancialMetrics,
  type PaymentTrend,
  type LoanStatusDistribution,
  type PaymentStatusDistribution,
  type LoanDisbursementTrend,
  type UpcomingPayment,
  type RecentPayment,
} from '@/lib/api/finance';
import {
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Select } from '@/components/ui/select';

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrend[]>([]);
  const [loanStatusDist, setLoanStatusDist] = useState<LoanStatusDistribution[]>([]);
  const [paymentStatusDist, setPaymentStatusDist] = useState<PaymentStatusDistribution[]>([]);
  const [loanDisbursementTrends, setLoanDisbursementTrends] = useState<LoanDisbursementTrend[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadFinancialData();
  }, [dateRange]);

  async function loadFinancialData() {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Load all data in parallel
      const [
        metricsData,
        trendsData,
        loanDistData,
        paymentDistData,
        disbursementTrendsData,
        upcomingData,
        recentData,
      ] = await Promise.all([
        getFinancialMetrics(),
        getPaymentTrends(startDate, endDate, dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week'),
        getLoanStatusDistribution(),
        getPaymentStatusDistribution(),
        getLoanDisbursementTrends(startDate, endDate, dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week'),
        getUpcomingPayments(),
        getRecentPayments(),
      ]);

      setMetrics(metricsData);
      setPaymentTrends(trendsData);
      setLoanStatusDist(loanDistData);
      setPaymentStatusDist(paymentDistData);
      setLoanDisbursementTrends(disbursementTrendsData);
      setUpcomingPayments(upcomingData);
      setRecentPayments(recentData);
    } catch (err) {
      console.error('[FinancePage] Error loading financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading financial data...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-[var(--surface)] border border-red-500 rounded-lg p-6">
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Financial Overview</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Monitor loan portfolio performance, payments, and financial health
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                id="date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
                options={[
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                  { value: '1y', label: 'Last year' },
                ]}
                className="w-40"
              />
              <button
                onClick={() => router.push('/admin/loans')}
                className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors flex items-center gap-2"
              >
                View All Loans
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overdue Payments Alert */}
          {metrics && metrics.overduePaymentsCount > 0 && (
            <div className="mb-8 border-l-4 border-red-500 pl-4 py-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Overdue Payments Alert
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {metrics.overduePaymentsCount} payment{metrics.overduePaymentsCount !== 1 ? 's' : ''} totaling{' '}
                    {formatCurrency(metrics.overduePaymentsAmount)} {metrics.overduePaymentsCount !== 1 ? 'are' : 'is'}{' '}
                    overdue.
                  </p>
                  <button
                    onClick={() => router.push('/admin/loans?status=overdue')}
                    className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                  >
                    View overdue payments →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {metrics && (
            <>
              <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Key Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FinancialMetricCard
                title="Total Loans Outstanding"
                value={metrics.totalLoansOutstanding}
                subtitle={`${metrics.activeLoansCount} active loans`}
              />
              <FinancialMetricCard
                title="Total Principal Disbursed"
                value={metrics.totalPrincipalDisbursed}
              />
              <FinancialMetricCard
                title="Total Payments Received"
                value={metrics.totalPaymentsReceived}
                subtitle={`Collection rate: ${formatPercentage(metrics.collectionRate)}`}
              />
              <FinancialMetricCard
                title="Total Interest Collected"
                value={metrics.totalInterestCollected}
                subtitle={`Avg loan size: ${formatCurrency(metrics.averageLoanSize)}`}
              />
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FinancialMetricCard
                    title="Active Loans"
                    value={metrics.activeLoansCount}
                  />
                  <FinancialMetricCard
                    title="Overdue Payments"
                    value={metrics.overduePaymentsCount}
                    subtitle={formatCurrency(metrics.overduePaymentsAmount)}
                  />
                  <FinancialMetricCard
                    title="Collection Rate"
                    value={formatPercentage(metrics.collectionRate)}
                  />
                  <FinancialMetricCard
                    title="Default Rate"
                    value={formatPercentage(metrics.defaultRate)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Charts */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Charts & Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <RevenueChart data={paymentTrends} period={dateRange === '7d' ? 'day' : 'week'} />
              <LoanDisbursementChart data={loanDisbursementTrends} period={dateRange === '7d' ? 'day' : 'week'} />
            </div>
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

          {/* Tables */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Payment Activity</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingPaymentsTable payments={upcomingPayments} />
              <RecentPaymentsTable payments={recentPayments} />
            </div>
          </div>
        </div>
      </main>
    </PermissionGuard>
  );
}
