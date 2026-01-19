'use client';

import { useState, useEffect } from 'react';
import { createApplication, type CreateApplicationInput } from '@/lib/api/applications';
import { getUsers, type User } from '@/lib/api/users';
import { Select } from '@/components/ui/select';

interface CreateApplicationFormProps {
  onSuccess: (applicationId: string) => void;
  onCancel: () => void;
  submitRef?: React.RefObject<HTMLButtonElement | null>;
  onLoadingChange?: (loading: boolean) => void;
  showActions?: boolean;
  preselectedApplicantId?: string;
}

export function CreateApplicationForm({
  onSuccess,
  onCancel,
  submitRef,
  onLoadingChange,
  showActions = true,
  preselectedApplicantId,
}: CreateApplicationFormProps) {
  const [applicantId, setApplicantId] = useState(preselectedApplicantId || '');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [applicationType, setApplicationType] = useState('loan');
  const [initialStatus, setInitialStatus] = useState<'draft' | 'submitted'>('draft');
  
  // Financial info (optional)
  const [annualIncome, setAnnualIncome] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [taxBracket, setTaxBracket] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicantType, setApplicantType] = useState<'prospect' | 'member'>('prospect');
  const [prospects, setProspects] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [showApplicantDropdown, setShowApplicantDropdown] = useState(false);
  const [applicantSearchTerm, setApplicantSearchTerm] = useState('');

  useEffect(() => {
    loadApplicants();
  }, []);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Reset applicant selection when type changes
  useEffect(() => {
    setApplicantId('');
    setApplicantSearchTerm('');
    setShowApplicantDropdown(false);
  }, [applicantType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showApplicantDropdown && !target.closest('.applicant-dropdown-container')) {
        setShowApplicantDropdown(false);
      }
    }

    if (showApplicantDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showApplicantDropdown]);

  async function loadApplicants() {
    try {
      setLoadingApplicants(true);
      // Get both prospects (donum_prospect role) and members (donum_member role)
      const [prospectsData, membersData] = await Promise.all([
        getUsers({ role: 'donum_prospect' }),
        getUsers({ role: 'donum_member' })
      ]);
      setProspects(prospectsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading applicants:', err);
      setError('Failed to load prospects and members');
    } finally {
      setLoadingApplicants(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!applicantId) {
      setError(`Please select a ${applicantType === 'prospect' ? 'prospect' : 'member'}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const input: CreateApplicationInput = {
        applicant_id: applicantId,
        status: initialStatus,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
        application_type: applicationType,
        annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
        net_worth: netWorth ? parseFloat(netWorth) : undefined,
        tax_bracket: taxBracket || undefined,
      };

      const application = await createApplication(input);
      onSuccess(application.id);
    } catch (err) {
      console.error('Error creating application:', err);
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setLoading(false);
    }
  }

  // Get current applicant list based on type
  const currentApplicants = applicantType === 'prospect' ? prospects : members;
  
  // Filter applicants based on search (for the dropdown)
  const filteredApplicants = currentApplicants.filter(applicant => {
    if (!applicantSearchTerm) return true;
    const searchLower = applicantSearchTerm.toLowerCase();
    return (
      applicant.email?.toLowerCase().includes(searchLower) ||
      applicant.first_name?.toLowerCase().includes(searchLower) ||
      applicant.last_name?.toLowerCase().includes(searchLower) ||
      applicant.name?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected applicant display name
  const selectedApplicant = currentApplicants.find(a => a.id === applicantId);
  const selectedApplicantDisplay = selectedApplicant 
    ? `${selectedApplicant.name || selectedApplicant.first_name || 'Unknown'} - ${selectedApplicant.email}`
    : '';

  // Reset applicant search when type changes
  useEffect(() => {
    setApplicantSearchTerm('');
    setShowApplicantDropdown(false);
  }, [applicantType]);

  if (loadingApplicants) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--core-blue)] border-t-transparent mb-4"></div>
        <p className="text-[var(--text-secondary)] font-medium">Loading prospects and members...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Applicant Selection */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Select Applicant</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Choose the prospect or member this application is for.
        </p>
        
        <div className="space-y-4">
          {/* Applicant Type Selection */}
          <div className="space-y-2">
            <label htmlFor="applicant-type" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Applicant Type
            </label>
            <Select
              id="applicant-type"
              value={applicantType}
              onChange={(e) => setApplicantType(e.target.value as 'prospect' | 'member')}
              options={[
                { value: 'prospect', label: 'Prospect' },
                { value: 'member', label: 'Member' },
              ]}
              className="w-full"
            />
          </div>

          {/* Applicant Select - Searchable Dropdown */}
          <div className="space-y-2 applicant-dropdown-container">
            <label htmlFor="applicant-id" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {applicantType === 'prospect' ? 'Prospect' : 'Member'} *
            </label>
            <div className="relative">
              {/* Display selected applicant or placeholder */}
              <button
                type="button"
                onClick={() => !preselectedApplicantId && setShowApplicantDropdown(!showApplicantDropdown)}
                disabled={!!preselectedApplicantId}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={selectedApplicantDisplay ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                  {selectedApplicantDisplay || `Select a ${applicantType === 'prospect' ? 'prospect' : 'member'}...`}
                </span>
                <svg
                  className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${showApplicantDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showApplicantDropdown && !preselectedApplicantId && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
                  {/* Search input inside dropdown */}
                  <div className="p-2 border-b border-[var(--border)]">
                    <div className="relative">
                      <input
                        type="text"
                        value={applicantSearchTerm}
                        onChange={(e) => setApplicantSearchTerm(e.target.value)}
                        placeholder={`Search ${applicantType === 'prospect' ? 'prospects' : 'members'}...`}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Results list */}
                  <div className="overflow-y-auto max-h-64">
                    {filteredApplicants.length === 0 ? (
                      <div className="p-4 text-sm text-[var(--text-secondary)] text-center">
                        {applicantSearchTerm 
                          ? `No ${applicantType === 'prospect' ? 'prospects' : 'members'} found matching "${applicantSearchTerm}"`
                          : `No ${applicantType === 'prospect' ? 'prospects' : 'members'} available`
                        }
                      </div>
                    ) : (
                      filteredApplicants.map((applicant) => (
                        <button
                          key={applicant.id}
                          type="button"
                          onClick={() => {
                            setApplicantId(applicant.id);
                            setShowApplicantDropdown(false);
                            setApplicantSearchTerm('');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--border)] last:border-b-0"
                        >
                          <div className="font-medium">{applicant.name || applicant.first_name || 'Unknown'}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{applicant.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentApplicants.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No {applicantType === 'prospect' ? 'prospects' : 'members'} available. Create a {applicantType === 'prospect' ? 'prospect' : 'member'} first before creating an application.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Application Details */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Application Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Application Type */}
          <div className="space-y-2">
            <label htmlFor="application-type" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Application Type
            </label>
            <Select
              id="application-type"
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value)}
              options={[
                { value: 'loan', label: 'Loan Application' },
                { value: 'prequalification', label: 'Prequalification' },
                { value: 'refinance', label: 'Refinance' },
              ]}
              className="w-full"
            />
          </div>

          {/* Initial Status */}
          <div className="space-y-2">
            <label htmlFor="initial-status" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Initial Status
            </label>
            <Select
              id="initial-status"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as 'draft' | 'submitted')}
              options={[
                { value: 'draft', label: 'Draft - Save for later' },
                { value: 'submitted', label: 'Submitted - Ready for review' },
              ]}
              className="w-full"
            />
          </div>

          {/* Requested Amount */}
          <div className="space-y-2">
            <label htmlFor="requested-amount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Requested Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
              <input
                id="requested-amount"
                type="number"
                step="0.01"
                min="0"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div className="mt-6 space-y-2">
          <label htmlFor="purpose" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Purpose
          </label>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
            placeholder="Describe the purpose of this application..."
          />
        </div>

        {/* Notes */}
        <div className="mt-6 space-y-2">
          <label htmlFor="notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
            placeholder="Add any additional notes..."
          />
        </div>
      </div>

      {/* Financial Information (Optional) */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Financial Information</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Optional - can be filled in later during the application process.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Annual Income */}
          <div className="space-y-2">
            <label htmlFor="annual-income" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
              <input
                id="annual-income"
                type="number"
                step="0.01"
                min="0"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Net Worth */}
          <div className="space-y-2">
            <label htmlFor="net-worth" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Net Worth
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
              <input
                id="net-worth"
                type="number"
                step="0.01"
                min="0"
                value={netWorth}
                onChange={(e) => setNetWorth(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Tax Bracket */}
          <div className="space-y-2">
            <label htmlFor="tax-bracket" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Tax Bracket
            </label>
            <Select
              id="tax-bracket"
              value={taxBracket}
              onChange={(e) => setTaxBracket(e.target.value)}
              options={[
                { value: '', label: 'Select tax bracket...' },
                { value: '10%', label: '10%' },
                { value: '12%', label: '12%' },
                { value: '22%', label: '22%' },
                { value: '24%', label: '24%' },
                { value: '32%', label: '32%' },
                { value: '35%', label: '35%' },
                { value: '37%', label: '37%' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Hidden submit button for external triggering */}
      <button
        ref={submitRef}
        type="submit"
        className="hidden"
        disabled={loading}
      />

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--core-gold)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !applicantId}
            className="px-4 py-2 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                Creating...
              </span>
            ) : (
              'Create Application'
            )}
          </button>
        </div>
      )}
    </form>
  );
}
