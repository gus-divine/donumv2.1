'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  defs,
  linearGradient,
  stop,
} from 'recharts';
import { formatCurrency, type LoanDisbursementTrend } from '@/lib/api/finance';

interface LoanDisbursementChartProps {
  data: LoanDisbursementTrend[];
  period: 'day' | 'week' | 'month';
}

export function LoanDisbursementChart({ data, period }: LoanDisbursementChartProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (period === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === 'week') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    amount: item.amount,
    count: item.count,
  }));

  return (
    <div className="relative">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        Loan Disbursements Over Time
      </h3>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorDisbursement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--core-gold)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--core-gold)" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} />
          <XAxis
            dataKey="date"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px', fontWeight: 500 }}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: 'var(--text-secondary)' }}
            tickLine={{ stroke: 'var(--border)', opacity: 0.5 }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px', fontWeight: 500 }}
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fill: 'var(--text-secondary)' }}
            tickLine={{ stroke: 'var(--border)', opacity: 0.5 }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
              padding: '12px 16px',
            }}
            formatter={(value: number | undefined) => [
              value !== undefined ? formatCurrency(value) : '',
              'Disbursed Amount',
            ]}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}
            separator=": "
            cursor={{ fill: 'var(--core-gold)', fillOpacity: 0.1 }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '24px' }}
            iconSize={16}
          />
          <Bar
            dataKey="amount"
            fill="url(#colorDisbursement)"
            radius={[12, 12, 0, 0]}
            name="Disbursed Amount"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
