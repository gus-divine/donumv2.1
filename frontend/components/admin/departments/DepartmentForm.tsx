'use client';

import { useState, useEffect } from 'react';
import { createDepartment, updateDepartment, type Department, type CreateDepartmentInput, type UpdateDepartmentInput } from '@/lib/api/departments';
import {
  Users, Shield, Briefcase, Headphones, Settings, ChartBar, File, Folder,
  Mail, Phone, Calendar, Star, Heart, Tag, Flag, Bell, Building2, UserCheck,
  UserSearch, CreditCard, TrendingUp, BookOpen, LayoutDashboard, FileText,
  Database, Globe, Target, Zap, Award, Home, MapPin, DollarSign, PieChart,
  BarChart3, Wallet, Handshake, Lightbulb, Rocket, Gem, Banknote, Coins,
  Receipt, Calculator, Percent, TrendingDown, LineChart, Activity, Lock,
  Key, ClipboardCheck, CheckCircle2, AlertCircle, Info, type LucideIcon
} from 'lucide-react';

interface DepartmentFormProps {
  department?: Department | null;
  onSuccess: () => void;
  onCancel: () => void;
  submitRef?: React.RefObject<HTMLButtonElement | null>;
  onLoadingChange?: (loading: boolean) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

const ICON_OPTIONS = [
  // Core business icons
  'users', 'briefcase', 'building2', 'handshake', 'userCheck', 'userSearch',
  // Financial icons
  'dollarSign', 'creditCard', 'wallet', 'banknote', 'coins', 'receipt', 'calculator',
  'percent', 'trendingUp', 'trendingDown', 'pieChart', 'barChart3', 'lineChart', 'chart',
  // Operations & Services
  'headphones', 'mail', 'phone', 'calendar', 'file', 'folder', 'fileText', 'bookOpen',
  // Security & Compliance
  'shield', 'lock', 'key', 'clipboardCheck', 'checkCircle2', 'alertCircle',
  // Management & Analytics
  'settings', 'layoutDashboard', 'database', 'activity', 'target', 'award',
  // General
  'star', 'tag', 'flag', 'bell', 'info', 'zap', 'home', 'mapPin', 'globe'
] as const;

// Map icon names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  // Core business icons
  users: Users,
  briefcase: Briefcase,
  building2: Building2,
  handshake: Handshake,
  userCheck: UserCheck,
  userSearch: UserSearch,
  // Financial icons
  dollarSign: DollarSign,
  creditCard: CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  receipt: Receipt,
  calculator: Calculator,
  percent: Percent,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  pieChart: PieChart,
  barChart3: BarChart3,
  lineChart: LineChart,
  chart: ChartBar,
  // Operations & Services
  headphones: Headphones,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  file: File,
  folder: Folder,
  fileText: FileText,
  bookOpen: BookOpen,
  // Security & Compliance
  shield: Shield,
  lock: Lock,
  key: Key,
  clipboardCheck: ClipboardCheck,
  checkCircle2: CheckCircle2,
  alertCircle: AlertCircle,
  // Management & Analytics
  settings: Settings,
  layoutDashboard: LayoutDashboard,
  database: Database,
  activity: Activity,
  target: Target,
  award: Award,
  // General
  star: Star,
  tag: Tag,
  flag: Flag,
  bell: Bell,
  info: Info,
  zap: Zap,
  home: Home,
  mapPin: MapPin,
  globe: Globe,
};

const COLOR_OPTIONS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#A855F7'
];

