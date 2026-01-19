'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/admin/shared/PermissionGuard';
import { getUser, type User } from '@/lib/api/users';
import { getDepartments, type Department } from '@/lib/api/departments';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { USER_ROLES, USER_STATUSES } from '@/lib/api/users';

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return '—';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-600 dark:text-green-400';
    case 'pending':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'suspended':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getRoleColor(role: string): string {
  // Treat donum_lead as donum_prospect
  const normalizedRole = role === 'donum_lead' ? 'donum_prospect' : role;
  const roleColors: Record<string, string> = {
    'donum_super_admin': 'text-red-600 dark:text-red-400',
    'donum_admin': 'text-purple-600 dark:text-purple-400',
    'donum_staff': 'text-blue-600 dark:text-blue-400',
    'donum_member': 'text-green-600 dark:text-green-400',
    'donum_partner': 'text-orange-600 dark:text-orange-400',
    'donum_prospect': 'text-yellow-600 dark:text-yellow-400',
  };
  return roleColors[normalizedRole] || 'text-gray-600 dark:text-gray-400';
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { canEdit } = usePermissions('/admin/users');
  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    async function loadUser() {
      try {
        setLoading(true);
        setError(null);
        
        const userData = await getUser(userId);
        
        if (!userData) {
          setError('User not found');
        } else {
          setUser(userData);
        }
      } catch (err) {
        console.error('[UserDetailPage] Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  useEffect(() => {
    async function loadDepts() {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (err) {
        console.error('[UserDetailPage] Error loading departments:', err);
      }
    }
    loadDepts();
  }, []);

  function handleBack() {
    router.back();
  }

  function handleEdit() {
    router.push(`/admin/users/${userId}/edit`);
  }

  if (loading) {
    return (
      <PermissionGuard>
        <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--text-secondary)]">Loading user details...</div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  if (error || !user) {
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
              <p className="text-[var(--text-secondary)] mb-4">{error || 'User not found'}</p>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

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
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={userName}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--core-blue)] flex items-center justify-center text-white text-xl font-medium">
                  {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {userName}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  {user.email}
                </p>
              </div>
            </div>
            {canEdit('/admin/users') && (
              <button
                onClick={handleEdit}
                className="text-sm text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
              >
                Edit User
              </button>
            )}
          </div>

          {/* User Information */}
          <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Email</span>
                <p className="text-[var(--text-primary)]">{user.email}</p>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Role</span>
                <span className={`inline-flex items-center text-xs font-medium ${getRoleColor(user.role)}`}>
                  {USER_ROLES.find(r => r.value === user.role)?.label || (String(user.role) === 'donum_lead' ? 'Prospect' : user.role)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Status</span>
                <span className={`inline-flex items-center text-xs font-medium ${getStatusColor(user.status)}`}>
                  {USER_STATUSES.find(s => s.value === user.status)?.label || user.status}
                </span>
              </div>
              {user.first_name && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">First Name</span>
                  <p className="text-[var(--text-primary)]">{user.first_name}</p>
                </div>
              )}
              {user.last_name && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Last Name</span>
                  <p className="text-[var(--text-primary)]">{user.last_name}</p>
                </div>
              )}
              {user.phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Phone</span>
                  <p className="text-[var(--text-primary)]">{user.phone}</p>
                </div>
              )}
              {user.cell_phone && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cell Phone</span>
                  <p className="text-[var(--text-primary)]">{user.cell_phone}</p>
                </div>
              )}
              {user.company && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Company</span>
                  <p className="text-[var(--text-primary)]">{user.company}</p>
                </div>
              )}
              {user.title && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Title</span>
                  <p className="text-[var(--text-primary)]">{user.title}</p>
                </div>
              )}
              {user.departments && user.departments.length > 0 && (
                <div className="space-y-1 md:col-span-2">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Departments</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.departments.map((deptName) => {
                      const dept = departments.find(d => d.name === deptName);
                      const deptColor = dept?.color || '#6B7280'; // Default gray if not found
                      return (
                        <span
                          key={deptName}
                          className="text-xs font-medium"
                          style={{
                            color: deptColor
                          }}
                        >
                          {deptName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Created</span>
                <p className="text-[var(--text-primary)]">{formatDate(user.created_at)}</p>
              </div>
              {user.last_login_at && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Last Login</span>
                  <p className="text-[var(--text-primary)]">{formatDate(user.last_login_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PermissionGuard>
  );
}
