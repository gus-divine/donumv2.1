'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/admin/shared/ThemeToggle';
import Image from 'next/image';
import Link from 'next/link';

interface PartnersLayoutProps {
  children: React.ReactNode;
}

export default function PartnersLayout({ children }: PartnersLayoutProps) {
  const { session, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/auth/signin?redirect=' + encodeURIComponent('/partners/dashboard'));
        return;
      }
      if (role !== 'donum_partner') {
        router.push('/auth/signin');
      }
    }
  }, [session, role, loading, router]);

  if (loading || !session) return null;

  if (role !== 'donum_partner') return null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex">
      <aside className="w-56 border-r border-[var(--border)] p-4 flex flex-col">
        <Link href="/partners/dashboard" className="flex items-center gap-2 mb-8">
          <Image src="/DonumLogo.svg" alt="Donum" width={32} height={32} />
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider">DONUM Partners</span>
        </Link>
        <nav className="flex-1">
          <Link href="/partners/dashboard" className="block py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Dashboard</Link>
        </nav>
        <div className="pt-4 border-t border-[var(--border)]">
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
