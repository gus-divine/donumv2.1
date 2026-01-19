'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { createApplication } from '@/lib/api/applications';
import { 
  evaluateQualification, 
  getPlanDisplayName, 
  getPlanDescription, 
  getPlanBenefits,
  calculateSuggestedLoanAmount,
  formatCurrency
} from '@/lib/prequalify/qualification-logic';
import type { DonumPlan } from '@/lib/api/plans';

export default function PrequalifyPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<{
    qualified: boolean;
    qualifiedPlans: DonumPlan[];
    reasons: string[];
  } | null>(null);

  // Contact Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  // Qualification Information
  const [annualIncome, setAnnualIncome] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [age, setAge] = useState('');
  const [charitableIntent, setCharitableIntent] = useState<boolean | null>(null);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);

  // Asset type options (matching Donum 2.0)
  const assetTypeOptions = [
    { label: 'Stocks', value: 'stocks' },
    { label: 'Bonds', value: 'bonds' },
    { label: 'Real Estate', value: 'property' },
    { label: 'Business Equity', value: 'business' },
    { label: 'Cryptocurrency', value: 'cryptocurrency' },
    { label: 'Retirement Accounts (IRA)', value: 'IRA' },
    { label: 'Other', value: 'other' }
  ];

  useEffect(() => {
    if (user && session) {
      loadUserData();
    }
  }, [user, session]);

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
        setEmail(data.email || user.email || '');
        setPhone(data.phone || data.cell_phone || '');
        setCompany(data.company || '');
        
        // Pre-fill if available
        if (data.annual_income) {
          setAnnualIncome(data.annual_income.toString());
        }
        if (data.net_worth) {
          setTotalAssets(data.net_worth.toString());
        }
        if (data.date_of_birth) {
          // Calculate age from date of birth
          const birthDate = new Date(data.date_of_birth);
          const today = new Date();
          const calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            setAge((calculatedAge - 1).toString());
          } else {
            setAge(calculatedAge.toString());
          }
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetTypeToggle = (assetValue: string) => {
    setAssetTypes(prev =>
      prev.includes(assetValue)
        ? prev.filter(a => a !== assetValue)
        : [...prev, assetValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setShowResults(false);
    setQualificationResult(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your first and last name');
      setIsSubmitting(false);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      setIsSubmitting(false);
      return;
    }

    if (!annualIncome?.trim() || !totalAssets?.trim() || !age?.trim()) {
      setError('Please provide your annual income, total assets, and age');
      setIsSubmitting(false);
      return;
    }

    if (charitableIntent === null) {
      setError('Please indicate whether you have charitable giving intentions');
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

      // Parse numeric values
      const income = parseFloat(annualIncome.replace(/[^0-9.]/g, ''));
      const assets = parseFloat(totalAssets.replace(/[^0-9.]/g, ''));
      const ageNum = parseInt(age, 10);

      if (isNaN(income) || income <= 0) {
        setError('Please enter a valid annual income');
        setIsSubmitting(false);
        return;
      }

      if (isNaN(assets) || assets <= 0) {
        setError('Please enter valid total assets');
        setIsSubmitting(false);
        return;
      }

      if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        setError('Please enter a valid age (18-120)');
        setIsSubmitting(false);
        return;
      }

      // Evaluate qualification (fetches plans from database)
      const qualificationResult = await evaluateQualification({
        name: `${firstName} ${lastName}`,
        annualIncome: income,
        totalAssets: assets,
        netWorth: assets, // Alias
        age: ageNum,
        charitableIntent: charitableIntent ?? undefined,
        assetTypes: assetTypes.length > 0 ? assetTypes : undefined,
      });

      const qualified = qualificationResult.qualified;
      const qualifiedPlans = qualificationResult.qualifiedPlans; // Now DonumPlan objects from DB
      const qualificationReasons = qualificationResult.reasons;
      
      // Extract plan codes for application notes
      const qualifiedProducts = qualifiedPlans.map(p => p.code);

      // Update user account with basic info
      const { error: updateError } = await supabase
        .from('donum_accounts')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          annual_income: income,
          net_worth: assets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        // Continue anyway - application creation is more important
      }

      // Create prequalification application record
      try {
        await createApplication({
          applicant_id: authUser.id,
          annual_income: income,
          net_worth: assets,
          status: qualified ? 'submitted' : 'submitted', // Both create application, but qualification status stored in notes
          application_type: 'prequalification',
          purpose: 'Prequalification application',
          notes: `Qualified: ${qualified ? 'Yes' : 'No'}. Products: ${qualifiedProducts.join(', ') || 'none'}. Reasons: ${qualificationReasons.join('; ')}`,
          workflow_data: {
            qualified,
            qualified_plans: qualifiedProducts,
            qualification_reasons: qualificationReasons,
            asset_types: assetTypes,
            age: ageNum,
            charitable_intent: charitableIntent,
          },
        });
      } catch (appError) {
        console.error('Error creating application:', appError);
        setError('Failed to save your prequalification. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Show qualification results (with database plan objects)
      setQualificationResult({
        qualified,
        qualifiedPlans: qualifiedPlans, // Database plan objects
        reasons: qualificationReasons,
      });
      setShowResults(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--core-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <button
        onClick={() => router.push('/prospect/dashboard')}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        ← Back to Dashboard
      </button>
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Prequalification Form</h1>
          <p className="text-[var(--text-secondary)]">
            Donum serves high-net-worth individuals seeking sophisticated charitable financing solutions.
            Complete this brief form to determine your eligibility.
          </p>
        </div>

        {showResults && qualificationResult ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              {qualificationResult.qualified ? '✓ You May Qualify!' : 'You May Not Qualify'}
            </h2>
            
            {qualificationResult.qualified ? (
              <div className="mb-6">
                {/* Important Notice: These are suggestions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        Plan Suggestions (Not Final Assignment)
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        The plans shown below are <strong>suggestions</strong> based on your financial profile. 
                        Final plan assignment and customization will be determined by our team during application review. 
                        All plans require a minimum annual donation capacity of <strong>$500,000 or more</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[var(--text-secondary)] mb-4">
                  Based on your information, you may qualify for the following Donum plans:
                </p>
                <div className="space-y-4 mb-6">
                  {qualificationResult.qualifiedPlans.map((plan) => {
                    const incomeNum = annualIncome ? parseFloat(annualIncome) : undefined;
                    const assetsNum = totalAssets ? parseFloat(totalAssets) : undefined;
                    const loanAmounts = calculateSuggestedLoanAmount(plan, incomeNum, assetsNum);
                    const benefits = getPlanBenefits(plan);

                    return (
                      <div key={plan.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                            {getPlanDisplayName(plan)}
                          </h3>
                          <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                            {getPlanDescription(plan)}
                          </p>
                        </div>

                        {/* Plan Benefits */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                            Key Benefits:
                          </h4>
                          <ul className="space-y-1.5">
                            {benefits.map((benefit, idx) => (
                              <li key={idx} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Suggested Loan Amount */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                          <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                            Estimated Loan Amount Range:
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[var(--text-secondary)]">Range:</span>
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                {formatCurrency(loanAmounts.min)} - {formatCurrency(loanAmounts.max)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[var(--text-secondary)]">Suggested:</span>
                              <span className="text-base font-semibold text-green-800 dark:text-green-200">
                                {formatCurrency(loanAmounts.suggested)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                              * Final loan amounts are determined during application review based on your specific financial situation and charitable goals.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Next Steps:</strong> Complete your full application to proceed with the qualification process.
                    Our team will review your information and contact you shortly to discuss your specific loan amount and terms.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                    Based on the information provided, you may not meet our current qualification criteria.
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Donum serves high-net-worth individuals with specific financial thresholds. However, 
                    our team reviews all applications individually, and we encourage you to complete the 
                    full application for a comprehensive review.
                  </p>
                </div>
                {qualificationResult.reasons.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">Qualification Details:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
                      {qualificationResult.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/prospect/dashboard')}
                className="px-6 py-2 border border-[var(--border)] rounded text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
              >
                Go to Dashboard
              </button>
              {qualificationResult.qualified && (
                <button
                  type="button"
                  onClick={() => router.push('/prospect/application')}
                  className="px-6 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
                >
                  Complete Full Application
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information Section */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Company (Optional)
                </label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                />
              </div>
            </div>

            {/* Qualification Information Section */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Qualification Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="annualIncome" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Annual Income ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="annualIncome"
                    type="text"
                    value={annualIncome}
                    onChange={(e) => {
                      setAnnualIncome(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g., 250000"
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>

                <div>
                  <label htmlFor="totalAssets" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Total Assets ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="totalAssets"
                    type="text"
                    value={totalAssets}
                    onChange={(e) => {
                      setTotalAssets(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g., 1000000"
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setError(null);
                    }}
                    min="18"
                    max="120"
                    required
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)]"
                  />
                </div>
              </div>

              <div className="mb-4">
                <span className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Do you have charitable giving intentions? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-4">
                  <label htmlFor="charitableIntent-yes" className="flex items-center">
                    <input
                      id="charitableIntent-yes"
                      type="radio"
                      name="charitableIntent"
                      checked={charitableIntent === true}
                      onChange={() => {
                        setCharitableIntent(true);
                        setError(null);
                      }}
                      className="mr-2"
                    />
                    <span className="text-[var(--text-primary)]">Yes</span>
                  </label>
                  <label htmlFor="charitableIntent-no" className="flex items-center">
                    <input
                      id="charitableIntent-no"
                      type="radio"
                      name="charitableIntent"
                      checked={charitableIntent === false}
                      onChange={() => {
                        setCharitableIntent(false);
                        setError(null);
                      }}
                      className="mr-2"
                    />
                    <span className="text-[var(--text-primary)]">No</span>
                  </label>
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Asset Types (Select all that apply)
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {assetTypeOptions.map((option) => (
                    <label key={option.value} htmlFor={`assetType-${option.value}`} className="flex items-center">
                      <input
                        id={`assetType-${option.value}`}
                        type="checkbox"
                        checked={assetTypes.includes(option.value)}
                        onChange={() => handleAssetTypeToggle(option.value)}
                        className="mr-2"
                      />
                      <span className="text-[var(--text-primary)] text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

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
                  'Submit Prequalification'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
