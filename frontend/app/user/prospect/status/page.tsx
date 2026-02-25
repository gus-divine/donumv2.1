'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getApplications, type Application } from '@/lib/api/applications';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

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
      
      // Load applications - distinguish prequalification from full application
      const applications = await getApplications({ applicant_id: user.id });
      const prequalApplication = applications.find(a => a.application_type === 'prequalification');
      const fullApplication = applications.find(a => a.application_type !== 'prequalification');
      const displayApplication = fullApplication ?? prequalApplication ?? (applications[0] ?? null);
      setApplication(displayApplication);

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

      // Build status steps - distinguish prequalification from full application
      const hasPrequalification = !!prequalApplication || (!!userData?.annual_income && !!userData?.net_worth && !!userData?.risk_tolerance);
      const hasFullApplication = fullApplication && ['submitted', 'under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(fullApplication.status);
      const appStatus = displayApplication?.status || 'draft';

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
          completedAt: prequalApplication?.submitted_at || null,
        },
        {
          step: 'Application Submitted',
          status: hasFullApplication ? 'completed' : (hasPrequalification ? 'pending' : 'pending'),
          description: hasFullApplication
            ? `Application ${fullApplication.application_number} submitted`
            : 'Complete and submit your full application',
          completedAt: fullApplication?.submitted_at || null,
        },
        {
          step: 'Review & Qualification',
          status: !hasFullApplication ? 'pending' : (['under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(appStatus) || appStatus === 'submitted')
            ? 'in_progress'
            : 'pending',
          description: fullApplication?.status === 'rejected'
            ? `Application rejected: ${fullApplication.rejection_reason || 'No reason provided'}`
            : 'Our team is reviewing your application',
          completedAt: fullApplication?.reviewed_at || null,
        },
        {
          step: 'Staff Assignment',
          status: !hasFullApplication ? 'pending' : (assignedDepartment || fullApplication?.assigned_departments?.length) ? 'completed' : 'pending',
          description: assignedDepartment || fullApplication?.assigned_departments?.length
            ? `Assigned to ${assignedDepartment || fullApplication?.assigned_departments?.[0] || 'department'}`
            : 'Waiting for department assignment',
          completedAt: null,
        },
        {
          step: 'Document Collection',
          status: !hasFullApplication ? 'pending' : (appStatus === 'document_collection' ? 'in_progress' : ['approved', 'rejected', 'funded', 'closed'].includes(appStatus) ? 'completed' : 'pending'),
          description: 'Upload required documents',
          completedAt: null,
        },
        {
          step: 'Approval',
          status: !hasFullApplication ? 'pending' : (appStatus === 'approved' ? 'completed' : appStatus === 'rejected' ? 'completed' : ['under_review', 'document_collection'].includes(appStatus) ? 'in_progress' : 'pending'),
          description: appStatus === 'approved'
            ? 'Application approved!'
            : appStatus === 'rejected'
            ? 'Application was rejected'
            : 'Application pending approval',
          completedAt: fullApplication?.approved_at || fullApplication?.rejected_at || null,
        },
        {
          step: 'Become a Member',
          status: !hasFullApplication ? 'pending' : (appStatus === 'funded' || appStatus === 'closed' ? 'completed' : appStatus === 'approved' ? 'in_progress' : 'pending'),
          description: appStatus === 'funded'
            ? 'Congratulations! You are now a Donum member'
            : 'Once approved and funded, you will become a Donum member',
          completedAt: fullApplication?.funded_at || null,
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
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <Skeleton height="1.5rem" width="10rem" />
          </div>

          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="16rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
            <div className="mt-4 border-l-4 border-blue-500 pl-4 py-2">
              <Skeleton height="1rem" width="20rem" />
            </div>
          </div>

          {/* Your Team Skeleton */}
          <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="8rem" className="mb-4" />
            <div className="space-y-2">
              <Skeleton height="1rem" width="15rem" />
              <Skeleton height="1rem" width="18rem" />
              <Skeleton height="1rem" width="12rem" />
            </div>
          </div>

          {/* Status Steps Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="12rem" className="mb-6" />
            <div className="space-y-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={`flex items-start gap-4 ${index < 7 ? 'pb-6 border-b border-[var(--border)]' : ''}`}>
                  <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                  <div className="flex-1 space-y-2">
                    <Skeleton height="1.5rem" width="12rem" />
                    <Skeleton height="1rem" width="20rem" />
                    <Skeleton height="0.875rem" width="10rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/user/prospect/dashboard')}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Application Status</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Track your application progress and see what happens next.
          </p>
          {application && (
            <div className="mt-4 border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-sm text-[var(--text-primary)]">
                {application.application_type === 'prequalification' ? (
                  <>Prequalification received. Complete your full application to continue.</>
                ) : (
                  <>
                    <strong>Application Number:</strong> <span className="font-mono">{application.application_number}</span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 border-l-4 border-red-500 pl-4 py-2">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Assigned Staff/Department Info */}
        {(assignedDepartment || assignedStaff) && (
          <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Team</h2>
            {assignedDepartment && (
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                <strong>Department:</strong> {assignedDepartment}
              </p>
            )}
            {assignedStaff && (
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  <strong>Assigned Advisor:</strong> {assignedStaff.name}
                </p>
                {assignedStaff.email && (
                  <p className="text-sm text-[var(--text-secondary)] mb-1">
                    <strong>Email:</strong> {assignedStaff.email}
                  </p>
                )}
                {assignedStaff.phone && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <strong>Phone:</strong> {assignedStaff.phone}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Steps */}
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Application Steps</h2>
          <div className="space-y-6">
            {statusSteps.map((step, index) => (
              <div key={step.step} className={`flex items-start gap-4 ${index < statusSteps.length - 1 ? 'pb-6 border-b border-[var(--border)]' : ''}`}>
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
                  <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
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
