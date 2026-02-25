'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  className = '',
}: MetricCardProps) {
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-US').format(value)
    : value;

  return (
    <div className={`${className}`}>
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">{title}</p>
        <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">{formattedValue}</p>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
