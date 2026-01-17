/**
 * Theme Manager - Handles theme switching and persistence
 * Uses traditional Donum brand colors (navy blue + gold) with modern design
 * Follows .cursorrules modular architecture patterns
 */
class ThemeManager {
  private initialized = false;
  private currentTheme: 'light' | 'dark' = 'light';
  private systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.currentTheme = this.getStoredTheme();
  }

  /**
   * Initialize theme manager
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.applyTheme(this.currentTheme);
    this.setupSystemThemeListener();
    this.initialized = true;
  }

  /**
   * Set theme and persist to storage
   * @param theme - Theme to apply ('light' or 'dark')
   */
  setTheme(theme: 'light' | 'dark'): void {
    if (theme !== this.currentTheme) {
      this.currentTheme = theme;
      this.applyTheme(theme);
      this.storeTheme(theme);

      // Emit custom event for components to react
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme }
      }));
    }
  }

  /**
   * Get current theme
   * @returns Current theme
   */
  getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Apply theme to document
   * @param theme - Theme to apply
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Get stored theme from localStorage
   * @returns Stored theme or 'light' as fallback
   */
  private getStoredTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';

    try {
      const stored = localStorage.getItem('theme');
      return (stored === 'dark' || stored === 'light') ? stored : 'light';
    } catch (error) {
      console.warn('[ThemeManager] Error reading theme from storage:', error);
      return 'light';
    }
  }

  /**
   * Store theme in localStorage
   * @param theme - Theme to store
   */
  private storeTheme(theme: 'light' | 'dark'): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('[ThemeManager] Error storing theme:', error);
    }
  }

  /**
   * Listen for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

    // Avoid adding duplicate listeners
    if (this.systemThemeListener) {
      return;
    }

    // Create and store the event handler
    this.systemThemeListener = (e: MediaQueryListEvent) => {
      // Only auto-switch if no manual preference is stored
      if (!localStorage.getItem('theme')) {
        const systemTheme = e.matches ? 'dark' : 'light';
        this.setTheme(systemTheme);
      }
    };

    // Listen for system theme preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemThemeListener);
  }

  /**
   * Cleanup theme manager resources
   */
  destroy(): void {
    if (typeof window !== 'undefined' && this.systemThemeListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.systemThemeListener);
      this.systemThemeListener = null;
    }
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

// Export for use in other modules
if (typeof window !== 'undefined') {
  (window as any).themeManager = themeManager;
}

export default themeManager;
