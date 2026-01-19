'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function MemberProfilePage() {
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
      <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton height="2rem" width="12rem" />
                <Skeleton height="1rem" width="20rem" />
              </div>
              <Skeleton height="2rem" width="6rem" />
            </div>
          </div>

          {/* Profile Sections Skeleton */}
          <div className="space-y-6">
            <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
              <Skeleton height="1.5rem" width="10rem" className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton height="0.875rem" width="6rem" />
                    <Skeleton height="2.5rem" width="100%" />
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
              <Skeleton height="1.5rem" width="8rem" className="mb-4" />
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton height="0.875rem" width="8rem" />
                  <Skeleton height="2.5rem" width="100%" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton height="0.875rem" width="5rem" />
                      <Skeleton height="2.5rem" width="100%" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--surface)]/30 to-[var(--background)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {profileData.firstName && profileData.lastName
                ? `${profileData.firstName} ${profileData.lastName}`
                : 'Profile'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              View and edit your profile information.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm mb-6">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Personal Information Section */}
        <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6 mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="firstName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    First Name
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    First Name
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.firstName || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="lastName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Last Name
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Last Name
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.lastName || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Email
                </span>
                <p className="text-[var(--text-primary)]">{profileData.email}</p>
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="phone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Phone
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Phone
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.phone || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="cellPhone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Cell Phone
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Cell Phone
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="cellPhone"
                    type="tel"
                    value={profileData.cellPhone}
                    onChange={(e) => setProfileData({ ...profileData, cellPhone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.cellPhone || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="dateOfBirth" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Date of Birth
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Date of Birth
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">
                    {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="pt-6 border-t border-[var(--core-blue)] pb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Address</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              {isEditing ? (
                <label htmlFor="addressLine1" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Address Line 1
                </label>
              ) : (
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Address Line 1
                </span>
              )}
              {isEditing ? (
                <input
                  id="addressLine1"
                  type="text"
                  value={profileData.addressLine1}
                  onChange={(e) => setProfileData({ ...profileData, addressLine1: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                />
              ) : (
                <p className="text-[var(--text-primary)]">{profileData.addressLine1 || '-'}</p>
              )}
            </div>

            <div className="space-y-2">
              {isEditing ? (
                <label htmlFor="addressLine2" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Address Line 2
                </label>
              ) : (
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Address Line 2
                </span>
              )}
              {isEditing ? (
                <input
                  id="addressLine2"
                  type="text"
                  value={profileData.addressLine2}
                  onChange={(e) => setProfileData({ ...profileData, addressLine2: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                />
              ) : (
                <p className="text-[var(--text-primary)]">{profileData.addressLine2 || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="city" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    City
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    City
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="city"
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.city || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="state" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    State
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    State
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="state"
                    type="text"
                    value={profileData.state}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.state || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <label htmlFor="zipCode" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    ZIP Code
                  </label>
                ) : (
                  <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    ZIP Code
                  </span>
                )}
                {isEditing ? (
                  <input
                    id="zipCode"
                    type="text"
                    value={profileData.zipCode}
                    onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-[var(--text-primary)]">{profileData.zipCode || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[var(--core-blue)]">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
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
      </div>
    </main>
  );
}
