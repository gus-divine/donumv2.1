'use client';

import { useState, useEffect } from 'react';
import { createDepartment, updateDepartment, type Department, type CreateDepartmentInput, type UpdateDepartmentInput } from '@/lib/api/departments';
import {
  Users, Shield, Briefcase, Headphones, Settings, ChartBar, File, Folder,
  Mail, Phone, Calendar, Star, Heart, Tag, Flag, Bell, type LucideIcon
} from 'lucide-react';

interface DepartmentFormProps {
  department?: Department | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ICON_OPTIONS = [
  'users', 'shield', 'briefcase', 'headphones', 'settings', 'chart', 'file', 'folder',
  'mail', 'phone', 'calendar', 'star', 'heart', 'tag', 'flag', 'bell'
] as const;

// Map icon names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  briefcase: Briefcase,
  headphones: Headphones,
  settings: Settings,
  chart: ChartBar,
  file: File,
  folder: Folder,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  star: Star,
  heart: Heart,
  tag: Tag,
  flag: Flag,
  bell: Bell,
};

const COLOR_OPTIONS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#A855F7'
];

export function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('users');
  const [isActive, setIsActive] = useState(true);
  const [prospectAssignmentEnabled, setProspectAssignmentEnabled] = useState(true);
  const [memberAssignmentEnabled, setMemberAssignmentEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || '');
      setColor(department.color);
      setIcon(department.icon);
      setIsActive(department.is_active);
      setProspectAssignmentEnabled(department.prospect_assignment_enabled ?? department.lead_assignment_enabled ?? true);
      setMemberAssignmentEnabled(department.member_assignment_enabled ?? true);
    }
  }, [department]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (department) {
        const input: UpdateDepartmentInput = {
          name,
          description: description || undefined,
          color,
          icon,
          is_active: isActive,
          prospect_assignment_enabled: prospectAssignmentEnabled,
          member_assignment_enabled: memberAssignmentEnabled,
        };
        await updateDepartment(department.id, input);
      } else {
        const input: CreateDepartmentInput = {
          name,
          description: description || undefined,
          color,
          icon,
          is_active: isActive,
          prospect_assignment_enabled: prospectAssignmentEnabled,
          member_assignment_enabled: memberAssignmentEnabled,
        };
        await createDepartment(input);
      }
      onSuccess();
    } catch (err) {
      console.error('[DepartmentForm] Error saving department:', err);
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Department Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="e.g., Sales, Support, Operations"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
          placeholder="Brief description of the department's purpose"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Color
          </label>
          <div className="flex gap-2">
            <input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 border border-[var(--border)] rounded-lg cursor-pointer"
            />
            <div className="flex-1 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    color === c ? 'border-[var(--core-blue)]' : 'border-[var(--border)]'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Icon
          </label>
          <div className="grid grid-cols-4 gap-2 p-2 border border-[var(--border)] rounded-lg bg-[var(--background)]">
            {ICON_OPTIONS.map((opt) => {
              const IconComponent = ICON_MAP[opt];
              const isSelected = icon === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIcon(opt)}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--core-blue)] bg-[var(--core-blue)]/10'
                      : 'border-[var(--border)] hover:border-[var(--core-blue)]/50 hover:bg-[var(--surface-hover)]'
                  }`}
                  title={opt}
                >
                  {IconComponent && (
                    <IconComponent
                      className={`w-5 h-5 mx-auto ${
                        isSelected
                          ? 'text-[var(--core-blue)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Selected: <span className="font-medium">{icon}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)]"
          />
          <span className="text-sm text-[var(--text-primary)]">Department is active</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prospectAssignmentEnabled}
            onChange={(e) => setProspectAssignmentEnabled(e.target.checked)}
            className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)]"
          />
          <span className="text-sm text-[var(--text-primary)]">Allow prospect assignments</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={memberAssignmentEnabled}
            onChange={(e) => setMemberAssignmentEnabled(e.target.checked)}
            className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-[var(--core-blue)]"
          />
          <span className="text-sm text-[var(--text-primary)]">Allow member assignments</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--core-blue)] text-white rounded-lg hover:bg-[var(--core-blue-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </form>
  );
}
