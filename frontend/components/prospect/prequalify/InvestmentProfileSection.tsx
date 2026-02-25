'use client';

import { Select } from '@/components/ui/select';

interface InvestmentProfileSectionProps {
  riskTolerance: string;
  investmentGoals: string[];
  maritalStatus: string;
  dependents: string;
  hearAbout: string;
  onRiskToleranceChange: (value: string) => void;
  onInvestmentGoalToggle: (goal: string) => void;
  onMaritalStatusChange: (value: string) => void;
  onDependentsChange: (value: string) => void;
  onHearAboutChange: (value: string) => void;
}

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
];

const HEAR_ABOUT_OPTIONS = [
  { value: '', label: 'Select option' },
  { value: 'Google', label: 'Google Search' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Other', label: 'Other' },
];

export function InvestmentProfileSection({
  riskTolerance,
  investmentGoals,
  maritalStatus,
  dependents,
  hearAbout,
  onRiskToleranceChange,
  onInvestmentGoalToggle,
  onMaritalStatusChange,
  onDependentsChange,
  onHearAboutChange,
}: InvestmentProfileSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Risk Tolerance <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
            <label key={level} htmlFor={`riskTolerance-${level.toLowerCase()}`} className="flex items-center">
              <input
                id={`riskTolerance-${level.toLowerCase()}`}
                type="radio"
                name="riskTolerance"
                value={level.toLowerCase()}
                checked={riskTolerance === level.toLowerCase()}
                onChange={(e) => onRiskToleranceChange(e.target.value)}
                className="mr-2"
                required
              />
              <span className="text-sm text-[var(--text-primary)]">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Investment Goals
        </label>
        <div className="space-y-2">
          {[
            { value: 'tax_optimization', label: 'Tax Optimization' },
            { value: 'estate_planning', label: 'Estate Planning' },
            { value: 'retirement_planning', label: 'Retirement Planning' },
            { value: 'charitable_giving', label: 'Charitable Giving' },
            { value: 'other', label: 'Other' },
          ].map((goal) => (
            <label key={goal.value} htmlFor={`investmentGoal-${goal.value}`} className="flex items-center">
              <input
                id={`investmentGoal-${goal.value}`}
                type="checkbox"
                checked={investmentGoals.includes(goal.value)}
                onChange={() => onInvestmentGoalToggle(goal.value)}
                className="mr-2"
              />
              <span className="text-sm text-[var(--text-primary)]">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="maritalStatus" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Marital Status
          </label>
          <Select
            id="maritalStatus"
            value={maritalStatus}
            onChange={(e) => onMaritalStatusChange(e.target.value)}
            options={MARITAL_STATUS_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="dependents" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Dependents
          </label>
          <input
            id="dependents"
            type="number"
            min="0"
            value={dependents}
            onChange={(e) => onDependentsChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="hearAbout" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          How did you hear about Donum?
        </label>
        <Select
          id="hearAbout"
          value={hearAbout}
          onChange={(e) => onHearAboutChange(e.target.value)}
          options={HEAR_ABOUT_OPTIONS}
          className="w-full"
        />
      </div>
    </div>
  );
}
