'use client';

export default function PartnersDashboardPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Partner Portal</h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        Welcome to the Donum Partner Portal. Partner-specific features will be available here.
      </p>
      <div className="mt-8 p-6 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
        <p className="text-sm text-[var(--text-secondary)]">
          This portal is under development. Check back soon for partner tools and resources.
        </p>
      </div>
    </div>
  );
}
