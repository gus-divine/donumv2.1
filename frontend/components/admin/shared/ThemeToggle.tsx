'use client';

export function ThemeToggle() {
  const handleThemeToggle = () => {
    if (window.themeManager) {
      window.themeManager.toggleTheme();
    }
  };

  return (
    <button
      onClick={handleThemeToggle}
      className="theme-toggle-btn ml-5"
      aria-label="Toggle theme"
      title="Toggle light/dark theme"
    >
      <svg className="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34l1.41 1.41M16.24 16.24l1.41 1.41M6.34 17.66l1.41-1.41M16.24 7.76l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <svg className="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
