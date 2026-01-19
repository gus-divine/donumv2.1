'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { PersonalInfoSection } from '@/components/prospect/prequalify/PersonalInfoSection';
import { FinancialInfoSection } from '@/components/prospect/prequalify/FinancialInfoSection';
import { InvestmentProfileSection } from '@/components/prospect/prequalify/InvestmentProfileSection';
import { TermsSection } from '@/components/prospect/prequalify/TermsSection';
import { createApplication, getApplications } from '@/lib/api/applications';
import { calculateSuggestedLoanAmount } from '@/lib/prequalify/qualification-logic';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApplicationPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('US');
  
  const [annualIncome, setAnnualIncome] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [taxBracket, setTaxBracket] = useState('');
  
  const [riskTolerance, setRiskTolerance] = useState('');
  const [investmentGoals, setInvestmentGoals] = useState<string[]>([]);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [dependents, setDependents] = useState('');
  const [hearAbout, setHearAbout] = useState('');
  
  const [requestedAmount, setRequestedAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanPurposeOther, setLoanPurposeOther] = useState('');
  const [maxLoanAmount, setMaxLoanAmount] = useState<number | null>(null);
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    if (user && session) {
      loadUserData();
      loadExistingApplication();
    }
  }, [user, session]);

  const loadExistingApplication = async () => {
    if (!user) return;
    
    try {
      const applications = await getApplications({ applicant_id: user.id });
      // Find draft or submitted application
      const draftOrSubmitted = applications.find(
        app => app.status === 'draft' || app.status === 'submitted'
      );
      if (draftOrSubmitted) {
        setExistingApplication(draftOrSubmitted);
        setRequestedAmount(draftOrSubmitted.requested_amount?.toString() || '');
        const purpose = draftOrSubmitted.purpose || '';
        const standardPurposes = ['Charitable giving', 'Tax optimization', 'Estate planning', 'Retirement planning', 'Capital gains optimization', 'IRA rollover', 'Business divestiture'];
        if (standardPurposes.includes(purpose)) {
          setLoanPurpose(purpose);
        } else if (purpose) {
          setLoanPurpose('Other');
          setLoanPurposeOther(purpose);
        }
      }
    } catch (err) {
      console.error('Error loading existing application:', err);
      // Don't show error to user, just continue
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('donum_accounts')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || data.cell_phone || '');
        setDateOfBirth(data.date_of_birth || '');
        setAddressLine1(data.address_line_1 || '');
        setAddressLine2(data.address_line_2 || '');
        setCity(data.city || '');
        setState(data.state || '');
        setZipCode(data.zip_code || '');
        setCountry(data.country || 'US');
        setAnnualIncome(data.annual_income?.toString() || '');
        setNetWorth(data.net_worth?.toString() || '');
        setTaxBracket(data.tax_bracket || '');
        setRiskTolerance(data.risk_tolerance || '');
        setMaritalStatus(data.marital_status || '');
        setDependents(data.dependents?.toString() || '');
        
        if (data.investment_goals && typeof data.investment_goals === 'object') {
          const goals = Object.keys(data.investment_goals).filter(
            key => data.investment_goals[key] === true
          );
          setInvestmentGoals(goals);
        }

        // Calculate max loan amount based on financial profile
        // Use Defund plan as default for calculation (most common)
        if (data.annual_income || data.net_worth) {
          const incomeNum = data.annual_income ? parseFloat(data.annual_income.toString()) : undefined;
          const netWorthNum = data.net_worth ? parseFloat(data.net_worth.toString()) : undefined;
          const loanAmounts = calculateSuggestedLoanAmount('defund', incomeNum, netWorthNum);
          // Only set max if they have donation capacity
          if (loanAmounts.hasCapacity && loanAmounts.max > 0) {
            setMaxLoanAmount(loanAmounts.max);
          } else {
            setMaxLoanAmount(null); // No capacity, can't calculate max
          }
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvestmentGoalToggle = (goal: string) => {
    setInvestmentGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!firstName || !lastName || !phone || !annualIncome || !netWorth || !riskTolerance) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    // Validate requested amount
    if (requestedAmount) {
      const requestedNum = parseFloat(requestedAmount);
      if (isNaN(requestedNum) || requestedNum < 500000) {
        setError('Requested loan amount must be at least $500,000');
        setIsSubmitting(false);
        return;
      }
      if (maxLoanAmount && requestedNum > maxLoanAmount) {
        setError(`Requested loan amount cannot exceed $${maxLoanAmount.toLocaleString()}`);
        setIsSubmitting(false);
        return;
      }
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Please accept the terms of service and privacy policy');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setError('You must be signed in to submit this form');
        setIsSubmitting(false);
        return;
      }

      const investmentGoalsObj: Record<string, boolean> = {};
      const goalOptions = ['tax_optimization', 'estate_planning', 'retirement_planning', 'charitable_giving', 'other'];
      goalOptions.forEach(goal => {
        investmentGoalsObj[goal] = investmentGoals.includes(goal);
      });

      const { error: updateError } = await supabase
        .from('donum_accounts')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          cell_phone: phone.trim(),
          date_of_birth: dateOfBirth || null,
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          country: country,
          annual_income: annualIncome ? parseFloat(annualIncome) : null,
          net_worth: netWorth ? parseFloat(netWorth) : null,
          tax_bracket: taxBracket || null,
          risk_tolerance: riskTolerance,
          investment_goals: investmentGoalsObj,
          marital_status: maritalStatus || null,
          dependents: dependents ? parseInt(dependents) : null,
          terms_accepted: termsAccepted,
          terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
          privacy_policy_accepted: privacyAccepted,
          privacy_policy_accepted_at: privacyAccepted ? new Date().toISOString() : null,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        setError(updateError.message || 'Failed to save application data');
        setIsSubmitting(false);
        return;
      }

      // Create full application record
      try {
        await createApplication({
          applicant_id: authUser.id,
          requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
          annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
          net_worth: netWorth ? parseFloat(netWorth) : undefined,
          tax_bracket: taxBracket || undefined,
          risk_tolerance: riskTolerance || undefined,
          investment_goals: investmentGoalsObj,
          status: 'submitted',
          purpose: loanPurpose === 'Other' ? loanPurposeOther : (loanPurpose || 'Full application submission'),
          notes: `Comprehensive application submitted. Marital status: ${maritalStatus || 'Not provided'}, Dependents: ${dependents || '0'}, How heard: ${hearAbout || 'Not provided'}`,
        });
      } catch (appError) {
        console.error('Error creating application:', appError);
        // Don't fail the whole submission if application creation fails
        // The user data is already saved
      }

      router.push('/prospect/dashboard');
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <Skeleton height="1.5rem" width="10rem" />
          </div>

          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="18rem" className="mb-2" />
            <Skeleton height="1rem" width="35rem" />
          </div>

          {/* Form Sections Skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
                <Skeleton height="1.5rem" width="12rem" className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton height="0.875rem" width="8rem" />
                      <Skeleton height="2.5rem" width="100%" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button Skeleton */}
          <div className="mt-6 pt-6 border-t border-[var(--border)] flex justify-end gap-3">
            <Skeleton height="2.5rem" width="8rem" />
            <Skeleton height="2.5rem" width="10rem" />
          </div>
        </div>
      </main>
    );
  }

  // Check if application was updated by admin
  const lastUpdatedByAdmin = existingApplication?.updated_by && 
    existingApplication.updated_by !== user?.id &&
    existingApplication.updated_at;

  return (
    <main className="min-h-screen p-8">
      <button
        onClick={() => router.push('/prospect/dashboard')}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        ← Back to Dashboard
      </button>
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Full Application Form</h1>
          <p className="text-[var(--text-secondary)]">
            Please provide comprehensive information to complete your application. 
            This detailed form will help us better understand your financial needs and goals.
          </p>
        </div>

        {/* Last Updated by Admin Message */}
        {lastUpdatedByAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Last updated by admin</strong> on {new Date(lastUpdatedByAdmin).toLocaleString()}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Please review the information and submit when ready.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <PersonalInfoSection
            firstName={firstName}
            lastName={lastName}
            phone={phone}
            dateOfBirth={dateOfBirth}
            addressLine1={addressLine1}
            addressLine2={addressLine2}
            city={city}
            state={state}
            zipCode={zipCode}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPhoneChange={setPhone}
            onDateOfBirthChange={setDateOfBirth}
            onAddressLine1Change={setAddressLine1}
            onAddressLine2Change={setAddressLine2}
            onCityChange={setCity}
            onStateChange={setState}
            onZipCodeChange={setZipCode}
          />

          <FinancialInfoSection
            annualIncome={annualIncome}
            netWorth={netWorth}
            taxBracket={taxBracket}
            onAnnualIncomeChange={setAnnualIncome}
            onNetWorthChange={setNetWorth}
            onTaxBracketChange={setTaxBracket}
          />

          <InvestmentProfileSection
            riskTolerance={riskTolerance}
            investmentGoals={investmentGoals}
            maritalStatus={maritalStatus}
            dependents={dependents}
            hearAbout={hearAbout}
            onRiskToleranceChange={setRiskTolerance}
            onInvestmentGoalToggle={handleInvestmentGoalToggle}
            onMaritalStatusChange={setMaritalStatus}
            onDependentsChange={setDependents}
            onHearAboutChange={setHearAbout}
          />

          {/* Loan Request Section */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Loan Request</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="requestedAmount" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Requested Loan Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    id="requestedAmount"
                    type="number"
                    step="1000"
                    min="500000"
                    max={maxLoanAmount || undefined}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    placeholder="500,000"
                    className="w-full pl-8 pr-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>
                {maxLoanAmount ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Maximum loan amount: ${maxLoanAmount.toLocaleString()} (based on your financial profile)
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Minimum loan amount: $500,000. Maximum will be determined during review based on your $500K+ annual donation capacity.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="loanPurpose" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Loan Purpose
                </label>
                <select
                  id="loanPurpose"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                >
                  <option value="">Select purpose</option>
                  <option value="Charitable giving">Charitable giving</option>
                  <option value="Tax optimization">Tax optimization</option>
                  <option value="Estate planning">Estate planning</option>
                  <option value="Retirement planning">Retirement planning</option>
                  <option value="Capital gains optimization">Capital gains optimization</option>
                  <option value="IRA rollover">IRA rollover</option>
                  <option value="Business divestiture">Business divestiture</option>
                  <option value="Other">Other</option>
                </select>
                {loanPurpose === 'Other' && (
                  <textarea
                    id="loanPurposeOther"
                    value={loanPurposeOther}
                    onChange={(e) => setLoanPurposeOther(e.target.value)}
                    placeholder="Please describe the purpose of this loan..."
                    rows={3}
                    className="w-full mt-2 px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                )}
              </div>
            </div>
          </div>

          <TermsSection
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            onTermsChange={setTermsAccepted}
            onPrivacyChange={setPrivacyAccepted}
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/prospect/dashboard')}
              className="px-6 py-2 border border-[var(--border)] rounded text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
