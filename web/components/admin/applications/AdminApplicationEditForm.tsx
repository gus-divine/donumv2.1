'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  updateApplication, 
  type Application, 
  type UpdateApplicationInput,
  getApplication
} from '@/lib/api/applications';
import { getUser, updateUser, type UpdateUserInput } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { getProspectStaffAssignments } from '@/lib/api/prospect-staff-assignments';
import { getMemberDepartments } from '@/lib/api/department-members';
import { PersonalInfoSection } from '@/components/prospect/prequalify/PersonalInfoSection';
import { FinancialInfoSection } from '@/components/prospect/prequalify/FinancialInfoSection';
import { InvestmentProfileSection } from '@/components/prospect/prequalify/InvestmentProfileSection';
import { TermsSection } from '@/components/prospect/prequalify/TermsSection';

interface AdminApplicationEditFormProps {
  applicationId: string;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveReady?: (saveHandler: () => Promise<void>) => void;
}

export function AdminApplicationEditForm({ 
  applicationId, 
  onSuccess, 
  onCancel,
  onSavingChange,
  onSaveReady
}: AdminApplicationEditFormProps) {
  const { user: currentUser, role: userRole } = useAuth();
  const { canEdit: canEditPage } = usePermissions('/admin/applications');
  const canEdit = canEditPage('/admin/applications');
  const [application, setApplication] = useState<Application | null>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Form state - Personal Info
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

  // Form state - Financial Info
  const [annualIncome, setAnnualIncome] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [taxBracket, setTaxBracket] = useState('');

  // Form state - Investment Profile
  const [riskTolerance, setRiskTolerance] = useState('');
  const [investmentGoals, setInvestmentGoals] = useState<string[]>([]);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [dependents, setDependents] = useState('');
  const [hearAbout, setHearAbout] = useState('');

  // Form state - Terms (disabled for admin)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Form state - Application specific
  const [purpose, setPurpose] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (applicationId) {
      loadData();
    }
  }, [applicationId]);

  useEffect(() => {
    if (application && currentUser) {
      checkAccess();
    }
  }, [application, currentUser]);

  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(saving);
    }
  }, [saving, onSavingChange]);

  async function checkAccess() {
    if (!currentUser || !application) return;

    try {
      // Super admin always has access
      if (userRole === 'donum_super_admin') {
        setHasAccess(true);
        return;
      }

      // If user doesn't have edit permission, deny access
      if (!canEdit) {
        setHasAccess(false);
        return;
      }

      // Regular admins with canEdit permission have access
      if (userRole === 'donum_admin') {
        setHasAccess(true);
        return;
      }

      // Staff need to check assignments (prospect must be in their department AND staff assigned to prospect)
      if (userRole === 'donum_staff') {
        const applicantId = application.applicant_id;
        if (!applicantId) {
          setHasAccess(false);
          return;
        }

        // Check if prospect is assigned to staff's department
        const memberDepartments = await getMemberDepartments(applicantId);
        const userDepartments = currentUser.departments || [];
        const hasDepartmentAccess = memberDepartments.some(dept => userDepartments.includes(dept));

        if (!hasDepartmentAccess) {
          setHasAccess(false);
          return;
        }

        // Check if staff is assigned to prospect
        const assignments = await getProspectStaffAssignments(applicantId);
        const isAssigned = assignments.some(a => a.staff_id === currentUser.id && a.is_active);

        setHasAccess(isAssigned);
      } else {
        setHasAccess(false);
      }
    } catch (err) {
      console.error('[AdminApplicationEditForm] Error checking access:', err);
      setHasAccess(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [appData, applicantData] = await Promise.all([
        getApplication(applicationId),
        // We'll get applicant from the application data
        Promise.resolve(null)
      ]);

      if (!appData) {
        setError('Application not found');
        return;
      }

      setApplication(appData);

      // Load applicant data
      if (appData.applicant_id) {
        const applicantUser = await getUser(appData.applicant_id);
        if (applicantUser) {
          setApplicant(applicantUser);
          
          // Populate form from applicant data
          setFirstName(applicantUser.first_name || '');
          setLastName(applicantUser.last_name || '');
          setPhone(applicantUser.phone || applicantUser.cell_phone || '');
          setDateOfBirth(applicantUser.date_of_birth || '');
          setAddressLine1(applicantUser.address_line_1 || '');
          setAddressLine2(applicantUser.address_line_2 || '');
          setCity(applicantUser.city || '');
          setState(applicantUser.state || '');
          setZipCode(applicantUser.zip_code || '');
          setCountry(applicantUser.country || 'US');
          setAnnualIncome(applicantUser.annual_income?.toString() || appData.annual_income?.toString() || '');
          setNetWorth(applicantUser.net_worth?.toString() || appData.net_worth?.toString() || '');
          setTaxBracket(applicantUser.tax_bracket || appData.tax_bracket || '');
          setRiskTolerance(applicantUser.risk_tolerance || appData.risk_tolerance || '');
          setMaritalStatus(applicantUser.marital_status || '');
          setDependents(applicantUser.dependents?.toString() || '');
          
          if (applicantUser.investment_goals && typeof applicantUser.investment_goals === 'object') {
            const goals = Object.keys(applicantUser.investment_goals).filter(
              key => applicantUser.investment_goals![key] === true
            );
            setInvestmentGoals(goals);
          } else if (appData.investment_goals && typeof appData.investment_goals === 'object') {
            const goals = Object.keys(appData.investment_goals).filter(
              key => appData.investment_goals![key] === true
            );
            setInvestmentGoals(goals);
          }

          setTermsAccepted(applicantUser.terms_accepted || false);
          setPrivacyAccepted(applicantUser.privacy_policy_accepted || false);
        }
      }

      // Populate application-specific fields
      setPurpose(appData.purpose || '');
      setRequestedAmount(appData.requested_amount?.toString() || '');
      setNotes(appData.notes || '');
      setInternalNotes(appData.internal_notes || '');

    } catch (err) {
      console.error('[AdminApplicationEditForm] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  }

  function handleInvestmentGoalToggle(goal: string) {
    setInvestmentGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  }

  const handleSaveDraft = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!canEdit) {
      setError('You do not have permission to edit applications');
      return;
    }

    setSaving(true);
    setError(null);

    try {

      // Prepare investment goals object
      const investmentGoalsObj: Record<string, boolean> = {};
      investmentGoals.forEach(goal => {
        investmentGoalsObj[goal] = true;
      });

      // Update user profile (personal info, financial info, investment profile)
      const userUpdate: UpdateUserInput = {
        first_name: firstName !== '' ? firstName : undefined,
        last_name: lastName !== '' ? lastName : undefined,
        phone: phone !== '' ? phone : undefined,
        date_of_birth: dateOfBirth !== '' ? dateOfBirth : undefined,
        address_line_1: addressLine1 !== '' ? addressLine1 : undefined,
        address_line_2: addressLine2 !== '' ? addressLine2 : undefined,
        city: city !== '' ? city : undefined,
        state: state !== '' ? state : undefined,
        zip_code: zipCode !== '' ? zipCode : undefined,
        country: country !== '' ? country : undefined,
        annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
        net_worth: netWorth ? parseFloat(netWorth) : undefined,
        tax_bracket: taxBracket !== '' ? taxBracket : undefined,
        risk_tolerance: riskTolerance !== '' ? riskTolerance : undefined,
        investment_goals: investmentGoals.length > 0 ? investmentGoalsObj : undefined,
        marital_status: maritalStatus !== '' ? maritalStatus : undefined,
        dependents: dependents ? parseInt(dependents) : undefined,
      };

      const updatedUser = await updateUser(applicant.id, userUpdate);

      // Update application (financial info, purpose, notes)
      const appUpdate: UpdateApplicationInput = {
        annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
        net_worth: netWorth ? parseFloat(netWorth) : undefined,
        tax_bracket: taxBracket !== '' ? taxBracket : undefined,
        risk_tolerance: riskTolerance !== '' ? riskTolerance : undefined,
        investment_goals: investmentGoals.length > 0 ? investmentGoalsObj : undefined,
        purpose: purpose !== '' ? purpose : undefined,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
        notes: notes !== '' ? notes : undefined,
        internal_notes: internalNotes !== '' ? internalNotes : undefined,
        // Keep status as draft if it's draft, otherwise don't change it
        status: application.status === 'draft' ? 'draft' : undefined,
      };

      await updateApplication(application.id, appUpdate);

      // Additional delay to ensure database has fully propagated changes before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call onSuccess callback (which will navigate back to detail page)
      await onSuccess();
    } catch (err) {
      console.error('[AdminApplicationEditForm] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [
    canEdit, firstName, lastName, phone, dateOfBirth, addressLine1, addressLine2, city, state, zipCode, country,
    annualIncome, netWorth, taxBracket, riskTolerance, investmentGoals, maritalStatus, dependents,
    purpose, requestedAmount, notes, internalNotes, application, applicant, onSuccess
  ]);

  // Expose save handler to parent (must be after handleSaveDraft is defined)
  useEffect(() => {
    if (onSaveReady && application && applicant) {
      onSaveReady(async () => {
        await handleSaveDraft();
      });
    }
  }, [onSaveReady, application, applicant, handleSaveDraft]);

  if (loading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--text-secondary)]">Loading application...</p>
      </div>
    );
  }

  // Check access control
  // Super admin always has access (canEdit handles this)
  // Staff need both canEdit permission AND prospect-staff assignment
  if (!canEdit) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">Access Denied</p>
        <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
          You do not have permission to edit applications.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // For staff (not super admin), check prospect-staff assignments
  if (userRole !== 'donum_super_admin' && hasAccess === false) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">Access Denied</p>
        <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
          You do not have permission to edit this application. The prospect must be assigned to your department 
          and you must be assigned to the prospect.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={onCancel}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!application || !applicant) {
    return (
      <div className="p-4">
        <p className="text-[var(--text-secondary)]">Application or applicant data not found</p>
        <button
          onClick={onCancel}
          className="mt-2 px-4 py-2 bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Format last updated by admin message
  const lastUpdatedByAdmin = application.updated_by && application.updated_by !== application.applicant_id
    ? application.updated_at
    : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSaveDraft(e); }} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
      {/* Personal Information */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h3>
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
      </div>

      {/* Financial Information */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Financial Information</h3>
        <FinancialInfoSection
          annualIncome={annualIncome}
          netWorth={netWorth}
          taxBracket={taxBracket}
          onAnnualIncomeChange={setAnnualIncome}
          onNetWorthChange={setNetWorth}
          onTaxBracketChange={setTaxBracket}
        />
      </div>

      {/* Investment Profile */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Investment Profile</h3>
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
      </div>

      {/* Application Details */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Application Details</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="requestedAmount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Requested Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
              <input
                id="requestedAmount"
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <label htmlFor="notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Notes (Visible to Applicant)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
              placeholder="Add notes visible to the applicant..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="internalNotes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Internal Notes (Staff Only)
            </label>
            <textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
              placeholder="Add internal notes for staff only..."
            />
          </div>
        </div>
      </div>

      {/* Terms & Conditions - Disabled for Admin */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Terms & Conditions</h3>
        <TermsSection
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={() => {}} // No-op when disabled
          onPrivacyChange={() => {}} // No-op when disabled
          disabled={true}
        />
      </div>
    </form>
  );
}
