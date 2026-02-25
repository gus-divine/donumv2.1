/**
 * Subdomain utilities for Donum portals
 * Portals: admin, team, partner, member
 */

export type PortalSubdomain = 'admin' | 'team' | 'partner' | 'member';

export const PORTAL_PATHS: Record<PortalSubdomain, string> = {
  admin: '/admin',
  team: '/team',
  partner: '/partners',
  member: '/user',
};

/**
 * Get the base URL for a portal (subdomain + protocol)
 * e.g. admin.donum.com, team.localhost:3000
 */
export function getPortalBaseUrl(subdomain: PortalSubdomain): string {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const protocol = window.location.protocol;
    const parts = host.split(':');
    const hostname = parts[0];
    const port = parts[1];

    // Check if we're already on a subdomain (getSubdomainFromHost is now exported)
    const currentSubdomain = getSubdomainFromHost(host);
    if (currentSubdomain === subdomain) {
      return `${protocol}//${host}`;
    }

    // Build subdomain URL
    const baseHost = getBaseHost(hostname);
    const newHost = baseHost ? `${subdomain}.${baseHost}` : `${subdomain}.localhost`;
    return port ? `${protocol}//${newHost}:${port}` : `${protocol}//${newHost}`;
  }

  // Server-side: use env or default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(baseUrl);
  const baseHost = url.hostname;
  const newHost = baseHost === 'localhost' ? `${subdomain}.localhost` : `${subdomain}.${baseHost}`;
  return `${url.protocol}//${newHost}${url.port ? ':' + url.port : ''}`;
}

export function getSubdomainFromHost(host: string): string | null {
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  if (hostname.endsWith('.localhost')) {
    return parts.length >= 2 ? parts[0] : null;
  }
  if (parts.length >= 2 && SUBDOMAINS.has(parts[0])) {
    return parts[0];
  }
  return null;
}

/** True when on admin/team/partner subdomain (not member, not main domain) */
export function isOnStaffPortalSubdomain(): boolean {
  if (typeof window === 'undefined') return false;
  const sub = getSubdomainFromHost(window.location.host);
  return sub === 'admin' || sub === 'team' || sub === 'partner';
}

const SUBDOMAINS = new Set(['admin', 'team', 'partner', 'member']);

function getBaseHost(hostname: string): string {
  if (hostname === 'localhost') return 'localhost';
  const parts = hostname.split('.');
  if (SUBDOMAINS.has(parts[0])) {
    parts.shift();
    return parts.join('.');
  }
  return hostname;
}

/**
 * Get the redirect URL for a role after sign-in
 */
export function getRedirectUrlForRole(role: string): string {
  const portal = getPortalForRole(role);
  const baseUrl = getPortalBaseUrl(portal);
  const path = getDefaultPathForRole(role);
  return `${baseUrl}${path}`;
}

function getPortalForRole(role: string): PortalSubdomain {
  switch (role) {
    case 'donum_super_admin':
    case 'donum_admin':
      return 'admin';
    case 'donum_staff':
      return 'team';
    case 'donum_partner':
      return 'partner';
    case 'donum_prospect':
    case 'donum_member':
      return 'member';
    default:
      return 'member';
  }
}

function getDefaultPathForRole(role: string): string {
  switch (role) {
    case 'donum_super_admin':
    case 'donum_admin':
      return '/admin/dashboard';
    case 'donum_staff':
      return '/team/dashboard';
    case 'donum_partner':
      return '/partners/dashboard';
    case 'donum_prospect':
      return '/user/prospect/dashboard';
    case 'donum_member':
      return '/user/member/dashboard';
    default:
      return '/user/prospect/dashboard';
  }
}
