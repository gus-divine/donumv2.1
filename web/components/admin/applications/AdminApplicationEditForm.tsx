'use client';

import { useState, useEffect } from 'react';
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
import { ProspectStaffAssignment } from '@/components/admin/shared/ProspectStaffAssignment';

interface AdminApplicationEditFormProps {
  applicationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminApplicationEditForm({ 
  applicationId, 
  onSuccess, 
  onCancel 
}: AdminApplicationEditFormProps) {
  const { user: currentUser, role: userRole } = useAuth();
  const { canEdit: canEditPage } = usePermissions('/admin/applications');
  const canEdit = canEditPage('/admin/applications');
  const [application, setApplication] = useState<Application | null>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStaffAssignment, setShowStaffAssignment] = useState(false);
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

  async function checkAccess() {
    if (!currentUser || !application) return;

    try {
      console.log('[AdminApplicationEditForm] Checking access:', {
        userId: currentUser.id,
        role: userRole,
        applicationId: application.id
      });

      // Super admin always has access
      if (userRole === 'donum_super_admin') {
        console.log('[AdminApplicationEditForm] Super admin - granting access');
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
        console.log('[AdminApplicationEditForm] Regular admin with canEdit - granting access');
        setHasAccess(true);
        return;
      }

      // Staff need to check assignments (prospect must be in their department AND staff assigned to prospect)
      if (userRole === 'donum_staff') {
        console.log('[AdminApplicationEditForm] Staff member - checking assignments');
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

        console.log('[AdminApplicationEditForm] Staff assignment check:', { isAssigned, hasDepartmentAccess });
        setHasAccess(isAssigned);
      } else {
        console.log('[AdminApplicationEditForm] Unknown role or no match - denying access:', userRole);
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

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    
    if (!canEdit) {
      setError('You do not have permission to edit applications');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!application || !applicant) {
        throw new Error('Application or applicant data missing');
      }

      // Prepare investment goals object
      const investmentGoalsObj: Record<string, boolean> = {};
      investmentGoals.forEach(goal => {
        investmentGoalsObj[goal] = true;
      });

      // Update user profile (personal info, financial info, investment profile)
      const userUpdate: UpdateUserInput = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: phone || undefined,
        date_of_birth: dateOfBirth || undefined,
        address_line_1: addressLine1 || undefined,
        address_line_2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        country: country || undefined,
        annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
        net_worth: netWorth ? parseFloat(netWorth) : undefined,
        tax_bracket: taxBracket || undefined,
        risk_tolerance: riskTolerance || undefined,
        investment_goals: investmentGoals.length > 0 ? investmentGoalsObj : undefined,
        marital_status: maritalStatus || undefined,
        dependents: dependents ? parseInt(dependents) : undefined,
      };

      await updateUser(applicant.id, userUpdate);

      // Update application (financial info, purpose, notes)
      const appUpdate: UpdateApplicationInput = {
        annual_income: annualIncome ? parseFloat(annualIncome) : undefined,
        net_worth: netWorth ? parseFloat(netWorth) : undefined,
        tax_bracket: taxBracket || undefined,
        risk_tolerance: riskTolerance || undefined,
        investment_goals: investmentGoals.length > 0 ? investmentGoalsObj : undefined,
        purpose: purpose || undefined,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        // Keep status as draft if it's draft, otherwise don't change it
        status: application.status === 'draft' ? 'draft' : undefined,
      };

      await updateApplication(application.id, appUpdate);

      // Reload data to get updated timestamps
      await loadData();
      onSuccess();
    } catch (err) {
      console.error('[AdminApplicationEditForm] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Applicant: {applicant.first_name || applicant.last_name 
              ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim()
              : applicant.email}
          </p>
        </div>
        <button
          onClick={() => setShowStaffAssignment(true)}
          className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors"
        >
          Manage Staff Assignments
        </button>
      </div>

      {/* Last Updated by Admin Message */}
      {lastUpdatedByAdmin && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Last updated by admin</strong> on {new Date(lastUpdatedByAdmin).toLocaleString()}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            The applicant must review and submit this application themselves to complete the process.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* Personal Information */}
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

        {/* Financial Information */}
        <FinancialInfoSection
          annualIncome={annualIncome}
          netWorth={netWorth}
          taxBracket={taxBracket}
          onAnnualIncomeChange={setAnnualIncome}
          onNetWorthChange={setNetWorth}
          onTaxBracketChange={setTaxBracket}
        />

        {/* Investment Profile */}
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

        {/* Application Details */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Application Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="requestedAmount" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Requested Amount
              </label>
              <input
                id="requestedAmount"
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Purpose
              </label>
              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                placeholder="Describe the purpose of this application..."
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Notes (Visible to Applicant)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                placeholder="Add notes visible to the applicant..."
              />
            </div>

            <div>
              <label htmlFor="internalNotes" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Internal Notes (Not visible to applicant)
              </label>
              <textarea
                id="internalNotes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
                placeholder="Add internal notes..."
              />
            </div>
          </div>
        </div>

        {/* Terms & Conditions - Disabled for Admin */}
        <TermsSection
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={() => {}} // No-op when disabled
          onPrivacyChange={() => {}} // No-op when disabled
          disabled={true}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canEdit}
            className="px-4 py-2 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </form>

      {/* Staff Assignment Modal */}
      {showStaffAssignment && (
        <ProspectStaffAssignment
          prospectId={application.applicant_id}
          prospectName={applicant.first_name || applicant.last_name
            ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim()
            : applicant.email}
          onClose={() => {
            setShowStaffAssignment(false);
            loadData(); // Reload to refresh assignments
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
