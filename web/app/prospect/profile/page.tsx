'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProspectProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cellPhone: '',
    dateOfBirth: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from('donum_accounts')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error loading profile:', fetchError);
        setError('Failed to load profile');
        return;
      }

      if (data) {
        setProfileData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          cellPhone: data.cell_phone || '',
          dateOfBirth: data.date_of_birth || '',
          addressLine1: data.address_line_1 || '',
          addressLine2: data.address_line_2 || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zip_code || '',
          country: data.country || 'US',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from('donum_accounts')
        .update({
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim(),
          phone: profileData.phone.trim() || null,
          cell_phone: profileData.cellPhone.trim() || null,
          date_of_birth: profileData.dateOfBirth || null,
          address_line_1: profileData.addressLine1.trim() || null,
          address_line_2: profileData.addressLine2.trim() || null,
          city: profileData.city.trim() || null,
          state: profileData.state.trim() || null,
          zip_code: profileData.zipCode.trim() || null,
          country: profileData.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError(updateError.message || 'Failed to save profile');
        setIsSaving(false);
        return;
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
    setIsEditing(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        {/* Back Button Skeleton */}
        <div className="mb-4">
          <Skeleton height="1.5rem" width="8rem" />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton height="2rem" width="12rem" />
                <Skeleton height="1rem" width="20rem" />
              </div>
              <Skeleton height="2.5rem" width="8rem" />
            </div>
          </div>

          {/* Profile Form Skeleton */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton height="0.875rem" width="6rem" />
                  <Skeleton height="2.5rem" width="100%" />
                </div>
              ))}
            </div>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Profile</h1>
              <p className="text-[var(--text-secondary)]">
                View and edit your profile information.
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.firstName || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.lastName || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Email
                </label>
                <p className="text-[var(--text-secondary)]">{profileData.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Cell Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.cellPhone}
                    onChange={(e) => setProfileData({ ...profileData, cellPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.cellPhone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">
                    {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Address Line 1
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.addressLine1}
                  onChange={(e) => setProfileData({ ...profileData, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                />
              ) : (
                <p className="text-[var(--text-secondary)]">{profileData.addressLine1 || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Address Line 2
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.addressLine2}
                  onChange={(e) => setProfileData({ ...profileData, addressLine2: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                />
              ) : (
                <p className="text-[var(--text-secondary)]">{profileData.addressLine2 || 'Not provided'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.city || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  State
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.state}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.state || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  ZIP Code
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.zipCode}
                    onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text-primary)]"
                  />
                ) : (
                  <p className="text-[var(--text-secondary)]">{profileData.zipCode || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-[var(--border)]">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-[var(--border)] rounded text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[var(--core-blue)] text-white rounded hover:bg-[var(--core-blue-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
