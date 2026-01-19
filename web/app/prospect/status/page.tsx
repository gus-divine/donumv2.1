'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getApplications, type Application } from '@/lib/api/applications';

interface AssignedStaff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ApplicationStatus {
  step: string;
  status: 'completed' | 'in_progress' | 'pending';
  description: string;
  completedAt: string | null;
}

export default function ProspectStatusPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [assignedStaff, setAssignedStaff] = useState<AssignedStaff | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(null);
  const [statusSteps, setStatusSteps] = useState<ApplicationStatus[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      
      // Load user's most recent application
      const applications = await getApplications({ applicant_id: user.id });
      const latestApplication = applications.length > 0 ? applications[0] : null;
      setApplication(latestApplication);

      // Load user data to check status
      const { data: userData, error: userError } = await supabase
        .from('donum_accounts')
        .select('status, annual_income, net_worth, risk_tolerance, created_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        setError('Failed to load status');
        setIsLoading(false);
        return;
      }

      // Check department assignments
      const { data: deptMembers } = await supabase
        .from('department_members')
        .select('department_name')
        .eq('member_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (deptMembers && deptMembers.length > 0) {
        setAssignedDepartment(deptMembers[0].department_name);
        
        // TODO: Load assigned staff from staff_members table
        // For now, show placeholder
      }

      // Build status steps based on application and user data
      const hasPrequalification = userData?.annual_income && userData?.net_worth && userData?.risk_tolerance;
      const appStatus = latestApplication?.status || 'draft';

      const steps: ApplicationStatus[] = [
        {
          step: 'Sign Up',
          status: 'completed',
          description: 'Account created successfully',
          completedAt: userData?.created_at || user.created_at || null,
        },
        {
          step: 'Prequalification',
          status: hasPrequalification ? 'completed' : 'pending',
          description: hasPrequalification
            ? 'Prequalification form completed'
            : 'Complete prequalification form',
          completedAt: latestApplication?.submitted_at || null,
        },
        {
          step: 'Application Submitted',
          status: latestApplication && ['submitted', 'under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(appStatus)
            ? 'completed'
            : hasPrequalification ? 'pending' : 'pending',
          description: latestApplication
            ? `Application ${latestApplication.application_number} submitted`
            : 'Submit your application',
          completedAt: latestApplication?.submitted_at || null,
        },
        {
          step: 'Review & Qualification',
          status: ['under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(appStatus)
            ? 'in_progress'
            : appStatus === 'submitted'
            ? 'in_progress'
            : 'pending',
          description: latestApplication?.status === 'rejected'
            ? `Application rejected: ${latestApplication.rejection_reason || 'No reason provided'}`
            : 'Our team is reviewing your application',
          completedAt: latestApplication?.reviewed_at || null,
        },
        {
          step: 'Staff Assignment',
          status: assignedDepartment || latestApplication?.assigned_departments?.length ? 'completed' : 'pending',
          description: assignedDepartment || latestApplication?.assigned_departments?.length
            ? `Assigned to ${assignedDepartment || latestApplication?.assigned_departments?.[0] || 'department'}`
            : 'Waiting for department assignment',
          completedAt: null,
        },
        {
          step: 'Document Collection',
          status: appStatus === 'document_collection' ? 'in_progress' : ['approved', 'rejected', 'funded', 'closed'].includes(appStatus) ? 'completed' : 'pending',
          description: 'Upload required documents',
          completedAt: null,
        },
        {
          step: 'Approval',
          status: appStatus === 'approved' ? 'completed' : appStatus === 'rejected' ? 'completed' : ['under_review', 'document_collection'].includes(appStatus) ? 'in_progress' : 'pending',
          description: appStatus === 'approved'
            ? 'Application approved!'
            : appStatus === 'rejected'
            ? 'Application was rejected'
            : 'Application pending approval',
          completedAt: latestApplication?.approved_at || latestApplication?.rejected_at || null,
        },
        {
          step: 'Become a Member',
          status: appStatus === 'funded' || appStatus === 'closed' ? 'completed' : appStatus === 'approved' ? 'in_progress' : 'pending',
          description: appStatus === 'funded'
            ? 'Congratulations! You are now a Donum member'
            : 'Once approved and funded, you will become a Donum member',
          completedAt: latestApplication?.funded_at || null,
        },
      ];

      setStatusSteps(steps);
    } catch (err) {
      console.error('Error loading status:', err);
      setError('Failed to load application status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--core-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading status...</p>
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Application Status</h1>
          <p className="text-[var(--text-secondary)]">
            Track your application progress and see what happens next.
          </p>
          {application && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-sm text-[var(--text-primary)]">
                <strong>Application Number:</strong> <span className="font-mono">{application.application_number}</span>
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Assigned Staff/Department Info */}
        {(assignedDepartment || assignedStaff) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Team</h2>
            {assignedDepartment && (
              <p className="text-[var(--text-secondary)] mb-2">
                <strong>Department:</strong> {assignedDepartment}
              </p>
            )}
            {assignedStaff && (
              <div>
                <p className="text-[var(--text-secondary)] mb-1">
                  <strong>Assigned Advisor:</strong> {assignedStaff.name}
                </p>
                {assignedStaff.email && (
                  <p className="text-[var(--text-secondary)] mb-1">
                    <strong>Email:</strong> {assignedStaff.email}
                  </p>
                )}
                {assignedStaff.phone && (
                  <p className="text-[var(--text-secondary)]">
                    <strong>Phone:</strong> {assignedStaff.phone}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Steps */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Application Steps</h2>
          <div className="space-y-6">
            {statusSteps.map((step, index) => (
              <div key={step.step} className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-medium mb-1 ${
                    step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    step.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                    'text-[var(--text-secondary)]'
                  }`}>
                    {step.step}
                  </h3>
                  <p className="text-[var(--text-secondary)]">{step.description}</p>
                  {step.completedAt && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Completed: {new Date(step.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
