'use client';

import { useEffect } from 'react';

/**
 * Component that ensures DonumLogo.svg preload links have the correct 'as' attribute
 * This fixes the browser warning about preloaded resources not having proper 'as' values
 */
export default function LogoPreload() {
  useEffect(() => {
    const fixPreloadLinks = () => {
      // Find all preload links for DonumLogo.svg
      const preloadLinks = document.querySelectorAll('link[rel="preload"][href="/DonumLogo.svg"]');
      
      preloadLinks.forEach((link) => {
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

    // Fix existing preload links immediately
    fixPreloadLinks();

    // Watch for new preload links being added to the DOM
    const observer = new MutationObserver(() => {
      fixPreloadLinks();
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
