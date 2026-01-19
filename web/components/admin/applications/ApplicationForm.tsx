'use client';

import { useState, useEffect } from 'react';
import { 
  updateApplication, 
  type Application, 
  type UpdateApplicationInput,
  type ApplicationStatus,
  APPLICATION_STATUSES,
  approveApplication,
  rejectApplication,
  submitApplication,
  fundApplication
} from '@/lib/api/applications';
import { getUsers, type User } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { ProspectStaffAssignment } from '@/components/admin/shared/ProspectStaffAssignment';
import { getProspectStaffAssignments, assignStaffToProspect, unassignStaffFromProspect } from '@/lib/api/prospect-staff-assignments';
import { getAllPlans, type DonumPlan } from '@/lib/api/plans';
import { 
  getActiveApplicationPlan, 
  assignPlanToApplication,
  deleteApplicationPlan,
  type ApplicationPlan 
} from '@/lib/api/application-plans';
import { Select } from '@/components/ui/select';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { CreateLoanFromApplication } from '@/components/admin/loans/CreateLoanFromApplication';
import { useRouter } from 'next/navigation';
import DocumentList from '@/components/admin/documents/DocumentList';
import DocumentUpload from '@/components/documents/DocumentUpload';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ApplicationFormProps {
  application: Application;
  onSuccess: () => void;
  onCancel: () => void;
  viewMode?: boolean; // If true, show read-only status with action buttons
}