export function DepartmentForm({ department, onSuccess, onCancel, submitRef, onLoadingChange, onHasChangesChange }: DepartmentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('users');
  const [isActive, setIsActive] = useState(true);
  const [prospectAssignmentEnabled, setProspectAssignmentEnabled] = useState(true);
  const [memberAssignmentEnabled, setMemberAssignmentEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track initial values to detect changes
  const [initialValues, setInitialValues] = useState<{
    name: string;
    description: string;
    color: string;
    icon: string;
    isActive: boolean;
    prospectAssignmentEnabled: boolean;
    memberAssignmentEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (department) {
      const deptName = department.name;
      const deptDescription = department.description || '';
      const deptColor = department.color;
      const deptIcon = department.icon;
      const deptIsActive = department.is_active;
      const deptProspectEnabled = department.prospect_assignment_enabled ?? department.lead_assignment_enabled ?? true;
      const deptMemberEnabled = department.member_assignment_enabled ?? true;

      setName(deptName);
      setDescription(deptDescription);
      setColor(deptColor);
      setIcon(deptIcon);
      setIsActive(deptIsActive);
      setProspectAssignmentEnabled(deptProspectEnabled);
      setMemberAssignmentEnabled(deptMemberEnabled);

      setInitialValues({
        name: deptName,
        description: deptDescription,
        color: deptColor,
        icon: deptIcon,
        isActive: deptIsActive,
        prospectAssignmentEnabled: deptProspectEnabled,
        memberAssignmentEnabled: deptMemberEnabled,
      });
    } else {
      // For new department, initial values are the defaults
      setInitialValues({
        name: '',
        description: '',
        color: '#6366F1',
        icon: 'users',
        isActive: true,
        prospectAssignmentEnabled: true,
        memberAssignmentEnabled: true,
      });
    }
  }, [department]);

  // Check if form has unsaved changes
  const hasChanges = initialValues ? (
    name !== initialValues.name ||
    description !== initialValues.description ||
    color !== initialValues.color ||
    icon !== initialValues.icon ||
    isActive !== initialValues.isActive ||
    prospectAssignmentEnabled !== initialValues.prospectAssignmentEnabled ||
    memberAssignmentEnabled !== initialValues.memberAssignmentEnabled
  ) : false;

  // Notify parent about changes
  useEffect(() => {
    if (onHasChangesChange) {
      onHasChangesChange(hasChanges);
    }
  }, [hasChanges, onHasChangesChange]);

  // Browser beforeunload warning
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

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
      // Reset initial values after successful save
      setInitialValues({
        name,
        description: description || '',
        color,
        icon,
        isActive,
        prospectAssignmentEnabled,
        memberAssignmentEnabled,
      });
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
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {hasChanges && (
        <div className="p-4 border-l-4 border-yellow-500 rounded-lg shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">You have unsaved changes</p>
              <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                Please save your changes before navigating away to avoid losing your work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="pt-4 border-t-2 border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Basic Information</h3>
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Department Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-white dark:bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
              placeholder="e.g., Sales, Support, Operations"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-white dark:bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all resize-none"
              placeholder="Brief description of the department's purpose"
            />
          </div>
        </div>
      </div>

      {/* Visual Identity */}
      <div className="pt-6 border-t border-[var(--core-gold)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Visual Identity</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="color" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
              Color
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-12 border-2 border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--core-blue)] transition-colors"
                />
                <div className="flex-1">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">Quick Select</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                          color === c 
                            ? 'border-[var(--core-blue)] ring-2 ring-[var(--core-blue)]/20' 
                            : 'border-[var(--border)] hover:border-[var(--core-blue)]/50'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map((opt) => {
                const IconComponent = ICON_MAP[opt];
                const isSelected = icon === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIcon(opt)}
                    className={`p-2.5 rounded-lg border-2 transition-all hover:scale-105 bg-white dark:bg-[var(--background)] ${
                      isSelected
                        ? 'border-[var(--core-blue)] bg-[var(--core-blue)]/10 ring-2 ring-[var(--core-blue)]/20'
                        : 'border-[var(--border)] hover:border-[var(--core-blue)]/50 hover:bg-gray-50 dark:hover:bg-[var(--surface-hover)]'
                    }`}
                    title={opt}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={`w-5 h-5 mx-auto transition-colors ${
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
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Selected: <span className="font-medium text-[var(--text-primary)]">{icon}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="pt-6 border-t-2 border-[var(--core-blue)] pb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Settings</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-2 focus:ring-[var(--core-blue)] cursor-pointer bg-white dark:bg-[var(--background)]"
              />
              <div className="flex-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                  Department is active
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Inactive departments will not appear in assignment dropdowns
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={prospectAssignmentEnabled}
                onChange={(e) => setProspectAssignmentEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-2 focus:ring-[var(--core-blue)] cursor-pointer bg-white dark:bg-[var(--background)]"
              />
              <div className="flex-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                  Allow prospect assignments
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Enable staff from this department to be assigned to prospects
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={memberAssignmentEnabled}
                onChange={(e) => setMemberAssignmentEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[var(--core-blue)] border-[var(--border)] rounded focus:ring-2 focus:ring-[var(--core-blue)] cursor-pointer bg-white dark:bg-[var(--background)]"
              />
              <div className="flex-1">
                <span className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                  Allow member assignments
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Enable staff from this department to be assigned to members
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Hidden submit button for external trigger */}
      <button
        ref={submitRef}
        type="submit"
        className="hidden"
        disabled={loading}
      />
    </form>
  );
}
