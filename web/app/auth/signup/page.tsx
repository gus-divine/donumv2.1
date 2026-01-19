'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

// Type declaration for window.themeManager
declare global {
  interface Window {
    themeManager: {
      setTheme: (theme: 'light' | 'dark') => void;
      getTheme: () => 'light' | 'dark';
      toggleTheme: () => void;
    };
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const { session, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && session && role) {
      // If prospect/lead, check prequalification status
      if (role === 'donum_prospect') {
        checkPrequalificationStatus();
        return;
      }
      // If member, go to member portal
      if (role === 'donum_member') {
        router.push('/members/dashboard');
        return;
      }
      // If admin/staff, go to admin
      if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push('/admin/dashboard');
        return;
      }
    }
  }, [session, role, authLoading, router]);

  // Helper function to check prequalification status
  const checkPrequalificationStatus = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/prospect/dashboard');
        return;
      }

      const { data: userData } = await supabase
        .from('donum_accounts')
        .select('annual_income, net_worth, risk_tolerance')
        .eq('id', authUser.id)
        .single();

      const isComplete = userData?.annual_income != null && 
                         userData?.net_worth != null && 
                         userData?.risk_tolerance != null;

      if (isComplete) {
        router.push('/prospect/dashboard');
      } else {
        router.push('/prospect/prequalify');
      }
    } catch (error) {
      console.error('Error checking prequalification status:', error);
      router.push('/prospect/dashboard');
    }
  };

  // Handle theme toggle
  useEffect(() => {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && window.themeManager) {
      const handleClick = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        window.themeManager.setTheme(newTheme);
      };
      
      themeToggle.addEventListener('click', handleClick);
      return () => themeToggle.removeEventListener('click', handleClick);
    }
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signin?confirmed=true`,
        },
      });

      if (authError) {
        // If user already exists in auth, redirect to sign in page
        if (authError.message?.includes('already registered') || 
            authError.message?.includes('already exists') ||
            authError.message?.includes('User already registered')) {
          router.push('/auth/signin?message=An account with this email already exists. Please sign in.');
          return;
        }
        setError(authError.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Create or update donum_accounts record with default prospect role
        // Use UPSERT to handle case where user already exists
        const { error: dbError } = await supabase
          .from('donum_accounts')
          .upsert({
            id: authData.user.id,
            email: email.trim(),
            role: 'donum_prospect',
            status: 'pending',
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (dbError) {
          console.error('Error creating/updating user account:', dbError);
          // If it's a duplicate key error, the user already exists - that's okay
          if (dbError.code !== '23505') { // 23505 is unique_violation
            setError('Failed to create account. Please try signing in instead.');
            setIsLoading(false);
            return;
          }
        }

        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) {
          // If auto sign-in fails, redirect to signin page
          router.push('/auth/signin?message=Account created. Please sign in.');
          return;
        }

        // Wait a moment for auth context to update, then redirect
        setTimeout(() => {
          router.push('/prospect/dashboard');
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, nextField?: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField) {
        nextField();
      }
    }
  };

  return (
    <div className="signin-overlay">
      {/* Theme Toggle */}
      <div className="theme-toggle-container">
        <button 
          id="themeToggle"
          className="theme-toggle-btn" 
          aria-label="Toggle theme"
          aria-pressed="false"
          title="Toggle light/dark theme"
        >
          <svg className="theme-icon-sun" width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M12.5 3.5l-1.5 1.5" />
          </svg>
          <svg className="theme-icon-moon" width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8.5A6 6 0 1 1 7.5 2a4.5 4.5 0 0 0 6.5 6.5z"/>
          </svg>
        </button>
      </div>

      <div className="signin-overlay-backdrop"></div>
      <div className="signin-overlay-content">
        {/* Logo Container (left side) */}
        <div className="signin-logo-container">
          <Image
            src="/DonumLogo.svg"
            alt="Donum Financial Solutions"
            className="signin-logo"
            width={260}
            height={260}
            priority
          />
        </div>

        {/* Sign Up Form Container (right side) */}
        <div className="signin-form-container">
          <h1 className="signin-title">Sign Up</h1>
          <p className="signin-subtitle">Create your Donum account</p>

          <form onSubmit={handleSubmit} className="signin-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={(e) => handleKeyPress(e, () => {
                  document.getElementById('password')?.focus();
                })}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onKeyPress={(e) => handleKeyPress(e, () => {
                  document.getElementById('confirmPassword')?.focus();
                })}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="form-error show">
                <p>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                className="signin-btn w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="signin-footer">
            <p>
              Already have an account?{' '}
              <a 
                href="/auth/signin"
                className="signup-link"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
