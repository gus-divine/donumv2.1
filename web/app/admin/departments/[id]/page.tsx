'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { DepartmentForm } from '@/components/admin/departments/DepartmentForm';
import { DepartmentStaffAssignment } from '@/components/admin/departments/DepartmentStaffAssignment';
import { getDepartment, type Department } from '@/lib/api/departments';
import { getUsers, type User } from '@/lib/api/users';
import { getDepartmentPermissions } from '@/lib/api/departments';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  Users, Shield, Briefcase, Headphones, Settings, ChartBar, File, Folder,
  Mail, Phone, Calendar, Star, Heart, Tag, Flag, Bell, Building2, UserCheck,
  UserSearch, CreditCard, TrendingUp, BookOpen, LayoutDashboard, FileText,
  Database, Globe, Target, Zap, Award, Home, MapPin, DollarSign, PieChart,
  BarChart3, Wallet, Handshake, Lightbulb, Rocket, Gem, Banknote, Coins,
  Receipt, Calculator, Percent, TrendingDown, LineChart, Activity, Lock,
  Key, ClipboardCheck, CheckCircle2, AlertCircle, Info, type LucideIcon
} from 'lucide-react';

// Map icon names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  // Core business icons
  users: Users,
  briefcase: Briefcase,
  building2: Building2,
  handshake: Handshake,
  userCheck: UserCheck,
  userSearch: UserSearch,
  // Financial icons
  dollarSign: DollarSign,
  creditCard: CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  receipt: Receipt,
  calculator: Calculator,
  percent: Percent,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  pieChart: PieChart,
  barChart3: BarChart3,
  lineChart: LineChart,
  chart: ChartBar,
  // Operations & Services
  headphones: Headphones,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  file: File,
  folder: Folder,
  fileText: FileText,
  bookOpen: BookOpen,
  // Security & Compliance
  shield: Shield,
  lock: Lock,
  key: Key,
  clipboardCheck: ClipboardCheck,
  checkCircle2: CheckCircle2,
  alertCircle: AlertCircle,
  // Management & Analytics
  settings: Settings,
  layoutDashboard: LayoutDashboard,
  database: Database,
  activity: Activity,
  target: Target,
  award: Award,
  // General
  star: Star,
  tag: Tag,
  flag: Flag,
  bell: Bell,
  info: Info,
  zap: Zap,
  home: Home,
  mapPin: MapPin,
  globe: Globe,
};

