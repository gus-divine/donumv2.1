/**
 * Qualification Logic for Donum Plans
 * Evaluates client information against qualification criteria
 * Fetches plans from database and evaluates against them
 * Based on Donum 2.0 qualification logic
 */

import { getAllPlans, type DonumPlan } from '@/lib/api/plans';

// Legacy type for backward compatibility (plan codes)
export type DonumPlanCode = 'defund' | 'diversion' | 'divest';

export interface QualificationCriteria {
  minIncome: number;
  minAssets: number;
  minAge: number;
  requiresCharitableIntent: boolean;
}

export interface CollectedInfo {
  name?: string;
  annualIncome?: number;
  totalAssets?: number;
  netWorth?: number; // Alias for totalAssets
  age?: number;
  charitableIntent?: boolean;
  assetTypes?: string[]; // e.g., ['IRA', 'business', 'property', 'investments']
}

export interface QualificationResult {
  qualified: boolean;
  qualifiedPlans: DonumPlan[]; // Now uses database plan objects
  reasons: string[];
  missingInfo: string[];
}

/**
 * Default qualification criteria (research-based)
 */
const DEFAULT_CRITERIA: QualificationCriteria = {
  minIncome: 200000, // $200K+ annual income
  minAssets: 500000,  // $500K+ total assets
  minAge: 18,
  requiresCharitableIntent: true
};

/**
 * Plan-specific criteria
 */
const PLAN_CRITERIA: Record<DonumPlanCode, Partial<QualificationCriteria>> = {
  defund: {
    minIncome: 200000, // High income earners
    requiresCharitableIntent: true
  },
  diversion: {
    minAssets: 500000, // IRA rollover - need substantial assets
    minAge: 59.5, // IRA withdrawal age
    requiresCharitableIntent: true
  },
  divest: {
    minAssets: 500000, // Capital gains - need substantial assets
    requiresCharitableIntent: true
  }
};

/**
 * Evaluate qualification based on collected information against database plans
 * @param info - Collected client information
 * @param plans - Active plans from database (optional, will fetch if not provided)
 * @returns Qualification result with suggested plans
 */
export async function evaluateQualification(
  info: CollectedInfo,
  plans?: DonumPlan[]
): Promise<QualificationResult> {
  const result: QualificationResult = {
    qualified: false,
    qualifiedPlans: [],
    reasons: [],
    missingInfo: []
  };

  // Fetch plans from database if not provided
  if (!plans) {
    try {
      plans = await getAllPlans(false); // Only active plans
    } catch (error) {
      console.error('Error fetching plans:', error);
      result.reasons.push('Unable to load plan information. Please try again.');
      return result;
    }
  }

  // Use netWorth if totalAssets is not provided
  const assets = info.totalAssets ?? info.netWorth;

  // Check for missing required information
  if (!info.name) {
    result.missingInfo.push('Name');
  }
  if (info.annualIncome === undefined) {
    result.missingInfo.push('Annual Income');
  }
  if (assets === undefined) {
    result.missingInfo.push('Total Assets');
  }
  if (info.age === undefined) {
    result.missingInfo.push('Age');
  }
  if (info.charitableIntent === undefined) {
    result.missingInfo.push('Charitable Intent');
  }

  // If missing critical info, can't qualify yet
  if (result.missingInfo.length > 0) {
    return result;
  }

  // Evaluate each active plan from database
  for (const plan of plans) {
    if (!plan.is_active) continue; // Skip inactive plans

    let planQualified = true;
    const planReasons: string[] = [];

    // Check income requirement
    if (plan.min_income !== null && info.annualIncome !== undefined) {
      if (info.annualIncome < plan.min_income) {
        planQualified = false;
        planReasons.push(`Income below minimum of $${plan.min_income.toLocaleString()}`);
      }
    }

    // Check assets requirement
    if (plan.min_assets !== null && assets !== undefined) {
      if (assets < plan.min_assets) {
        planQualified = false;
        planReasons.push(`Assets below minimum of $${plan.min_assets.toLocaleString()}`);
      }
    }

    // Check age requirement
    if (plan.min_age !== null && info.age !== undefined) {
      if (info.age < plan.min_age) {
        planQualified = false;
        planReasons.push(`Age below minimum of ${plan.min_age}`);
      }
    }

    // Check charitable intent
    if (plan.requires_charitable_intent && !info.charitableIntent) {
      planQualified = false;
      planReasons.push('Charitable intent required');
    }

    // Check required asset types
    if (plan.required_asset_types && plan.required_asset_types.length > 0) {
      if (!info.assetTypes || 
          !plan.required_asset_types.some(type => info.assetTypes?.includes(type))) {
        planQualified = false;
        planReasons.push(`Required asset types: ${plan.required_asset_types.join(', ')}`);
      }
    }

    if (planQualified) {
      result.qualifiedPlans.push(plan);
      result.reasons.push(`Qualified for ${plan.name}`);
    } else {
      result.reasons.push(`${plan.name}: ${planReasons.join(', ')}`);
    }
  }

  // Overall qualification
  result.qualified = result.qualifiedPlans.length > 0;

  return result;
}

