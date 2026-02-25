'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

interface InviteProspectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InviteProspectForm({ onSuccess, onCancel }: InviteProspectFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="invite-email" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Email *
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="prospect@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="invite-first" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            First Name
          </label>
          <input
            id="invite-first"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="invite-last" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Last Name
          </label>
          <input
            id="invite-last"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="Doe"
          />
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        They will receive an email to set their password and join the platform.
      </p>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-[var(--core-blue)] dark:text-gray-400 hover:text-[var(--core-blue-light)] dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Invite'}
        </button>
      </div>
    </form>
  );
}
