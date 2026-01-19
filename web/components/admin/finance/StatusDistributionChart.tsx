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
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">{title}</h3>
        <div className="flex items-center justify-center h-[380px] text-[var(--text-secondary)]">
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
    <div className="relative">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name: string; percent: number }) => {
              if (percent < 0.05) return ''; // Hide labels for very small slices
              return `${(percent * 100).toFixed(0)}%`;
            }}
            outerRadius={120}
            innerRadius={50}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={3}
            stroke="var(--background)"
            strokeWidth={3}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="var(--background)"
                strokeWidth={3}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
              padding: '12px 16px',
            }}
            formatter={(value: number | undefined, name: string | undefined, props: { payload?: { amount?: number } }) => [
              `${value ?? 0} (${formatCurrency(props.payload?.amount ?? 0)})`,
              name ?? '',
            ]}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}
            separator=": "
          />
          <Legend 
            wrapperStyle={{ paddingTop: '24px' }}
            iconType="circle"
            iconSize={12}
            formatter={(value: string) => (
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
