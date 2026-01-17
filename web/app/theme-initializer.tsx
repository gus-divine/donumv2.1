'use client';

import { useEffect } from 'react';
import themeManager from '@/lib/theme-manager';

/**
 * Theme Initializer Component
 * Initializes theme manager on app load to apply saved theme preference
 */
export default function ThemeInitializer() {
  useEffect(() => {
    themeManager.init();
  }, []);

  return null;
}
