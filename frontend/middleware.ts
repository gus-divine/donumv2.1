import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Subdomain-based routing for Donum portals:
 * - admin.domain.com  → /admin
 * - team.domain.com   → /team
 * - partner.domain.com → /partners
 * - member.domain.com → /user (prospect + member)
 *
 * Local dev: admin.localhost, team.localhost, partner.localhost, member.localhost
 */

const SUBDOMAIN_PREFIXES: Record<string, string> = {
  admin: '/admin',
  team: '/team',
  partner: '/partners',
  member: '/user',
};

function getSubdomain(host: string): string | null {
  // Remove port
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  // localhost: admin.localhost, team.localhost, etc.
  if (hostname.endsWith('.localhost') || hostname === 'localhost') {
    if (parts.length >= 2 && parts[0] && parts[1] === 'localhost') {
      return parts[0];
    }
    return null;
  }

  // Production: admin.donum.com, team.donum.com, etc.
  if (parts.length >= 2) {
    const subdomain = parts[0];
    if (subdomain && SUBDOMAIN_PREFIXES[subdomain]) {
      return subdomain;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  const { pathname } = request.nextUrl;

  // No subdomain or unknown subdomain - allow through (main marketing/landing site)
  if (!subdomain || !SUBDOMAIN_PREFIXES[subdomain]) {
    return NextResponse.next();
  }

  const prefix = SUBDOMAIN_PREFIXES[subdomain];

  // Already under the correct prefix - allow through
  if (pathname.startsWith(prefix) || pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Static files and _next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Root or other paths on subdomain - rewrite to prefix + default route
  // e.g. admin.domain.com/ → admin.domain.com/admin/dashboard
  // e.g. admin.domain.com/dashboard → admin.domain.com/admin/dashboard
  const defaultPaths: Record<string, string> = {
    '/admin': '/admin/dashboard',
    '/team': '/team/dashboard',
    '/partners': '/partners/dashboard',
    '/user': '/user', // user layout will redirect to prospect/member
  };
  const defaultPath = defaultPaths[prefix];
  const newPath = pathname === '/' ? (defaultPath || prefix) : `${prefix}${pathname}`;
  const url = request.nextUrl.clone();
  url.pathname = newPath;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
