'use client';

import { useState, useEffect } from 'react';
import { createPlan, updatePlan, type DonumPlan, type CreatePlanInput, type UpdatePlanInput } from '@/lib/api/plans';
import { Plus, X, AlertCircle } from 'lucide-react';

interface PlanFormProps {
  plan?: DonumPlan | null;
  onSuccess: () => void;
  onCancel: () => void;
  submitRef?: React.RefObject<HTMLButtonElement | null>;
  onLoadingChange?: (loading: boolean) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

const ASSET_TYPE_OPTIONS = ['IRA', 'business', 'property', 'stocks', 'bonds', 'real_estate', 'other'] as const;

export function PlanForm({ plan, onSuccess, onCancel, submitRef, onLoadingChange, onHasChangesChange }: PlanFormProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minIncome, setMinIncome] = useState('');
  const [minAssets, setMinAssets] = useState('');
  const [minAge, setMinAge] = useState('');
  const [requiredAssetTypes, setRequiredAssetTypes] = useState<string[]>([]);
  const [requiresCharitableIntent, setRequiresCharitableIntent] = useState(true);
  const [taxDeductionPercent, setTaxDeductionPercent] = useState('');
  const [benefits, setBenefits] = useState<string[]>(['']);
  const [calculatorConfig, setCalculatorConfig] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Track initial values to detect changes
  const [initialValues, setInitialValues] = useState<{
    code: string;
    name: string;
    description: string;
    minIncome: string;
    minAssets: string;
    minAge: string;
    requiredAssetTypes: string[];
    requiresCharitableIntent: boolean;
    taxDeductionPercent: string;
    benefits: string[];
    calculatorConfig: string;
    isActive: boolean;
  } | null>(null);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (plan) {
      const planCode = plan.code;
      const planName = plan.name;
      const planDescription = plan.description || '';
      const planMinIncome = plan.min_income?.toString() || '';
      const planMinAssets = plan.min_assets?.toString() || '';
      const planMinAge = plan.min_age?.toString() || '';
      const planRequiredAssetTypes = plan.required_asset_types || [];
      const planRequiresCharitableIntent = plan.requires_charitable_intent ?? true;
      const planTaxDeductionPercent = plan.tax_deduction_percent.toString();
      const planBenefits = plan.benefits && plan.benefits.length > 0 ? plan.benefits : [''];
      const planCalculatorConfig = JSON.stringify(plan.calculator_config || {}, null, 2);
      const planIsActive = plan.is_active;

      setCode(planCode);
      setName(planName);
      setDescription(planDescription);
      setMinIncome(planMinIncome);
      setMinAssets(planMinAssets);
      setMinAge(planMinAge);
      setRequiredAssetTypes(planRequiredAssetTypes);
      setRequiresCharitableIntent(planRequiresCharitableIntent);
      setTaxDeductionPercent(planTaxDeductionPercent);
      setBenefits(planBenefits);
      setCalculatorConfig(planCalculatorConfig);
      setIsActive(planIsActive);

      setInitialValues({
        code: planCode,
        name: planName,
        description: planDescription,
        minIncome: planMinIncome,
        minAssets: planMinAssets,
        minAge: planMinAge,
        requiredAssetTypes: planRequiredAssetTypes,
        requiresCharitableIntent: planRequiresCharitableIntent,
        taxDeductionPercent: planTaxDeductionPercent,
        benefits: planBenefits,
        calculatorConfig: planCalculatorConfig,
        isActive: planIsActive,
      });
    } else {
      // For new plan, initial values are the defaults
      setInitialValues({
        code: '',
        name: '',
        description: '',
        minIncome: '',
        minAssets: '',
        minAge: '',
        requiredAssetTypes: [],
        requiresCharitableIntent: true,
        taxDeductionPercent: '',
        benefits: [''],
        calculatorConfig: '',
        isActive: true,
      });
    }
  }, [plan]);

  // Check if form has unsaved changes
  const hasChanges = initialValues ? (
    code !== initialValues.code ||
    name !== initialValues.name ||
    description !== initialValues.description ||
    minIncome !== initialValues.minIncome ||
    minAssets !== initialValues.minAssets ||
    minAge !== initialValues.minAge ||
    JSON.stringify([...requiredAssetTypes].sort()) !== JSON.stringify([...initialValues.requiredAssetTypes].sort()) ||
    requiresCharitableIntent !== initialValues.requiresCharitableIntent ||
    taxDeductionPercent !== initialValues.taxDeductionPercent ||
    JSON.stringify(benefits) !== JSON.stringify(initialValues.benefits) ||
    calculatorConfig !== initialValues.calculatorConfig ||
    isActive !== initialValues.isActive
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

  function addBenefit() {
    setBenefits([...benefits, '']);
  }

  function removeBenefit(index: number) {
    setBenefits(benefits.filter((_, i) => i !== index));
  }

  function updateBenefit(index: number, value: string) {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
  }

  function toggleAssetType(type: string) {
    if (requiredAssetTypes.includes(type)) {
      setRequiredAssetTypes(requiredAssetTypes.filter(t => t !== type));
    } else {
      setRequiredAssetTypes([...requiredAssetTypes, type]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!plan && !code.trim()) {
      errors.code = 'Plan code is required';
    }
    if (!name.trim()) {
      errors.name = 'Plan name is required';
    }
    if (!taxDeductionPercent.trim()) {
      errors.taxDeductionPercent = 'Tax deduction percent is required';
    } else {
      const taxPercent = parseFloat(taxDeductionPercent);
      if (isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
        errors.taxDeductionPercent = 'Tax deduction percent must be a number between 0 and 100';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Parse calculator config
      let parsedCalculatorConfig: Record<string, any> = {};
      if (calculatorConfig.trim()) {
        try {
          parsedCalculatorConfig = JSON.parse(calculatorConfig);
        } catch (err) {
          setFieldErrors({ calculatorConfig: 'Invalid JSON in calculator config' });
          setLoading(false);
          return;
        }
      }

      // Filter out empty benefits
      const filteredBenefits = benefits.filter(b => b.trim() !== '');

      if (plan) {
        // Update existing plan
        const input: UpdatePlanInput = {
          name,
          description: description || undefined,
          min_income: minIncome ? parseFloat(minIncome) : undefined,
          min_assets: minAssets ? parseFloat(minAssets) : undefined,
          min_age: minAge ? parseFloat(minAge) : undefined,
          required_asset_types: requiredAssetTypes.length > 0 ? requiredAssetTypes : undefined,
          requires_charitable_intent: requiresCharitableIntent,
          tax_deduction_percent: parseFloat(taxDeductionPercent),
          benefits: filteredBenefits.length > 0 ? filteredBenefits : undefined,
          calculator_config: Object.keys(parsedCalculatorConfig).length > 0 ? parsedCalculatorConfig : undefined,
          is_active: isActive,
        };
        await updatePlan(plan.id, input);
      } else {
        // Create new plan
        const input: CreatePlanInput = {
          code: code.trim(),
          name,
          description: description || undefined,
          min_income: minIncome ? parseFloat(minIncome) : undefined,
          min_assets: minAssets ? parseFloat(minAssets) : undefined,
          min_age: minAge ? parseFloat(minAge) : undefined,
          required_asset_types: requiredAssetTypes.length > 0 ? requiredAssetTypes : undefined,
          requires_charitable_intent: requiresCharitableIntent,
          tax_deduction_percent: parseFloat(taxDeductionPercent),
          benefits: filteredBenefits.length > 0 ? filteredBenefits : undefined,
          calculator_config: Object.keys(parsedCalculatorConfig).length > 0 ? parsedCalculatorConfig : undefined,
          is_active: isActive,
        };
        await createPlan(input);
      }
      // Reset initial values after successful save
      setInitialValues({
        code,
        name,
        description: description || '',
        minIncome,
        minAssets,
        minAge,
        requiredAssetTypes,
        requiresCharitableIntent,
        taxDeductionPercent,
        benefits: filteredBenefits.length > 0 ? filteredBenefits : [''],
        calculatorConfig,
        isActive,
      });
      onSuccess();
    } catch (err) {
      console.error('[PlanForm] Error saving plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to save plan');
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Plan Code *
            </label>
            <input
              id="code"
              type="text"
              required={!plan}
              disabled={!!plan}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (fieldErrors.code) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.code;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                fieldErrors.code ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)]'
              }`}
              placeholder="e.g., defund, diversion, divest"
            />
            {fieldErrors.code && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.code}</p>
            )}
            {plan && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Code cannot be changed after creation</p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Plan Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent ${
                fieldErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)]'
              }`}
              placeholder="e.g., Donum Defund"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="Brief description of the plan"
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Requirements</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="minIncome" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Minimum Income
            </label>
            <input
              id="minIncome"
              type="number"
              step="0.01"
              value={minIncome}
              onChange={(e) => setMinIncome(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              placeholder="e.g., 200000"
            />
          </div>

          <div>
            <label htmlFor="minAssets" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Minimum Assets
            </label>
            <input
              id="minAssets"
              type="number"
              step="0.01"
              value={minAssets}
              onChange={(e) => setMinAssets(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              placeholder="e.g., 500000"
            />
          </div>

          <div>
            <label htmlFor="minAge" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Minimum Age
            </label>
            <input
              id="minAge"
              type="number"
              step="0.1"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              placeholder="e.g., 59.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Required Asset Types
          </label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleAssetType(type)}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  requiredAssetTypes.includes(type)
                    ? 'bg-[var(--core-blue)] text-white border-[var(--core-blue)]'
                    : 'bg-[var(--background)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {requiredAssetTypes.length > 0 && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Selected: {requiredAssetTypes.join(', ')}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={requiresCharitableIntent}
            onChange={(e) => setRequiresCharitableIntent(e.target.checked)}
            className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] focus:ring-[var(--core-blue)]"
          />
          <span className="text-sm text-[var(--text-primary)]">Requires charitable intent</span>
        </label>
      </div>

      {/* Tax Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tax Information</h3>
        
        <div>
          <label htmlFor="taxDeductionPercent" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Tax Deduction Percent *
          </label>
          <input
            id="taxDeductionPercent"
            type="number"
            step="0.01"
            required
            value={taxDeductionPercent}
            onChange={(e) => setTaxDeductionPercent(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
            placeholder="e.g., 60.00 or 100.00"
          />
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Benefits</h3>
          <button
            type="button"
            onClick={addBenefit}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
          >
            <Plus className="w-4 h-4" />
            Add Benefit
          </button>
        </div>
        
        {benefits.map((benefit, index) => (
          <div key={index} className="flex gap-2">
            <label htmlFor={`benefit-${index}`} className="sr-only">
              Benefit {index + 1}
            </label>
            <input
              id={`benefit-${index}`}
              type="text"
              value={benefit}
              onChange={(e) => updateBenefit(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent"
              placeholder="Enter a benefit description"
            />
            {benefits.length > 1 && (
              <button
                type="button"
                onClick={() => removeBenefit(index)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Calculator Config */}
      <div className="space-y-4">
        <label htmlFor="calculatorConfig" className="block text-lg font-semibold text-[var(--text-primary)]">
          Calculator Configuration (JSON)
        </label>
        <textarea
          id="calculatorConfig"
          value={calculatorConfig}
          onChange={(e) => {
            setCalculatorConfig(e.target.value);
            if (fieldErrors.calculatorConfig) {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.calculatorConfig;
                return newErrors;
              });
            }
          }}
          rows={8}
          className={`w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent ${
            fieldErrors.calculatorConfig ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)]'
          }`}
          placeholder='{"formula": "...", "variables": {...}}'
        />
        {fieldErrors.calculatorConfig && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.calculatorConfig}</p>
        )}
        {!fieldErrors.calculatorConfig && (
          <p className="text-xs text-[var(--text-secondary)]">
            Enter valid JSON for calculator configuration. Leave empty if not needed.
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-[var(--core-blue)] border-[var(--border)] focus:ring-[var(--core-blue)]"
          />
          <span className="text-sm text-[var(--text-primary)]">Plan is active</span>
        </label>
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
