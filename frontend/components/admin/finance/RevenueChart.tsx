'use client';

import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, type PaymentTrend } from '@/lib/api/finance';

interface RevenueChartProps {
  data: PaymentTrend[];
  period: 'day' | 'week' | 'month';
}

export function RevenueChart({ data, period }: RevenueChartProps) {
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
        Payment Revenue Over Time
      </h3>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--core-blue)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--core-blue)" stopOpacity={0} />
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
              'Revenue',
            ]}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}
            separator=": "
            cursor={{ stroke: 'var(--core-blue)', strokeWidth: 2, strokeDasharray: '5 5' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '24px' }}
            iconType="line"
            iconSize={16}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="none"
            fill="url(#colorRevenue)"
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--core-blue)"
            strokeWidth={3}
            dot={{ fill: 'var(--core-blue)', r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
            activeDot={{ r: 8, stroke: 'var(--core-blue)', strokeWidth: 2, fill: 'var(--background)' }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
