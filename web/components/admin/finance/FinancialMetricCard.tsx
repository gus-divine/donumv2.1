'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface FinancialMetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function FinancialMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  className = '',
}: FinancialMetricCardProps) {
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    : value;

  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{formattedValue}</p>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-[var(--core-blue)]/10 rounded-lg">
            <Icon className="w-6 h-6 text-[var(--core-blue)]" />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
          {trend.isPositive !== false ? (
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span
            className={`text-sm font-medium ${
              trend.isPositive !== false
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
