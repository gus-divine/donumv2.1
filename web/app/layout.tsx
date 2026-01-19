import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ThemeInitializer from "./theme-initializer";
import { AuthProvider } from "@/lib/auth/auth-context";
import { DevAuthHelper } from "@/components/dev/DevAuthHelper";
import LogoPreload from "@/components/LogoPreload";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Donum - Charitable Gift Financing Platform",
  description: "Enterprise platform for Donum Financial Solutions serving financial professionals and members",
  icons: {
    icon: '/DonumLogo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="fix-logo-preload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function ensureProperPreload() {
                  if (!document.head) {
                    if (document.readyState === 'loading') {
                      document.addEventListener('DOMContentLoaded', ensureProperPreload);
                      return;
                    }
                    setTimeout(ensureProperPreload, 0);
                    return;
                  }

                  // Check if a proper preload link already exists
                  const existingProperPreload = document.querySelector(
                    'link[rel="preload"][href="/DonumLogo.svg"][as="image"]'
                  );

                  if (!existingProperPreload) {
                    // Remove any preload links without proper 'as' attribute
                    const badPreloads = document.querySelectorAll(
                      'link[rel="preload"][href="/DonumLogo.svg"]:not([as="image"])'
                    );
                    badPreloads.forEach(function(link) {
                      link.remove();
                    });

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

                  allPreloadLinks.forEach(function(link) {
                    if (!link.getAttribute('as') || link.getAttribute('as') !== 'image') {
                      link.setAttribute('as', 'image');
                    }
                    if (!link.getAttribute('type')) {
                      link.setAttribute('type', 'image/svg+xml');
                    }
                  });
                }

                // Run immediately
                ensureProperPreload();

                // Also watch for changes
                if (document.head) {
                  const observer = new MutationObserver(ensureProperPreload);
                  observer.observe(document.head, {
                    childList: true,
                    subtree: true
                  });
                }
              })();
            `,
          }}
        />
        <LogoPreload />
        <ThemeInitializer />
        <AuthProvider>
          <DevAuthHelper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
