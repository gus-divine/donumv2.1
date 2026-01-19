'use client';

interface FinancialInfoSectionProps {
  annualIncome: string;
  netWorth: string;
  taxBracket: string;
  onAnnualIncomeChange: (value: string) => void;
  onNetWorthChange: (value: string) => void;
  onTaxBracketChange: (value: string) => void;
}

export function FinancialInfoSection({
  annualIncome,
  netWorth,
  taxBracket,
  onAnnualIncomeChange,
  onNetWorthChange,
  onTaxBracketChange,
}: FinancialInfoSectionProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Financial Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="annualIncome" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Annual Income <span className="text-red-500">*</span>
          </label>
          <select
            id="annualIncome"
            value={annualIncome}
            onChange={(e) => onAnnualIncomeChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-colors"
            required
          >
            <option value="">Select range</option>
            <option value="50000">$50,000 - $99,999</option>
            <option value="100000">$100,000 - $249,999</option>
            <option value="250000">$250,000 - $499,999</option>
            <option value="500000">$500,000 - $999,999</option>
            <option value="1000000">$1,000,000+</option>
          </select>
        </div>

        <div>
          <label htmlFor="netWorth" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Net Worth <span className="text-red-500">*</span>
          </label>
          <select
            id="netWorth"
            value={netWorth}
            onChange={(e) => onNetWorthChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-colors"
            required
          >
            <option value="">Select range</option>
            <option value="100000">$100,000 - $499,999</option>
            <option value="500000">$500,000 - $999,999</option>
            <option value="1000000">$1,000,000 - $4,999,999</option>
            <option value="5000000">$5,000,000 - $9,999,999</option>
            <option value="10000000">$10,000,000+</option>
          </select>
        </div>

        <div>
          <label htmlFor="taxBracket" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Tax Bracket
          </label>
          <select
            id="taxBracket"
            value={taxBracket}
            onChange={(e) => onTaxBracketChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-colors"
          >
            <option value="">Select bracket</option>
            <option value="10%">10%</option>
            <option value="12%">12%</option>
            <option value="22%">22%</option>
            <option value="24%">24%</option>
            <option value="32%">32%</option>
            <option value="35%">35%</option>
            <option value="37%">37%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
