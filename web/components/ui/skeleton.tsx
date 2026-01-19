'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'pulse',
  className = ''
}: SkeletonProps) {
  const baseClasses = 'bg-[var(--surface-hover)]';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    none: ''
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`.trim();

  return (
    <div
      className={combinedClasses}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
