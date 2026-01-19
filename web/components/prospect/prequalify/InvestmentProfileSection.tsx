'use client';

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
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Investment Profile</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Risk Tolerance <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
            <label key={level} className="flex items-center">
              <input
                type="radio"
                name="riskTolerance"
                value={level.toLowerCase()}
                checked={riskTolerance === level.toLowerCase()}
                onChange={(e) => onRiskToleranceChange(e.target.value)}
                className="mr-2"
                required
              />
              <span className="text-[var(--text-primary)]">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
            <label key={goal.value} className="flex items-center">
              <input
                type="checkbox"
                checked={investmentGoals.includes(goal.value)}
                onChange={() => onInvestmentGoalToggle(goal.value)}
                className="mr-2"
              />
              <span className="text-[var(--text-primary)]">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="maritalStatus" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Marital Status
          </label>
          <select
            id="maritalStatus"
            value={maritalStatus}
            onChange={(e) => onMaritalStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-colors"
          >
            <option value="">Select status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>

        <div>
          <label htmlFor="dependents" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Dependents
          </label>
          <input
            id="dependents"
            type="number"
            min="0"
            value={dependents}
            onChange={(e) => onDependentsChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-colors"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="hearAbout" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          How did you hear about Donum?
        </label>
        <select
          id="hearAbout"
          value={hearAbout}
          onChange={(e) => onHearAboutChange(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
        >
          <option value="">Select option</option>
          <option value="Google">Google Search</option>
          <option value="Referral">Referral</option>
          <option value="Social Media">Social Media</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );
}