// Format date helper
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return '-';
  }
}

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const departmentId = params?.id as string;
  const { canEdit } = usePermissions('/admin/departments');
  const [department, setDepartment] = useState<Department | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<User[]>([]);
  const [permissionsCount, setPermissionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  useEffect(() => {
    if (!departmentId) {
      setError('Department ID is required');
      setLoading(false);
      return;
    }

    async function loadDepartment() {
      try {
        setLoading(true);
        setError(null);
        
        const deptData = await getDepartment(departmentId);
        
        if (!deptData) {
          setError('Department not found');
        } else {
          setDepartment(deptData);
          
          // Load staff and permissions in parallel
          const [allUsers, permissions] = await Promise.all([
            getUsers().catch(() => []),
            getDepartmentPermissions(deptData.name).catch(() => [])
          ]);
          
          // Filter staff assigned to this department
          const staffRoles = ['donum_staff', 'donum_admin', 'donum_super_admin'];
          const staff = allUsers.filter(user => 
            staffRoles.includes(user.role) &&
            user.departments &&
            user.departments.includes(deptData.name)
          );
          setAssignedStaff(staff);
          
          // Count permissions for this department
          setPermissionsCount(permissions.length);
        }
      } catch (err) {
        console.error('[DepartmentDetailPage] Error loading department:', err);
        setError(err instanceof Error ? err.message : 'Failed to load department');
      } finally {
        setLoading(false);
      }
    }

    loadDepartment();
  }, [departmentId]);

  function handleBack() {
    // Use router.back() for smart navigation
    // If there's no history, Next.js will handle it gracefully
    router.back();
  }

  function handleEdit() {
    setShowEditForm(true);
  }

  function handleManageStaff() {
    setShowStaffModal(true);
  }

  function handleManagePermissions() {
    router.push(`/admin/departments/${departmentId}/permissions`);
  }

  function handleEditSuccess() {
    setShowEditForm(false);
    // Reload department data
    if (departmentId) {
      getDepartment(departmentId).then(dept => {
        if (dept) setDepartment(dept);
      });
    }
  }

  function handleEditCancel() {
    setShowEditForm(false);
  }

  function handleStaffModalClose() {
    setShowStaffModal(false);
    // Reload staff data
    if (department) {
      getUsers().then(allUsers => {
        const staffRoles = ['donum_staff', 'donum_admin', 'donum_super_admin'];
        const staff = allUsers.filter(user => 
          staffRoles.includes(user.role) &&
          user.departments &&
          user.departments.includes(department.name)
        );
        setAssignedStaff(staff);
      }).catch(() => {});
    }
  }

  function handleViewStaff(staffId: string) {
    router.push(`/admin/staff/${staffId}`);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading department details...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !department) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleBack}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Error</h1>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Department not found'}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const IconComponent = ICON_MAP[department.icon] || Users;

  return (
    <PermissionGuard>
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBack}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            ← Back
          </button>

          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: department.color + '20' }}
              >
                <IconComponent
                  className="w-8 h-8"
                  style={{ color: department.color }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {department.name}
                </h1>
                {department.description && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {department.description}
                  </p>
                )}
              </div>
            </div>
            {canEdit('/admin/departments') && (
              <button
                onClick={handleEdit}
                className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                Edit Department
              </button>
            )}
          </div>

          {/* Department Information */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Department Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Name</span>
                  <p className="text-[var(--text-primary)]">{department.name}</p>
                </div>
                {department.description && (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Description</span>
                    <p className="text-[var(--text-primary)]">{department.description}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Color</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: department.color }}
                    />
                    <p className="text-[var(--text-primary)]">{department.color}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Icon</span>
                  <div
                    className="p-1.5 rounded inline-flex"
                    style={{ backgroundColor: department.color + '20' }}
                  >
                    <IconComponent
                      className="w-4 h-4"
                      style={{ color: department.color }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                  <span className={`inline-flex items-center text-xs font-medium ${
                    department.is_active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {department.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Prospect Assignment</span>
                  <span className={`inline-flex items-center text-xs font-medium ${
                    department.prospect_assignment_enabled
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {department.prospect_assignment_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Member Assignment</span>
                  <span className={`inline-flex items-center text-xs font-medium ${
                    department.member_assignment_enabled
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {department.member_assignment_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Created</span>
                  <p className="text-[var(--text-primary)]">{formatDate(department.created_at)}</p>
                </div>
              </div>
          </div>

          {/* Assigned Staff */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Assigned Staff</h3>
                {canEdit('/admin/departments') && (
                  <button
                    onClick={handleManageStaff}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] hover:text-[var(--core-blue-light)] transition-colors"
                  >
                    Manage Staff
                  </button>
                )}
              </div>
              {assignedStaff.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No staff assigned to this department.</p>
              ) : (
                <div className="space-y-2">
                  {assignedStaff.slice(0, 5).map((staff) => {
                    const staffName = staff.first_name || staff.last_name
                      ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                      : staff.email;
                    return (
                      <div
                        key={staff.id}
                        onClick={() => handleViewStaff(staff.id)}
                        className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{staffName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{staff.email}</p>
                        </div>
                        <span className={`text-xs font-medium ${
                          staff.status === 'active'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {staff.status || 'active'}
                        </span>
                      </div>
                    );
                  })}
                  {assignedStaff.length > 5 && (
                    <button
                      onClick={handleManageStaff}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
                    >
                      View All ({assignedStaff.length} staff)
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* Permissions */}
          <div className="pt-6 border-t border-[var(--core-blue)] pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Page Permissions</h3>
                {canEdit('/admin/departments') && (
                  <button
                    onClick={handleManagePermissions}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] hover:text-[var(--core-blue-light)] transition-colors"
                  >
                    Manage Permissions
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {permissionsCount === 0 
                  ? 'No permissions configured for this department.'
                  : `${permissionsCount} page permission${permissionsCount === 1 ? '' : 's'} configured.`
                }
              </p>
          </div>
        </div>

        {/* Edit Form Modal */}
        {showEditForm && department && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[var(--background)] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border)]">
              <div className="sticky top-0 bg-white dark:bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {department ? 'Edit Department' : 'Create Department'}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {department ? 'Update department information and settings' : 'Create a new department'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <DepartmentForm
                  department={department}
                  onSuccess={handleEditSuccess}
                  onCancel={handleEditCancel}
                />
              </div>
            </div>
          </div>
        )}

        {/* Staff Assignment Modal */}
        {showStaffModal && department && (
          <DepartmentStaffAssignment
            department={department}
            onClose={handleStaffModalClose}
          />
        )}

      </main>
    </PermissionGuard>
  );
}
