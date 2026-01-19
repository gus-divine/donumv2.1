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

export default function SignInPage() {
  const router = useRouter();
  const { session, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for redirect parameter, email confirmation, and messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const confirmed = urlParams.get('confirmed');
    const message = urlParams.get('message');
    
    if (redirect) {
      setRedirectUrl(redirect);
    }
    
    if (message) {
      setError(message);
      // Clear the message from URL after displaying (delay to allow error to render)
      setTimeout(() => {
        const params = new URLSearchParams();
        if (redirect) params.set('redirect', redirect);
        router.replace('/auth/signin' + (params.toString() ? `?${params.toString()}` : ''));
      }, 100);
    }
    
    if (confirmed === 'true') {
      setEmailConfirmed(true);
      setTimeout(() => {
        const params = new URLSearchParams();
        if (redirect) params.set('redirect', redirect);
        router.replace('/auth/signin' + (params.toString() ? `?${params.toString()}` : ''));
      }, 5000);
    }
  }, [router]);

  // Redirect if already authenticated and auth data is loaded
  useEffect(() => {
    if (!authLoading && session && role) {
      // User is already signed in and role is loaded, redirect based on role
      const storedRedirect = localStorage.getItem('signup_redirect_url');
      if (storedRedirect) {
        localStorage.removeItem('signup_redirect_url');
        router.push(storedRedirect);
        return;
      }

      // Role-based redirects
      if (role === 'donum_member') {
        router.push(redirectUrl || '/members/dashboard');
        return;
      }
      
      if (role === 'donum_prospect') {
        // Check if prequalification is complete
        checkPrequalificationStatus(redirectUrl || '/prospect/dashboard');
        return;
      }
      
      if (['donum_staff', 'donum_admin', 'donum_super_admin'].includes(role)) {
        router.push(redirectUrl || '/admin/dashboard');
        return;
      }

      // Default fallback
      router.push(redirectUrl || '/admin/dashboard');
    }
  }, [session, role, authLoading, router, redirectUrl]);

  // Helper function to check prequalification status
  const checkPrequalificationStatus = async (defaultRedirect: string) => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push(defaultRedirect);
        return;
      }

      // Fetch user data from donum_accounts
      const { data: userData } = await supabase
        .from('donum_accounts')
        .select('annual_income, net_worth, risk_tolerance')
        .eq('id', authUser.id)
        .single();

      // Check if prequalification is complete (all required fields filled)
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
      // On error, redirect to dashboard
      router.push(defaultRedirect);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Wait for auth context to load user role before redirecting
        // The useEffect hook above will handle the redirect once role is loaded
        // This prevents the race condition where we redirect before role is fetched
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

        {/* Sign In Form Container (right side) */}
        <div className="signin-form-container">
          <h1 className="signin-title">Sign In</h1>
          <p className="signin-subtitle">Access your Donum workspace</p>

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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password">Password</label>
                <a
                  href={`/auth/forgot-password${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                  className="text-sm text-[var(--core-blue)] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Success Message - Email Confirmed */}
            {emailConfirmed && (
              <div className="form-success show" style={{ backgroundColor: 'var(--success)', color: 'var(--background)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p>✅ Email confirmed successfully! You can now sign in.</p>
              </div>
            )}

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
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="signin-footer">
            <p>
              Need an account?{' '}
              <a 
                href="/auth/signup"
                className="signup-link"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