/**
 * Get plan display name (from database plan object)
 */
export function getPlanDisplayName(plan: DonumPlan): string {
  return plan.name;
}

/**
 * Get plan description (from database plan object)
 */
export function getPlanDescription(plan: DonumPlan): string {
  return plan.description || '';
}

/**
 * Get detailed plan benefits (from database plan object)
 */
export function getPlanBenefits(plan: DonumPlan): string[] {
  return plan.benefits || [];
}

/**
 * Calculate suggested loan amount range based on financial profile and plan
 */
/**
 * Check if prospect has $500K+ annual donation capacity
 */
export function hasDonationCapacity(
  plan: DonumPlan | DonumPlanCode,
  annualIncome?: number,
  netWorth?: number
): boolean {
  // Handle both database plan objects and legacy plan codes
  const planCode = typeof plan === 'string' ? plan : plan.code;
  const minDonationCapacity = 500000;

  if (planCode === 'defund') {
    // Defund: Need $500K+ annual income OR income + asset-based income
    // Estimate asset-based income as 4% of net worth (conservative)
    const assetIncome = netWorth ? netWorth * 0.04 : 0;
    const totalAnnualCapacity = (annualIncome || 0) + assetIncome;
    return totalAnnualCapacity >= minDonationCapacity;
  } else if (plan === 'diversion') {
    // Diversion: Need IRA assets that can generate $500K+ in distributions
    // Assume IRA is 40% of net worth, and can withdraw 5-10% annually
    if (!netWorth) return false;
    const iraEstimate = netWorth * 0.4;
    const annualDistributionCapacity = iraEstimate * 0.05; // Conservative 5% withdrawal
    return annualDistributionCapacity >= minDonationCapacity;
  } else if (plan === 'divest') {
    // Divest: One-time donation from asset sale proceeds
    // Need assets worth enough that selling them generates $500K+ to donate
    if (!netWorth) return false;
    const divestableAssets = netWorth * 0.3; // Estimate 30% divestable
    return divestableAssets >= minDonationCapacity;
  }

  return false;
}

export function calculateSuggestedLoanAmount(
  plan: DonumPlan | DonumPlanCode,
  annualIncome?: number,
  netWorth?: number
): { min: number; max: number; suggested: number; hasCapacity: boolean } {
  // Handle both database plan objects and legacy plan codes
  const planCode = typeof plan === 'string' ? plan : plan.code;
  // Base requirement: Must have $500K+ annual donation capacity
  const minDonationCapacity = 500000;
  const hasCapacity = hasDonationCapacity(plan, annualIncome, netWorth);
  
  // If they don't meet donation capacity, return zeros
  if (!hasCapacity) {
    return { min: 0, max: 0, suggested: 0, hasCapacity: false };
  }
  
  // Calculate based on plan type
  let min = 0;
  let max = 0;
  let suggested = 0;

  if (planCode === 'defund') {
    // Defund: Based on income tax liability (typically 20-40% of income)
    // Loan amount typically 1-3x annual income for high earners
    if (annualIncome && annualIncome >= minDonationCapacity) {
      const taxLiability = annualIncome * 0.3; // Estimate 30% tax rate
      min = minDonationCapacity;
      max = Math.round(annualIncome * 2);
      suggested = Math.round(taxLiability * 1.5);
    } else if (netWorth) {
      // If income < $500K but has assets, estimate from asset-based income
      const assetIncome = netWorth * 0.04; // 4% return
      const totalCapacity = (annualIncome || 0) + assetIncome;
      if (totalCapacity >= minDonationCapacity) {
        min = minDonationCapacity;
        max = Math.round(totalCapacity * 2);
        suggested = Math.round(totalCapacity * 0.8);
      }
    }
  } else if (planCode === 'diversion') {
    // Diversion: Based on IRA assets (typically 10-30% of IRA value)
    if (netWorth) {
      const iraEstimate = netWorth * 0.4; // Estimate 40% in IRA
      const annualDistributionCapacity = iraEstimate * 0.05; // 5% annual withdrawal
      if (annualDistributionCapacity >= minDonationCapacity) {
        min = minDonationCapacity;
        max = Math.round(iraEstimate * 0.3); // Up to 30% of IRA
        suggested = Math.round(iraEstimate * 0.2); // 20% of IRA
      }
    }
  } else if (planCode === 'divest') {
    // Divest: Based on asset value being divested (typically 20-50% of asset value)
    if (netWorth) {
      const divestableAssets = netWorth * 0.3; // Estimate 30% divestable
      if (divestableAssets >= minDonationCapacity) {
        min = minDonationCapacity;
        max = Math.round(divestableAssets * 0.5); // Up to 50% of divestable assets
        suggested = Math.round(divestableAssets * 0.35); // 35% of divestable assets
      }
    }
  }

  // Ensure minimum is at least $500K if we have capacity
  if (hasCapacity) {
    min = Math.max(min, minDonationCapacity);
    suggested = Math.max(suggested, minDonationCapacity);
  }

  return { min, max, suggested, hasCapacity };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
