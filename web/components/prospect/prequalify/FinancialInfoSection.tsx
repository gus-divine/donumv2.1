'use client';

import { Select } from '@/components/ui/select';

interface FinancialInfoSectionProps {
  annualIncome: string;
  netWorth: string;
  taxBracket: string;
  onAnnualIncomeChange: (value: string) => void;
  onNetWorthChange: (value: string) => void;
  onTaxBracketChange: (value: string) => void;
}

const INCOME_OPTIONS = [
  { value: '', label: 'Select range' },
  { value: '50000', label: '$50,000 - $99,999' },
  { value: '100000', label: '$100,000 - $249,999' },
  { value: '250000', label: '$250,000 - $499,999' },
  { value: '500000', label: '$500,000 - $999,999' },
  { value: '1000000', label: '$1,000,000+' },
];

const NET_WORTH_OPTIONS = [
  { value: '', label: 'Select range' },
  { value: '100000', label: '$100,000 - $499,999' },
  { value: '500000', label: '$500,000 - $999,999' },
  { value: '1000000', label: '$1,000,000 - $4,999,999' },
  { value: '5000000', label: '$5,000,000 - $9,999,999' },
  { value: '10000000', label: '$10,000,000+' },
];

const TAX_BRACKET_OPTIONS = [
  { value: '', label: 'Select bracket' },
  { value: '10%', label: '10%' },
  { value: '12%', label: '12%' },
  { value: '22%', label: '22%' },
  { value: '24%', label: '24%' },
  { value: '32%', label: '32%' },
  { value: '35%', label: '35%' },
  { value: '37%', label: '37%' },
];

export function FinancialInfoSection({
  annualIncome,
  netWorth,
  taxBracket,
  onAnnualIncomeChange,
  onNetWorthChange,
  onTaxBracketChange,
}: FinancialInfoSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <label htmlFor="annualIncome" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Annual Income <span className="text-red-500">*</span>
        </label>
        <Select
          id="annualIncome"
          value={annualIncome}
          onChange={(e) => onAnnualIncomeChange(e.target.value)}
          options={INCOME_OPTIONS}
          className="w-full"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="netWorth" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Net Worth <span className="text-red-500">*</span>
        </label>
        <Select
          id="netWorth"
          value={netWorth}
          onChange={(e) => onNetWorthChange(e.target.value)}
          options={NET_WORTH_OPTIONS}
          className="w-full"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="taxBracket" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Tax Bracket
        </label>
        <Select
          id="taxBracket"
          value={taxBracket}
          onChange={(e) => onTaxBracketChange(e.target.value)}
          options={TAX_BRACKET_OPTIONS}
          className="w-full"
        />
      </div>
    </div>
  );
}
