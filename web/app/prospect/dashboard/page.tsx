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
  TrendingUp,
  User,
  Calendar,
  FileCheck,
  Sparkles
} from 'lucide-react';

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
      const { data: staffAssignments } = await supabase
        .from('prospect_staff_assignments')
        .select('staff:donum_accounts!prospect_staff_assignments_staff_id_fkey(first_name, last_name, email)')
        .eq('prospect_id', user.id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .limit(1)
        .single();
      
      if (staffAssignments?.staff) {
        const staff = staffAssignments.staff as any;
        setAssignedStaff({
          name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
          email: staff.email,
        });
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
      });
    }
    
    // Check if documents need to be uploaded
    const approvedDocs = documents.filter(d => d.status === 'approved').length;
    if (approvedDocs < 4 && (appStatus === 'document_collection' || appStatus === 'under_review' || appStatus === 'submitted')) {
      steps.push({
        id: 'upload-documents',
        title: 'Upload Required Documents',
        description: `${4 - approvedDocs} more document${4 - approvedDocs > 1 ? 's' : ''} needed to complete your application`,
        action: 'Upload Documents',
        actionPath: '/prospect/documents',
        priority: 'high',
        icon: <Upload className="w-5 h-5" />,
      });
    }
    
    // If application is under review
    if (appStatus === 'under_review' || appStatus === 'document_collection') {
      steps.push({
        id: 'check-status',
        title: 'Track Your Application',
        description: 'Your application is being reviewed. Check status for updates',
        action: 'View Status',
        actionPath: '/prospect/status',
        priority: 'medium',
        icon: <Clock className="w-5 h-5" />,
      });
    }
    
    // If approved, show next steps
    if (appStatus === 'approved') {
      steps.push({
        id: 'approved-next-steps',
        title: 'Application Approved!',
        description: 'Congratulations! Your application has been approved. Check your status for next steps.',
        action: 'View Details',
        actionPath: '/prospect/status',
        priority: 'high',
        icon: <CheckCircle2 className="w-5 h-5" />,
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
      });
    }
    
    return steps.slice(0, 3); // Show max 3 next steps
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
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--core-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading your dashboard...</p>
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-[var(--core-blue)]/10 via-[var(--core-blue)]/5 to-transparent border border-[var(--core-blue)]/20 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                Welcome back, {userName}! 👋
              </h1>
              <p className="text-[var(--text-secondary)] text-lg">
                Here's your application progress and what's next
              </p>
            </div>
            {assignedStaff && (
              <div className="text-right">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Your Advisor</p>
                <p className="font-semibold text-[var(--text-primary)]">{assignedStaff.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{assignedStaff.email}</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Application Progress</h2>
            <span className="text-2xl font-bold text-[var(--core-blue)]">{stats.completionPercentage}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-3 bg-[var(--surface-hover)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--core-blue)] to-[var(--core-blue-light)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                  step.completed 
                    ? 'bg-green-500 text-white shadow-lg scale-110' 
                    : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-current" />
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Application Status Card */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              {stats.activeApplication && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(stats.activeApplication.status)}`}>
                  {getStatusLabel(stats.activeApplication.status)}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Application Status</h3>
            <p className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {stats.activeApplication?.application_number || 'No Application'}
            </p>
            <button
              onClick={() => router.push('/prospect/status')}
              className="text-sm text-[var(--core-blue)] hover:underline flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Documents Card */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {stats.documentsUploaded}/{stats.documentsRequired}
              </span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Documents Uploaded</h3>
            <p className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {stats.documentsUploaded} Approved
            </p>
            <button
              onClick={() => router.push('/prospect/documents')}
              className="text-sm text-[var(--core-blue)] hover:underline flex items-center gap-1"
            >
              Manage Documents <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Quick Actions</h3>
            <div className="space-y-2 mt-4">
              <button
                onClick={() => router.push('/prospect/application')}
                className="w-full text-left px-3 py-2 text-sm bg-[var(--surface-hover)] hover:bg-[var(--core-blue)]/10 rounded-lg transition-colors"
              >
                View Application
              </button>
              <button
                onClick={() => router.push('/prospect/documents')}
                className="w-full text-left px-3 py-2 text-sm bg-[var(--surface-hover)] hover:bg-[var(--core-blue)]/10 rounded-lg transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-8 bg-[var(--core-blue)] rounded-full"></div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Next Steps</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                    step.priority === 'high'
                      ? 'border-[var(--core-blue)]/50 bg-gradient-to-br from-[var(--core-blue)]/5 to-transparent'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      step.priority === 'high'
                        ? 'bg-[var(--core-blue)]/10 text-[var(--core-blue)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                    }`}>
                      {step.icon}
                    </div>
                    {step.priority === 'high' && (
                      <span className="ml-auto px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        Priority
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{step.description}</p>
                  <button
                    onClick={() => router.push(step.actionPath)}
                    className="w-full px-4 py-2 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    {step.action}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Application Details */}
        {stats.activeApplication && (
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-8 bg-[var(--core-blue)] rounded-full"></div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Application Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(stats.activeApplication.status)}`}>
                  {getStatusLabel(stats.activeApplication.status)}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <button
                onClick={() => router.push('/prospect/status')}
                className="px-5 py-2.5 text-sm font-medium bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
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