export function ApplicationForm({ application, onSuccess, onCancel, viewMode = false }: ApplicationFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [requestedAmount, setRequestedAmount] = useState(application.requested_amount?.toString() || '');
  const [purpose, setPurpose] = useState(application.purpose || '');
  const [notes, setNotes] = useState(application.notes || '');
  const [internalNotes, setInternalNotes] = useState(application.internal_notes || '');
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>(application.assigned_departments || []);
  const [primaryStaffId, setPrimaryStaffId] = useState(application.primary_staff_id || '');
  const [rejectionReason, setRejectionReason] = useState(application.rejection_reason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showStaffAssignment, setShowStaffAssignment] = useState(false);
  const [prospectAssignments, setProspectAssignments] = useState<any[]>([]);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>('');
  const [newAssignmentStaffId, setNewAssignmentStaffId] = useState<string>('');
  const [newAssignmentNotes, setNewAssignmentNotes] = useState<string>('');
  const [showPrequalification, setShowPrequalification] = useState(() => {
    // Show by default if prequalification data exists
    const workflowData = application.workflow_data as any;
    return workflowData && typeof workflowData === 'object' && Object.keys(workflowData).length > 0;
  });
  
  // Plan assignment state
  const [plans, setPlans] = useState<DonumPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [customLoanAmount, setCustomLoanAmount] = useState<string>('');
  const [customMaxAmount, setCustomMaxAmount] = useState<string>('');
  const [planNotes, setPlanNotes] = useState<string>('');
  const [currentApplicationPlan, setCurrentApplicationPlan] = useState<ApplicationPlan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Update state when application prop changes (e.g., after edit)
  useEffect(() => {
    setStatus(application.status);
    setRequestedAmount(application.requested_amount?.toString() || '');
    setPurpose(application.purpose || '');
    setNotes(application.notes || '');
    setInternalNotes(application.internal_notes || '');
    setAssignedDepartments(application.assigned_departments || []);
    setPrimaryStaffId(application.primary_staff_id || '');
    setRejectionReason(application.rejection_reason || '');
    
    // Update prequalification visibility
    const workflowData = application.workflow_data as any;
    if (workflowData && typeof workflowData === 'object' && Object.keys(workflowData).length > 0) {
      setShowPrequalification(true);
    }
    
    // Reload plan assignment when application changes
    getActiveApplicationPlan(application.id)
      .then(plan => {
        if (plan) {
          setCurrentApplicationPlan(plan);
          setSelectedPlanCode(plan.plan_code);
          setCustomLoanAmount(plan.custom_loan_amount?.toString() || '');
          setCustomMaxAmount(plan.custom_max_amount?.toString() || '');
          setPlanNotes(plan.notes || '');
        } else {
          setCurrentApplicationPlan(null);
          setSelectedPlanCode('');
          setCustomLoanAmount('');
          setCustomMaxAmount('');
          setPlanNotes('');
        }
      })
      .catch(() => {
        setCurrentApplicationPlan(null);
        setSelectedPlanCode('');
      });
    
    // Reload staff assignments
    if (application.applicant_id) {
      getProspectStaffAssignments(application.applicant_id)
        .then(setProspectAssignments)
        .catch(() => setProspectAssignments([]));
    }
  }, [
    application.id, 
    application.status, 
    application.applicant_id,
    application.applicant?.first_name,
    application.applicant?.last_name,
    application.applicant?.name,
    application.requested_amount,
    application.purpose,
    application.notes,
    application.internal_notes,
    application.assigned_departments,
    application.primary_staff_id,
    application.rejection_reason
  ]);

  async function loadData() {
    try {
      const [deptsData, staffData, assignmentsData, plansData, applicationPlan] = await Promise.all([
        getDepartments(),
        getUsers({ role: 'donum_staff' }),
        getProspectStaffAssignments(application.applicant_id).catch(() => []),
        getAllPlans(false), // Only active plans
        getActiveApplicationPlan(application.id).catch(() => null)
      ]);
      setDepartments(deptsData);
      setStaff(staffData.filter(u => u.role === 'donum_staff' || u.role === 'donum_admin'));
      setProspectAssignments(assignmentsData);
      setPlans(plansData);
      
      // Load existing plan assignment
      if (applicationPlan) {
        setCurrentApplicationPlan(applicationPlan);
        setSelectedPlanCode(applicationPlan.plan_code);
        setCustomLoanAmount(applicationPlan.custom_loan_amount?.toString() || '');
        setCustomMaxAmount(applicationPlan.custom_max_amount?.toString() || '');
        setPlanNotes(applicationPlan.notes || '');
      }
    } catch (err) {
      console.error('Error loading form data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update application
      const input: UpdateApplicationInput = {
        status,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        assigned_departments: assignedDepartments.length > 0 ? assignedDepartments : undefined,
        primary_staff_id: primaryStaffId || null,
        rejection_reason: status === 'rejected' ? rejectionReason : undefined,
      };

      await updateApplication(application.id, input);

      // Assign/update plan if selected
      if (selectedPlanCode) {
        await assignPlanToApplication(application.id, selectedPlanCode, {
          custom_loan_amount: customLoanAmount ? parseFloat(customLoanAmount) : undefined,
          custom_max_amount: customMaxAmount ? parseFloat(customMaxAmount) : undefined,
          notes: planNotes || undefined,
        });
      }

      onSuccess();
    } catch (err) {
      console.error('[ApplicationForm] Error saving application:', err);
      setError(err instanceof Error ? err.message : 'Failed to save application');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusAction(action: 'submit' | 'approve' | 'reject' | 'fund') {
    // For reject action, prompt for rejection reason if not provided
    if (action === 'reject') {
      if (!rejectionReason.trim()) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason || !reason.trim()) {
          setError('Rejection reason is required');
          return;
        }
        setRejectionReason(reason.trim());
      }
    }

    setLoading(true);
    setError(null);

    try {
      let updatedApp: Application;
      if (action === 'submit') {
        updatedApp = await submitApplication(application.id);
      } else if (action === 'approve') {
        updatedApp = await approveApplication(application.id);
      } else if (action === 'reject') {
        const reasonToUse = rejectionReason.trim() || prompt('Please provide a reason for rejection:') || '';
        if (!reasonToUse.trim()) {
          setError('Rejection reason is required');
          setLoading(false);
          return;
        }
        updatedApp = await rejectApplication(application.id, reasonToUse);
      } else if (action === 'fund') {
        updatedApp = await fundApplication(application.id);
      } else {
        throw new Error('Unknown action');
      }
      
      // Update local status state
      setStatus(updatedApp.status);
      onSuccess();
    } catch (err) {
      console.error('[ApplicationForm] Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update application status');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--core-blue)] border-t-transparent mb-4"></div>
        <p className="text-[var(--text-secondary)] font-medium">Loading application data...</p>
      </div>
    );
  }

  // Determine available quick actions based on current status
  const getAvailableActions = () => {
    const actions: Array<{ action: 'submit' | 'approve' | 'reject' | 'fund'; label: string; variant: 'primary' | 'success' | 'danger' }> = [];
    
    if (status === 'draft') {
      actions.push({ action: 'submit', label: 'Submit Application', variant: 'primary' });
    }
    if (status === 'submitted' || status === 'under_review' || status === 'document_collection') {
      actions.push({ action: 'approve', label: 'Approve', variant: 'success' });
      actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
    }
    if (status === 'approved') {
      actions.push({ action: 'fund', label: 'Fund Application', variant: 'success' });
    }
    
    return actions;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Action Buttons - Show in view mode */}
      {viewMode && getAvailableActions().length > 0 && (
        <div className="border-b border-[var(--border)] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Quick Actions</h3>
              <p className="text-sm text-[var(--text-secondary)]">Perform common actions on this application</p>
            </div>
            <div className="flex items-center gap-2">
              {getAvailableActions().map(({ action, label, variant }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleStatusAction(action)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    variant === 'primary'
                      ? 'text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:bg-[var(--surface-hover)]'
                      : variant === 'success'
                      ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  {loading ? 'Processing...' : label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Prospect Status */}
      <div className="pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status:</span>
          <StatusSelect
            value={status}
            onChange={async (newStatus) => {
              setStatus(newStatus);
              setLoading(true);
              try {
                await updateApplication(application.id, { status: newStatus });
                await loadData();
              } catch (err) {
                console.error('Error updating status:', err);
                setError(err instanceof Error ? err.message : 'Failed to update status');
                setStatus(application.status); // Revert on error
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          />
        </div>
      </div>

      {/* Actions - Only show when NOT in view mode */}
      {!viewMode && (
        <div className="flex items-center justify-end gap-3 pb-6 border-b border-[var(--border)] mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          {application.status === 'draft' && (
            <button
              type="button"
              onClick={() => handleStatusAction('submit')}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Application
            </button>
          )}
          {application.status === 'under_review' && (
            <>
              <button
                type="button"
                onClick={() => handleStatusAction('approve')}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleStatusAction('reject')}
                disabled={loading || !rejectionReason.trim()}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </>
          )}
          {application.status === 'approved' && (
            <button
              type="button"
              onClick={() => handleStatusAction('fund')}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark as Funded
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--core-blue)] border-t-transparent"></span>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      {/* Application Info */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Application Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Application Number</span>
            <p className="text-[var(--text-primary)] font-mono text-sm">{application.application_number}</p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Applicant</span>
            <p className="text-[var(--text-primary)] font-medium">
              {application.applicant?.name || application.applicant?.email || 'Unknown'}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{application.applicant?.email}</p>
            {application.applicant_id && (
              <button
                type="button"
                onClick={() => router.push(`/admin/prospects?search=${encodeURIComponent(application.applicant?.email || '')}`)}
                className="text-xs text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 hover:underline mt-1 transition-colors"
              >
                View Prospect Profile →
              </button>
            )}
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Created</span>
            <p className="text-[var(--text-primary)] text-sm">{formatDate(application.created_at)}</p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Last Updated</span>
            <p className="text-[var(--text-primary)] text-sm">{formatDate(application.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Financial Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            {viewMode ? (
              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Requested Amount
              </span>
            ) : (
              <label htmlFor="requested-amount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Requested Amount
              </label>
            )}
            {viewMode ? (
              <p className="text-[var(--text-primary)] font-medium text-lg">
                {formatCurrency(parseFloat(requestedAmount) || 0)}
              </p>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
                <input
                  id="requested-amount"
                  type="number"
                  step="0.01"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Annual Income</span>
            <p className="text-[var(--text-primary)] font-medium">{formatCurrency(application.annual_income)}</p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Net Worth</span>
            <p className="text-[var(--text-primary)] font-medium">{formatCurrency(application.net_worth)}</p>
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tax Bracket</span>
            <p className="text-[var(--text-primary)] font-medium">{application.tax_bracket || '-'}</p>
          </div>
        </div>

        {/* Prequalification Results */}
        {application.workflow_data && typeof application.workflow_data === 'object' && Object.keys(application.workflow_data).length > 0 && (
          <div className="mt-6 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Prequalified</h4>
              <button
                type="button"
                onClick={() => {
                  setShowPrequalification(!showPrequalification);
                }}
                className="flex items-center gap-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                {showPrequalification ? (
                  <>
                    Hide
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {showPrequalification && (
              <div className="space-y-4">
                {(() => {
                  const workflowData = application.workflow_data as any;
                  const qualified = workflowData?.qualified;
                  const qualifiedPlans = workflowData?.qualified_plans || [];
                  const qualificationReasons = workflowData?.qualification_reasons || [];
                  const assetTypes = workflowData?.asset_types || [];
                  const age = workflowData?.age;
                  const charitableIntent = workflowData?.charitable_intent;

                  // If no prequalification data, show a message
                  if (qualified === undefined && qualifiedPlans.length === 0 && qualificationReasons.length === 0 && !age && charitableIntent === undefined && assetTypes.length === 0) {
                    return (
                      <div className="text-sm text-[var(--text-secondary)]">
                        No prequalification data available
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {qualified !== undefined && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Qualified</span>
                            <p className={`text-sm font-medium ${qualified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {qualified ? 'Yes' : 'No'}
                            </p>
                          </div>
                          {age && (
                            <div className="space-y-1">
                              <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Age</span>
                              <p className="text-sm text-[var(--text-primary)]">{age}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {qualifiedPlans.length > 0 && (
                        <div className="space-y-1">
                          <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Plans</span>
                          <div className="flex flex-wrap gap-2">
                            {qualifiedPlans.map((plan: string) => (
                              <span
                                key={plan}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-green-600 dark:text-green-400"
                              >
                                {plan}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {qualificationReasons.length > 0 && (
                        <div className="space-y-1">
                          <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Reasons</span>
                          <ul className="list-disc list-inside space-y-1">
                            {qualificationReasons.map((reason: string, index: number) => (
                              <li key={index} className="text-sm text-[var(--text-primary)]">{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {assetTypes.length > 0 && (
                        <div className="space-y-1">
                          <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Assets</span>
                          <div className="flex flex-wrap gap-2">
                            {assetTypes.map((asset: string) => (
                              <span
                                key={asset}
                                className="inline-flex items-center px-2 py-1 rounded text-xs text-[var(--text-secondary)]"
                              >
                                {asset}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {charitableIntent !== undefined && (
                        <div className="space-y-1">
                          <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Charitable Intent</span>
                          <p className="text-sm text-[var(--text-primary)]">{charitableIntent ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Donum Management Section */}
      <div className="pt-6 border-t-2 border-[var(--core-blue)]">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Donum Internal Management</h2>
        
        {/* Donum Plan */}
        <div className="pb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Donum Plan</h3>
        <div className="space-y-6">
          <div>
            <label htmlFor="plan-code" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Donum Plan
            </label>
            <Select
              id="plan-code"
              value={selectedPlanCode}
              onChange={async (e) => {
                const newPlanCode = e.target.value;
                setSelectedPlanCode(newPlanCode);
                setLoading(true);
                try {
                  if (newPlanCode) {
                    // Assign or update plan
                    await assignPlanToApplication(application.id, newPlanCode, {
                      custom_loan_amount: customLoanAmount ? parseFloat(customLoanAmount) : undefined,
                      custom_max_amount: customMaxAmount ? parseFloat(customMaxAmount) : undefined,
                      notes: planNotes || undefined,
                    });
                  } else if (currentApplicationPlan) {
                    // Remove plan assignment
                    await deleteApplicationPlan(currentApplicationPlan.id);
                    setCustomLoanAmount('');
                    setCustomMaxAmount('');
                    setPlanNotes('');
                  }
                  await loadData();
                } catch (err) {
                  console.error('Error assigning plan:', err);
                  setError(err instanceof Error ? err.message : 'Failed to assign plan');
                  setSelectedPlanCode(selectedPlanCode); // Revert on error
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              options={[
                { value: '', label: 'No plan assigned' },
                ...plans.map((plan) => ({
                  value: plan.code,
                  label: `${plan.name}${plan.description ? ` - ${plan.description}` : ''}`
                }))
              ]}
              className="w-full"
            />
            {currentApplicationPlan && (
              <p className="mt-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] px-3 py-1.5 rounded-md inline-block">
                Currently assigned: <span className="font-medium">{currentApplicationPlan.plan_code}</span>
                {currentApplicationPlan.assigned_at && ` • ${formatDate(currentApplicationPlan.assigned_at)}`}
              </p>
            )}
          </div>

          {selectedPlanCode && !viewMode && (
            <div className="pt-6 border-t border-[var(--border)] space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="custom-loan-amount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Custom Loan Amount (Override)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
                    <input
                      id="custom-loan-amount"
                      type="number"
                      step="0.01"
                      value={customLoanAmount}
                      onChange={(e) => setCustomLoanAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                      placeholder="Leave empty to use plan default"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Override the default loan amount for this prospect
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="custom-max-amount" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Custom Max Amount (Override)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
                    <input
                      id="custom-max-amount"
                      type="number"
                      step="0.01"
                      value={customMaxAmount}
                      onChange={(e) => setCustomMaxAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                      placeholder="Leave empty to use plan default"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Override the maximum loan amount for this prospect
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="plan-notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Plan Notes
                </label>
                <textarea
                  id="plan-notes"
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
                  placeholder="Add notes about this plan assignment (e.g., why this plan was chosen, special terms, etc.)"
                />
              </div>
            </div>
          )}
          {selectedPlanCode && viewMode && currentApplicationPlan && (
            <div className="pt-6 border-t border-[var(--border)] space-y-6">
              {currentApplicationPlan.custom_loan_amount && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Custom Loan Amount
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {formatCurrency(currentApplicationPlan.custom_loan_amount)}
                  </p>
                </div>
              )}
              {currentApplicationPlan.custom_max_amount && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Custom Max Amount
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {formatCurrency(currentApplicationPlan.custom_max_amount)}
                  </p>
                </div>
              )}
              {currentApplicationPlan.notes && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Plan Notes
                  </span>
                  <p className="text-[var(--text-primary)] text-sm">
                    {currentApplicationPlan.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Staff */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Staff</h3>
          {!isAddingAssignment && (
            <button
              type="button"
              onClick={() => setIsAddingAssignment(true)}
              className="text-sm text-[var(--core-blue)] dark:text-[var(--text-secondary)] hover:text-[var(--core-blue-light)] dark:hover:text-[var(--text-primary)] transition-colors"
            >
              Add Staff
            </button>
          )}
        </div>

        {/* Current Staff */}
        {prospectAssignments.filter(a => a.is_active).length > 0 && (
          <div className="mt-4 space-y-3">
            {prospectAssignments.filter(a => a.is_active).map((assignment) => {
              const assignedStaff = staff.find(s => s.id === assignment.staff_id);
              const staffDept = assignedStaff?.departments?.[0] || 'Staff';
              
              return (
                <div
                  key={assignment.id}
                  className="flex items-start justify-between py-3 border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        {staffDept}
                      </span>
                      {assignment.is_primary && (
                        <span className="text-xs text-[var(--text-muted)]">• Primary</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      {assignedStaff?.name || assignedStaff?.first_name || assignedStaff?.email || 'Unknown'}
                    </p>
                    {assignment.assigned_at && (
                      <p className="text-xs text-[var(--text-muted)] mb-1">
                        Assigned {new Date(assignment.assigned_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                    {assignment.assignment_notes && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {assignment.assignment_notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Remove ${assignedStaff?.name || assignedStaff?.email || 'this staff member'}?`)) {
                        return;
                      }
                      
                      setLoading(true);
                      try {
                        await unassignStaffFromProspect(application.applicant_id, assignment.staff_id);
                        
                        // Reload assignments
                        const assignmentsData = await getProspectStaffAssignments(application.applicant_id);
                        setProspectAssignments(assignmentsData);
                      } catch (err) {
                        console.error('Error removing assignment:', err);
                        setError(err instanceof Error ? err.message : 'Failed to remove assignment');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors ml-4"
                    title="Remove staff assignment"
                  >
                    {loading ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Staff Form */}
        {isAddingAssignment && (
          <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="space-y-2">
              <label htmlFor="assignment-department" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Step 1: Select Department
              </label>
              {loadingData ? (
                <p className="text-sm text-[var(--text-muted)]">Loading departments...</p>
              ) : (
                <div className="relative">
                  <select
                    id="assignment-department"
                    value={selectedAssignmentDepartment}
                    onChange={(e) => {
                      setSelectedAssignmentDepartment(e.target.value);
                      setNewAssignmentStaffId('');
                    }}
                    className="w-full pl-3 pr-8 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-sm appearance-none"
                  >
                    <option value="">Select a department...</option>
                    {departments
                      .filter(dept => dept.is_active)
                      .map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[var(--text-secondary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {selectedAssignmentDepartment && (
              <div className="space-y-2">
                <label htmlFor="assignment-staff" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Step 2: Select Staff Member
                </label>
                {loadingData ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading staff...</p>
                ) : (
                  <div className="relative">
                    <select
                      id="assignment-staff"
                      value={newAssignmentStaffId}
                      onChange={(e) => setNewAssignmentStaffId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all text-sm appearance-none"
                    >
                      <option value="">Select a staff member...</option>
                      {staff
                        .filter((member) => {
                          if (member.role === 'donum_super_admin' || member.role === 'donum_admin') return true;
                          return member.departments && member.departments.includes(selectedAssignmentDepartment);
                        })
                        .filter((member) => !prospectAssignments.some(a => a.staff_id === member.id && a.is_active))
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.first_name || member.email || 'Unknown'}
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-[var(--text-secondary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="assignment-notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Staff Assignment Notes (Optional)
              </label>
              <textarea
                id="assignment-notes"
                value={newAssignmentNotes}
                onChange={(e) => setNewAssignmentNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none text-sm"
                placeholder="Add notes about this assignment..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingAssignment(false);
                  setSelectedAssignmentDepartment('');
                  setNewAssignmentStaffId('');
                  setNewAssignmentNotes('');
                }}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newAssignmentStaffId || !selectedAssignmentDepartment) return;
                  
                  setLoading(true);
                  try {
                    await assignStaffToProspect({
                      prospect_id: application.applicant_id,
                      staff_id: newAssignmentStaffId,
                      assignment_notes: newAssignmentNotes || undefined,
                    });
                    
                    // Reload assignments
                    const assignmentsData = await getProspectStaffAssignments(application.applicant_id);
                    setProspectAssignments(assignmentsData);
                    
                    // Reset form
                    setIsAddingAssignment(false);
                    setSelectedAssignmentDepartment('');
                    setNewAssignmentStaffId('');
                    setNewAssignmentNotes('');
                  } catch (err) {
                    console.error('Error adding assignment:', err);
                    setError(err instanceof Error ? err.message : 'Failed to add assignment');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !newAssignmentStaffId || !selectedAssignmentDepartment}
                className="px-4 py-2 text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue)]/80 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </div>
        )}

        {!isAddingAssignment && prospectAssignments.filter(a => a.is_active).length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No assignments yet</p>
        )}
      </div>

      {/* Purpose and Notes */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Details</h3>
        <div className="space-y-6">
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
            <label htmlFor="internal-notes" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Internal Notes (Staff Only)
            </label>
            <textarea
              id="internal-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
              placeholder="Add internal notes for staff only..."
            />
          </div>
          {status === 'rejected' && (
            <div className="space-y-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
              <label htmlFor="rejection-reason" className="block text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                Rejection Reason *
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2.5 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                placeholder="Explain why this application was rejected..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {(application.submitted_at || application.reviewed_at || application.approved_at || application.rejected_at || application.funded_at) && (
        <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h3>
          <div className="space-y-3">
            {application.submitted_at && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Submitted</span>
                <span className="text-sm text-[var(--text-primary)]">{formatDate(application.submitted_at)}</span>
              </div>
            )}
            {application.reviewed_at && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Reviewed</span>
                <span className="text-sm text-[var(--text-primary)]">{formatDate(application.reviewed_at)}</span>
              </div>
            )}
            {application.approved_at && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Approved</span>
                <span className="text-sm text-[var(--text-primary)]">{formatDate(application.approved_at)}</span>
              </div>
            )}
            {application.rejected_at && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Rejected</span>
                <span className="text-sm text-[var(--text-primary)]">{formatDate(application.rejected_at)}</span>
              </div>
            )}
            {application.funded_at && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium text-[var(--core-gold)]">Funded</span>
                <span className="text-sm text-[var(--text-primary)]">{formatDate(application.funded_at)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Documents</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Upload and manage documents related to this application
          </p>
        </div>
        
        <div className="space-y-6">
          {application.applicant_id && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Upload New Document</h4>
              <DocumentUpload
                documentType="other"
                documentName="Additional Document"
                applicantId={application.applicant_id}
                applicationId={application.id}
                onUploadSuccess={loadData}
              />
            </div>
          )}
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Uploaded Documents</h4>
            <DocumentList
              filters={{ application_id: application.id }}
              showActions={true}
              onDocumentUpdate={loadData}
            />
          </div>
        </div>
      </div>

      {/* Loan Creation - Show for approved/funded applications */}
      {(status === 'approved' || status === 'funded') && (
        <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Loan Management</h3>
          <CreateLoanFromApplication
            application={application}
            applicationPlan={currentApplicationPlan}
            onSuccess={(loan) => {
              // Navigate to the new loan
              router.push(`/admin/loans/${loan.id}`);
            }}
          />
        </div>
      )}

      {/* Staff Assignment Modal */}
      {showStaffAssignment && (
        <ProspectStaffAssignment
          prospectId={application.applicant_id}
          prospectName={application.applicant?.email || application.applicant_id}
          onClose={() => {
            setShowStaffAssignment(false);
            loadData(); // Reload to refresh assignments
          }}
          onUpdate={loadData}
        />
      )}
    </form>
  );
}
