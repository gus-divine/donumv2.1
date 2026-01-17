'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import themeManager from '@/lib/theme-manager';

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

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Initialize theme manager if not already initialized
    if (typeof window !== 'undefined') {
      // Ensure theme manager is initialized
      themeManager.init().then(() => {
        const currentTheme = themeManager.getTheme();
        setIsDark(currentTheme === 'dark');
      });
      
      // Listen for theme changes
      const handleThemeChange = (e: CustomEvent) => {
        setIsDark(e.detail.theme === 'dark');
      };
      
      window.addEventListener('theme-changed', handleThemeChange as EventListener);
      
      return () => {
        window.removeEventListener('theme-changed', handleThemeChange as EventListener);
      };
    }
  }, []);

  // Handle theme toggle using React onClick
  const handleThemeToggle = () => {
    if (window.themeManager) {
      window.themeManager.toggleTheme();
    }
  };

  const handleMembersClick = () => {
    router.push('/auth/signin');
  };

  const handlePartnersClick = () => {
    router.push('/partners');
  };

  const handleApplyClick = () => {
    router.push('/prequalify');
  };

  const handleCheckStatusClick = () => {
    router.push('/leads/status');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/DonumLogo.svg"
            alt="Donum"
            width={200}
            height={80}
            className="mx-auto mb-4"
          />
          <div className="text-[var(--text-secondary)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Theme Toggle */}
      <div className="theme-toggle-container">
        <button
          id="themeToggle"
          onClick={handleThemeToggle}
          className="theme-toggle-btn"
          aria-label="Toggle theme"
          aria-pressed={isDark}
          title="Toggle light/dark theme">
          <svg className="theme-icon-sun" width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M12.5 3.5l-1.5 1.5" />
          </svg>
          <svg className="theme-icon-moon" width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8.5A6 6 0 1 1 7.5 2a4.5 4.5 0 0 0 6.5 6.5z"/>
          </svg>
        </button>
      </div>

      {/* Main Landing Layout */}
      <div className="landing-layout">
        {/* Main Content Wrapper */}
        <div className="landing-main-content">
          {/* Logo Section */}
          <div className="landing-logo-section">
            <Image
              src="/DonumLogo.svg"
              alt="Donum Financial Solutions"
              width={300}
              height={120}
              className="landing-logo"
              priority
            />
            <div className="landing-tagline">
              <div className="landing-header">Smart Financing for</div>
              <div className="landing-title">Generous Giving</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="landing-actions">
            <div className="action-buttons-grid">
              {/* Members Button */}
              <div className="action-button-container">
                <button
                  type="button"
                  onClick={handleMembersClick}
                  className="action-button members-button"
                >
                  <div className="button-title">MEMBERS</div>
                  <div className="button-subtitle discreet-subtitle">Member Portal</div>
                </button>
              </div>

              {/* Partners Button */}
              <div className="action-button-container">
                <button
                  type="button"
                  onClick={handlePartnersClick}
                  className="action-button partners-button"
                >
                  <div className="button-title">PARTNERS</div>
                  <div className="button-subtitle discreet-subtitle">Partner Portal</div>
                </button>
              </div>

              {/* Apply Link */}
              <div className="apply-link-container">
                <a
                  href="/prequalify"
                  className="apply-link"
                >
                  Prequalify to become a member
                </a>
              </div>

              {/* Check Status Link */}
              <div className="apply-link-container">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCheckStatusClick();
                  }}
                  className="apply-link"
                >
                  Check your application status
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="landing-trust-signals">
          <span>SOC 2 Compliant</span>
          <span className="trust-divider">·</span>
          <span>IRS Approved Strategies</span>
          <span className="trust-divider">·</span>
          <span>High-Net-Worth Focus</span>
        </div>
      </div>
    </div>
  );
}
