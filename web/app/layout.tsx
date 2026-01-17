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
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/7f21453d-ef60-45b0-a450-871327c178dd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:32',message:'RootLayout rendering',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }
  // #endregion
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="fix-preload-links"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function fixPreloadLinks() {
                  const preloadLinks = document.querySelectorAll('link[rel="preload"][href="/DonumLogo.svg"]');
                  preloadLinks.forEach(function(link) {
                    if (!link.getAttribute('as') || link.getAttribute('as') !== 'image') {
                      link.setAttribute('as', 'image');
                    }
                    if (!link.getAttribute('type')) {
                      link.setAttribute('type', 'image/svg+xml');
                    }
                  });
                }
                // Run immediately and also watch for new links
                if (document.head) {
                  fixPreloadLinks();
                  const observer = new MutationObserver(fixPreloadLinks);
                  observer.observe(document.head, { childList: true, subtree: true });
                } else {
                  // If head doesn't exist yet, wait for DOMContentLoaded
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                      fixPreloadLinks();
                      const observer = new MutationObserver(fixPreloadLinks);
                      observer.observe(document.head, { childList: true, subtree: true });
                    });
                  }
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
