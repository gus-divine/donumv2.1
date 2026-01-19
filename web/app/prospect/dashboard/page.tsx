'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getApplications, type Application } from '@/lib/api/applications';
import { getDocumentsByApplicantId, type Document } from '@/lib/api/documents';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Upload, 
  ArrowRight, 
  User,
  Calendar,
  FileCheck,
  Sparkles,
  Eye
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalApplications: number;
  activeApplication: Application | null;
  documentsUploaded: number;
  documentsRequired: number;
  completionPercentage: number;
}

interface NextStep {
  id: string;
  title: string;
  description: string;
  action: string;
  actionPath: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  color: string;
}

export default function ProspectDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    activeApplication: null,
    documentsUploaded: 0,
    documentsRequired: 6,
    completionPercentage: 0,
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<{ name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createSupabaseClient();
      
      // Load applications
      const applications = await getApplications({ applicant_id: user.id });
      const latestApplication = applications.length > 0 ? applications[0] : null;
      
      // Load documents
      const docs = await getDocumentsByApplicantId(user.id);
      setDocuments(docs);
      
      // Load user data
      const { data: userData } = await supabase
        .from('donum_accounts')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();
      
      // Load assigned staff
      const { data: assignment } = await supabase
        .from('prospect_staff_assignments')
        .select('staff_id')
        .eq('prospect_id', user.id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle();
      
      if (assignment?.staff_id) {
        const { data: staffData } = await supabase
          .from('donum_accounts')
          .select('first_name, last_name, email')
          .eq('id', assignment.staff_id)
          .single();
        
        if (staffData) {
          setAssignedStaff({
            name: `${staffData.first_name || ''} ${staffData.last_name || ''}`.trim() || staffData.email,
            email: staffData.email,
          });
        }
      }
      
      // Calculate completion percentage
      const hasPrequalification = userData && latestApplication;
      const hasApplication = latestApplication && ['submitted', 'under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(latestApplication.status);
      const docsUploaded = docs.filter(d => d.status === 'approved').length;
      const completionPercentage = Math.round(
        ((hasPrequalification ? 1 : 0) + 
         (hasApplication ? 1 : 0) + 
         (docsUploaded >= 4 ? 1 : 0)) / 3 * 100
      );
      
      setStats({
        totalApplications: applications.length,
        activeApplication: latestApplication,
        documentsUploaded: docsUploaded,
        documentsRequired: 6,
        completionPercentage,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextSteps = (): NextStep[] => {
    const steps: NextStep[] = [];
    const app = stats.activeApplication;
    const appStatus = app?.status || 'draft';
    
    // Check if prequalification is needed
    if (!app || app.status === 'draft') {
      steps.push({
        id: 'prequalify',
        title: 'Complete Prequalification',
        description: 'Start your journey by completing the prequalification form',
        action: 'Start Prequalification',
        actionPath: '/prospect/prequalify',
        priority: 'high',
        icon: <Sparkles className="w-5 h-5" />,
        color: 'var(--core-blue)',
      });
    }
    
    // Check if application needs to be submitted
    if (app && app.status === 'draft') {
      steps.push({
        id: 'submit-application',
        title: 'Submit Your Application',
        description: 'Complete and submit your formal application',
        action: 'View Application',
        actionPath: '/prospect/application',
        priority: 'high',
        icon: <FileText className="w-5 h-5" />,
        color: 'var(--core-gold)',
      });
    }
    
    // Check if documents need to be uploaded
    const approvedDocs = documents.filter(d => d.status === 'approved').length;
    if (approvedDocs < 4 && (appStatus === 'document_collection' || appStatus === 'under_review' || appStatus === 'submitted')) {
      steps.push({
        id: 'upload-documents',
        title: 'Upload Required Documents',
        description: `${4 - approvedDocs} more document${4 - approvedDocs > 1 ? 's' : ''} needed`,
        action: 'Upload Documents',
        actionPath: '/prospect/documents',
        priority: 'high',
        icon: <Upload className="w-5 h-5" />,
        color: '#22c55e',
      });
    }
    
    // If application is under review
    if (appStatus === 'under_review' || appStatus === 'document_collection') {
      steps.push({
        id: 'check-status',
        title: 'Track Your Application',
        description: 'Your application is being reviewed',
        action: 'View Status',
        actionPath: '/prospect/status',
        priority: 'medium',
        icon: <Clock className="w-5 h-5" />,
        color: '#a855f7',
      });
    }
    
    // If approved, show next steps
    if (appStatus === 'approved') {
      steps.push({
        id: 'approved-next-steps',
        title: 'Application Approved!',
        description: 'Congratulations! Check your status for next steps',
        action: 'View Details',
        actionPath: '/prospect/status',
        priority: 'high',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: '#22c55e',
      });
    }
    
    // If no active steps, show general guidance
    if (steps.length === 0) {
      steps.push({
        id: 'view-profile',
        title: 'Keep Your Profile Updated',
        description: 'Make sure your profile information is current',
        action: 'View Profile',
        actionPath: '/prospect/profile',
        priority: 'low',
        icon: <User className="w-5 h-5" />,
        color: '#6b7280',
      });
    }
    
    return steps.slice(0, 4);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'funded':
        return 'bg-green-500';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-500';
      case 'under_review':
      case 'document_collection':
        return 'bg-blue-500';
      case 'submitted':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getProgressSteps = () => {
    const app = stats.activeApplication;
    const appStatus = app?.status || 'draft';
    
    return [
      { label: 'Prequalification', completed: !!app },
      { label: 'Application', completed: app && app.status !== 'draft' },
      { label: 'Documents', completed: documents.filter(d => d.status === 'approved').length >= 4 },
      { label: 'Review', completed: ['under_review', 'document_collection', 'approved', 'rejected', 'funded', 'closed'].includes(appStatus) },
      { label: 'Approval', completed: ['approved', 'rejected', 'funded', 'closed'].includes(appStatus) },
    ];
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton height="2rem" width="20rem" className="mb-2" />
            <Skeleton height="1rem" width="30rem" />
          </div>

          {/* Quick Access Skeleton */}
          <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="10rem" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton height="1.5rem" width="1.5rem" variant="circular" />
                  <div className="flex-1 space-y-2">
                    <Skeleton height="1rem" width="80%" />
                    <Skeleton height="0.875rem" width="60%" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Progress Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton height="1.5rem" width="12rem" />
              <Skeleton height="2rem" width="4rem" />
            </div>
            <div className="mb-8">
              <Skeleton height="0.5rem" width="100%" className="rounded-full" />
            </div>
            <div className="flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <Skeleton height="2.5rem" width="2.5rem" variant="circular" className="mb-2" />
                  <Skeleton height="0.875rem" width="5rem" />
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
            <Skeleton height="1.5rem" width="10rem" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton height="0.875rem" width="8rem" />
                  <Skeleton height="2rem" width="12rem" />
                  <Skeleton height="0.875rem" width="6rem" />
                </div>
              ))}
            </div>
          </div>

          {/* Application Details Skeleton */}
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <Skeleton height="1.5rem" width="12rem" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton height="0.875rem" width="8rem" />
                  <Skeleton height="1.5rem" width="10rem" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const progressSteps = getProgressSteps();
  const completedSteps = progressSteps.filter(s => s.completed).length;
  const nextSteps = getNextSteps();
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back, {userName}!</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Track your application progress and see what's next in your journey
          </p>
        </div>

        {error && (
          <div className="mb-6 border-l-4 border-red-500 pl-4 py-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 pt-4 border-t-2 border-[var(--core-gold)] pb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextSteps.map((step) => (
              <button
                key={step.id}
                onClick={() => router.push(step.actionPath)}
                className="flex items-center gap-3 p-4 hover:bg-[var(--surface-hover)] transition-colors text-left group"
                style={{ borderLeft: `4px solid ${step.color}` }}
              >
                <div style={{ color: step.color }} className="group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{step.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--core-blue)] transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Application Progress */}
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Application Progress</h2>
            <span className="text-2xl font-bold text-[var(--core-blue)]">{stats.completionPercentage}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--core-blue)] rounded-full transition-all duration-500"
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <p className={`text-xs text-center font-medium ${
                  step.completed ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="pt-6 border-t border-[var(--core-gold)] pb-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Application Status */}
            <div className="p-4">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Application Status</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {stats.activeApplication?.application_number || 'No Application'}
              </p>
              {stats.activeApplication && (
                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(stats.activeApplication.status)}`}>
                  {getStatusLabel(stats.activeApplication.status)}
                </span>
              )}
            </div>

            {/* Documents */}
            <div className="p-4">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Documents Uploaded</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {stats.documentsUploaded} <span className="text-lg font-normal text-[var(--text-secondary)]">/ {stats.documentsRequired}</span>
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{stats.documentsUploaded} approved</p>
            </div>

            {/* Advisor */}
            <div className="p-4">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Your Advisor</p>
              {assignedStaff ? (
                <>
                  <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">{assignedStaff.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{assignedStaff.email}</p>
                </>
              ) : (
                <p className="text-lg text-[var(--text-secondary)]">Not assigned yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Application Details */}
        {stats.activeApplication && (
          <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Application Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Application Number</p>
                <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                  {stats.activeApplication.application_number}
                </p>
              </div>
              {stats.activeApplication.requested_amount && (
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Requested Amount</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    ${stats.activeApplication.requested_amount.toLocaleString()}
                  </p>
                </div>
              )}
              {stats.activeApplication.submitted_at && (
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Submitted</p>
                  <p className="text-lg text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(stats.activeApplication.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Status</p>
                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(stats.activeApplication.status)}`}>
                  {getStatusLabel(stats.activeApplication.status)}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <button
                onClick={() => router.push('/prospect/status')}
                className="text-sm font-medium text-[var(--core-blue)] hover:text-[var(--core-blue-light)] transition-colors flex items-center gap-2"
              >
                View Full Status <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
