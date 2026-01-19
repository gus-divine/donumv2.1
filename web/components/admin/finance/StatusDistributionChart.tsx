'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, type LoanStatusDistribution, type PaymentStatusDistribution } from '@/lib/api/finance';

interface StatusDistributionChartProps {
  title: string;
  loanData?: LoanStatusDistribution[];
  paymentData?: PaymentStatusDistribution[];
  type: 'loan' | 'payment';
}

const COLORS = [
  'var(--core-blue)',
  'var(--core-gold)',
  '#10b981', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // purple
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paid_off: 'Paid Off',
  defaulted: 'Defaulted',
  pending: 'Pending',
  cancelled: 'Cancelled',
  closed: 'Closed',
  paid: 'Paid',
  scheduled: 'Scheduled',
  overdue: 'Overdue',
  missed: 'Missed',
};

export function StatusDistributionChart({
  title,
  loanData,
  paymentData,
  type,
}: StatusDistributionChartProps) {
  const data = type === 'loan' ? loanData : paymentData;

  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
        <div className="flex items-center justify-center h-[300px] text-[var(--text-secondary)]">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    amount: item.totalAmount,
  }));

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
            formatter={(value: number | undefined, name: string | undefined, props: { payload?: { amount?: number } }) => [
              `${value ?? 0} (${formatCurrency(props.payload?.amount ?? 0)})`,
              name ?? '',
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
