'use client';

import { useEffect } from 'react';

/**
 * Component that properly preloads DonumLogo.svg with correct 'as' attribute
 * Adds a proper preload link and fixes any existing ones created by Next.js
 */
export default function LogoPreload() {
  useEffect(() => {
    const ensureProperPreload = () => {
      if (!document.head) return;

      // Check if a proper preload link already exists
      const existingProperPreload = document.querySelector(
        'link[rel="preload"][href="/DonumLogo.svg"][as="image"]'
      );

      if (!existingProperPreload) {
        // Remove any preload links without proper 'as' attribute
        const badPreloads = document.querySelectorAll(
          'link[rel="preload"][href="/DonumLogo.svg"]:not([as="image"])'
        );
        badPreloads.forEach((link) => link.remove());

        // Add a proper preload link with correct attributes
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = '/DonumLogo.svg';
        link.setAttribute('as', 'image');
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
      }

      // Also fix any existing preload links to ensure they have proper attributes
      const allPreloadLinks = document.querySelectorAll(
        'link[rel="preload"][href="/DonumLogo.svg"]'
      );

      allPreloadLinks.forEach((link) => {
        const linkElement = link as HTMLLinkElement;
        // Ensure 'as' attribute is set to 'image'
        if (!linkElement.getAttribute('as') || linkElement.getAttribute('as') !== 'image') {
          linkElement.setAttribute('as', 'image');
        }
        // Ensure 'type' attribute is set
        if (!linkElement.getAttribute('type')) {
          linkElement.setAttribute('type', 'image/svg+xml');
        }
      });
    };

    // Run immediately
    ensureProperPreload();

    // Watch for new preload links being added to the DOM (e.g., by Next.js)
    const observer = new MutationObserver(() => {
      ensureProperPreload();
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
