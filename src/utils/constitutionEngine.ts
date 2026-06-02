/**
 * constitutionEngine.ts — Exchange Constitution Utilities
 * =========================================================
 * Confidence system, display wording, update monitoring, and review queue.
 *
 * All functions are pure build-time utilities — no side effects, no DOM access.
 *
 * Usage:
 *   import { getConfidenceLabel, getDisplayWording, buildReviewQueue } from '../utils/constitutionEngine';
 */

import {
  EXCHANGE_CONSTITUTIONS,
  getConstitution,
  getGeoRule,
  type ExchangeConstitution,
  type ExchangeGeoRule,
  type ExchangeUpdateSchedule,
  type UpdateScheduleItem,
  type RegistrationStatus,
} from '../data/exchange-constitution';
import { REGION_MAP } from '../data/geo-overrides';

// ── Confidence thresholds ─────────────────────────────────────────────────────

export const CONFIDENCE = {
  CONFIRMED:    0.95,  // ≥ 0.95 → confident public claim
  LIKELY:       0.80,  // 0.80–0.94 → hedged claim
  UNCERTAIN:    0.60,  // 0.60–0.79 → uncertain
  NEEDS_REVIEW: 0.00,  // < 0.60 → do not display; generic disclaimer only
} as const;

export type ConfidenceLabel = 'confirmed' | 'likely' | 'uncertain' | 'needs-review';

/**
 * Returns a human-readable confidence label for a 0.0–1.0 score.
 */
export function getConfidenceLabel(score: number): ConfidenceLabel {
  if (score >= CONFIDENCE.CONFIRMED)    return 'confirmed';
  if (score >= CONFIDENCE.LIKELY)       return 'likely';
  if (score >= CONFIDENCE.UNCERTAIN)    return 'uncertain';
  return 'needs-review';
}

/**
 * Returns true when manual review is required based on confidence.
 */
export function requiresManualReview(score: number): boolean {
  return score < CONFIDENCE.UNCERTAIN;
}

/**
 * Returns a safety level for constructing public claims.
 * 'safe' → display as-is
 * 'hedged' → add qualifier ("likely", "may be available")
 * 'cautious' → show generic disclaimer only
 * 'suppress' → do not display any availability claim
 */
export type ClaimSafetyLevel = 'safe' | 'hedged' | 'cautious' | 'suppress';

export function getPublicClaimSafetyLevel(score: number): ClaimSafetyLevel {
  if (score >= CONFIDENCE.CONFIRMED) return 'safe';
  if (score >= CONFIDENCE.LIKELY)    return 'hedged';
  if (score >= CONFIDENCE.UNCERTAIN) return 'cautious';
  return 'suppress';
}

// ── Display wording ───────────────────────────────────────────────────────────

export interface DisplayWording {
  availabilityText: string;
  ctaText: string;
  disclaimerText: string;
  safetyLevel: ClaimSafetyLevel;
  confidenceLabel: ConfidenceLabel;
}

/**
 * Returns geo-scoped, confidence-appropriate display wording.
 * Never outputs global claims. Always scopes to the specific geo.
 */
export function getDisplayWordingByConfidence(
  exchangeName: string,
  geoLabel: string,        // Human-readable geo name e.g. "Turkey" or "EEA"
  status: RegistrationStatus,
  confidenceScore: number,
): DisplayWording {
  const safety = getPublicClaimSafetyLevel(confidenceScore);
  const label  = getConfidenceLabel(confidenceScore);

  if (status === 'unavailable') {
    return {
      availabilityText: `${exchangeName} is not currently available in ${geoLabel}.`,
      ctaText: 'Not Available',
      disclaimerText: `${exchangeName} does not currently accept registrations from ${geoLabel}. Check the exchange website for any changes to this policy.`,
      safetyLevel: 'safe',
      confidenceLabel: label,
    };
  }

  if (status === 'needs-review') {
    return {
      availabilityText: `${exchangeName} availability in ${geoLabel} is unverified.`,
      ctaText: 'Check Availability',
      disclaimerText: `We have not been able to confirm whether ${exchangeName} is available in ${geoLabel}. Check the exchange website directly before registering.`,
      safetyLevel: 'suppress',
      confidenceLabel: label,
    };
  }

  switch (safety) {
    case 'safe':
      return {
        availabilityText: `${exchangeName} is available in ${geoLabel}.`,
        ctaText: `Open ${exchangeName}`,
        disclaimerText: 'Availability and bonus conditions may vary. Always verify current terms on the exchange website.',
        safetyLevel: 'safe',
        confidenceLabel: label,
      };

    case 'hedged':
      return {
        availabilityText: `${exchangeName} is likely available in ${geoLabel}, but verify on the official website.`,
        ctaText: `View ${exchangeName} Offer`,
        disclaimerText: `${exchangeName} appears to be available in ${geoLabel} based on available information. Verify current availability and terms directly on the exchange website before registering.`,
        safetyLevel: 'hedged',
        confidenceLabel: label,
      };

    case 'cautious':
      return {
        availabilityText: `${exchangeName} availability in ${geoLabel} may vary. Check directly.`,
        ctaText: `View ${exchangeName}`,
        disclaimerText: `Availability of ${exchangeName} in ${geoLabel} has not been fully verified. Check the exchange website directly for current availability, terms and conditions.`,
        safetyLevel: 'cautious',
        confidenceLabel: label,
      };

    default: // suppress
      return {
        availabilityText: '',
        ctaText: `View ${exchangeName}`,
        disclaimerText: 'Exchange availability, bonus campaigns and regulatory requirements may vary by country. Always verify current conditions on the exchange website.',
        safetyLevel: 'suppress',
        confidenceLabel: label,
      };
  }
}

// ── Geo rule resolver (wraps constitution + geo-overrides fallback) ────────────

/**
 * Resolve the best GEO rule for an exchange + country code.
 * Fallback: country → region → global
 */
export function resolveGeoRule(
  exchangeSlug: string,
  countryCode: string,
): { rule: ExchangeGeoRule | null; source: 'country' | 'region' | 'global' | 'none' } {
  const c = getConstitution(exchangeSlug);
  if (!c) return { rule: null, source: 'none' };

  const cc = countryCode.toLowerCase();

  // 1. Exact country
  const countryRule = c.geoRules.find(r => r.geoType === 'country' && r.geoKey === cc);
  if (countryRule) return { rule: countryRule, source: 'country' };

  // 2. Region
  const region = REGION_MAP[cc];
  if (region) {
    const regionRule = c.geoRules.find(r => r.geoType === 'region' && r.geoKey === region);
    if (regionRule) return { rule: regionRule, source: 'region' };
  }

  // 3. Global
  const globalRule = c.geoRules.find(r => r.geoKey === 'global');
  if (globalRule) return { rule: globalRule, source: 'global' };

  return { rule: null, source: 'none' };
}

/**
 * Get safe public wording for an exchange + country, driven entirely
 * by the constitution. This is the single source of truth for what
 * the site should say about exchange availability.
 */
export function getConstitutionDisplayWording(
  exchangeSlug: string,
  exchangeName: string,
  countryCode: string,
  countryLabel: string,
): DisplayWording {
  const { rule } = resolveGeoRule(exchangeSlug, countryCode);

  if (!rule) {
    return {
      availabilityText: '',
      ctaText: `View ${exchangeName}`,
      disclaimerText: 'Exchange availability may vary by country. Verify current conditions on the exchange website.',
      safetyLevel: 'suppress',
      confidenceLabel: 'needs-review',
    };
  }

  return getDisplayWordingByConfidence(
    exchangeName,
    countryLabel,
    rule.availabilityStatus,
    rule.confidenceScore,
  );
}

// ── Compare page: GEO warning ────────────────────────────────────────────────

export interface CompareGeoWarning {
  exchangeSlug: string;
  exchangeName: string;
  severity: 'none' | 'warning' | 'critical';
  message: string;
}

/**
 * For compare pages: check if either exchange has a restriction for the
 * visitor's geo that should be surfaced as a warning.
 */
export function getComparePageGeoWarnings(
  slugA: string,
  nameA: string,
  slugB: string,
  nameB: string,
  countryCode: string,
  countryLabel: string,
): CompareGeoWarning[] {
  const warnings: CompareGeoWarning[] = [];

  for (const [slug, name] of [[slugA, nameA], [slugB, nameB]] as [string, string][]) {
    const { rule } = resolveGeoRule(slug, countryCode);
    if (!rule) continue;

    if (rule.availabilityStatus === 'unavailable') {
      warnings.push({
        exchangeSlug: slug,
        exchangeName: name,
        severity: 'critical',
        message: `${name} is not available in ${countryLabel}. This comparison may not be relevant for your region.`,
      });
    } else if (rule.availabilityStatus === 'restricted' || rule.availabilityStatus === 'needs-review') {
      warnings.push({
        exchangeSlug: slug,
        exchangeName: name,
        severity: 'warning',
        message: `${name} availability in ${countryLabel} is limited or unverified. Verify directly on the exchange website.`,
      });
    }
  }

  return warnings;
}

// ── Update monitoring ─────────────────────────────────────────────────────────

const UPDATE_FREQUENCY_DAYS: Record<string, number> = {
  daily:     1,
  weekly:    7,
  monthly:   30,
  quarterly: 90,
  'on-change': 0,
};

/**
 * Get the next review due date for a schedule item.
 */
export function getNextReviewDate(
  item: UpdateScheduleItem,
  today: string = new Date().toISOString().slice(0, 10),
): string {
  if (!item.lastChecked) return today; // Overdue immediately
  const days = UPDATE_FREQUENCY_DAYS[item.frequency] ?? 30;
  const last = new Date(item.lastChecked);
  last.setDate(last.getDate() + days);
  return last.toISOString().slice(0, 10);
}

/**
 * Returns schedule items that are overdue as of today.
 */
export function getOverdueConstitutionItems(
  schedule: ExchangeUpdateSchedule,
  today: string = new Date().toISOString().slice(0, 10),
): (UpdateScheduleItem & { nextDue: string; daysOverdue: number })[] {
  return schedule.items
    .map(item => {
      const nextDue = item.nextDue ?? getNextReviewDate(item, today);
      const daysOverdue = Math.floor((new Date(today).getTime() - new Date(nextDue).getTime()) / 86400000);
      return { ...item, nextDue, daysOverdue };
    })
    .filter(item => item.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface ReviewQueueItem {
  exchangeSlug: string;
  field: string;
  frequency: string;
  priority: string;
  lastChecked?: string;
  nextDue: string;
  daysOverdue: number;
  notes?: string;
  manualReviewRequired: boolean;
}

/**
 * Build a unified review queue across all constitutions.
 * Returns all overdue items sorted by priority and overdue days.
 */
export function buildConstitutionReviewQueue(
  today: string = new Date().toISOString().slice(0, 10),
): ReviewQueueItem[] {
  const queue: ReviewQueueItem[] = [];
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  for (const constitution of EXCHANGE_CONSTITUTIONS) {
    // Add update schedule items
    for (const item of constitution.updateSchedule.items) {
      const nextDue = getNextReviewDate(item, today);
      const daysOverdue = Math.floor((new Date(today).getTime() - new Date(nextDue).getTime()) / 86400000);
      if (daysOverdue > 0) {
        queue.push({
          exchangeSlug: constitution.exchangeSlug,
          field: item.field,
          frequency: item.frequency,
          priority: item.priority,
          lastChecked: item.lastChecked,
          nextDue,
          daysOverdue,
          notes: item.notes,
          manualReviewRequired: false,
        });
      }
    }

    // Add geo rules that need manual review
    for (const rule of constitution.geoRules) {
      if (rule.manualReviewRequired) {
        const daysSinceCheck = Math.floor((new Date(today).getTime() - new Date(rule.lastChecked).getTime()) / 86400000);
        if (daysSinceCheck > 7) { // Flag geo rules not reviewed in 7+ days
          queue.push({
            exchangeSlug: constitution.exchangeSlug,
            field: `geo.${rule.geoKey}.availabilityStatus`,
            frequency: 'weekly',
            priority: rule.confidenceScore < 0.6 ? 'critical' : 'high',
            lastChecked: rule.lastChecked,
            nextDue: rule.lastChecked,
            daysOverdue: daysSinceCheck,
            notes: `Needs manual review: confidence ${(rule.confidenceScore * 100).toFixed(0)}%`,
            manualReviewRequired: true,
          });
        }
      }
    }
  }

  return queue.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.daysOverdue - a.daysOverdue;
  });
}

// ── Risky claims audit ────────────────────────────────────────────────────────

export interface RiskyClaim {
  exchangeSlug: string;
  geoKey: string;
  field: string;
  value: string | boolean;
  confidenceScore: number;
  risk: 'high' | 'medium';
  reason: string;
}

/**
 * Audit all constitutions for risky/uncertain public claims.
 * Returns items that should be reviewed before being displayed publicly.
 */
export function auditRiskyClaims(): RiskyClaim[] {
  const risky: RiskyClaim[] = [];

  for (const c of EXCHANGE_CONSTITUTIONS) {
    for (const rule of c.geoRules) {
      // Low confidence availability claims
      if (rule.confidenceScore < CONFIDENCE.UNCERTAIN) {
        risky.push({
          exchangeSlug: c.exchangeSlug,
          geoKey: rule.geoKey,
          field: 'availabilityStatus',
          value: rule.availabilityStatus,
          confidenceScore: rule.confidenceScore,
          risk: 'high',
          reason: `Confidence ${(rule.confidenceScore * 100).toFixed(0)}% is below the safe display threshold`,
        });
      } else if (rule.confidenceScore < CONFIDENCE.LIKELY) {
        risky.push({
          exchangeSlug: c.exchangeSlug,
          geoKey: rule.geoKey,
          field: 'availabilityStatus',
          value: rule.availabilityStatus,
          confidenceScore: rule.confidenceScore,
          risk: 'medium',
          reason: `Confidence ${(rule.confidenceScore * 100).toFixed(0)}% — hedged display only`,
        });
      }

      // Available status with manual review required
      if (rule.manualReviewRequired && rule.availabilityStatus === 'allowed') {
        risky.push({
          exchangeSlug: c.exchangeSlug,
          geoKey: rule.geoKey,
          field: 'registrationAllowed',
          value: true,
          confidenceScore: rule.confidenceScore,
          risk: 'medium',
          reason: 'Marked available but manualReviewRequired = true',
        });
      }
    }

    // Check for active conflicts
    for (const conflict of c.conflicts) {
      risky.push({
        exchangeSlug: c.exchangeSlug,
        geoKey: 'global',
        field: conflict.fieldName,
        value: `Conflict: ${conflict.valueA} vs ${conflict.valueB}`,
        confidenceScore: 0,
        risk: 'high',
        reason: `Source conflict between ${conflict.sourceA} and ${conflict.sourceB}`,
      });
    }
  }

  return risky.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
    return a.confidenceScore - b.confidenceScore;
  });
}

// ── Constitution summary ──────────────────────────────────────────────────────

export interface ConstitutionSummary {
  exchangeSlug: string;
  constitutionConfidence: number;
  geoRuleCount: number;
  manualReviewRequired: boolean;
  flags: string[];
  overdueCritical: number;
  overdueHigh: number;
  conflictCount: number;
  lastFullReview: string;
}

export function buildConstitutionSummary(today?: string): ConstitutionSummary[] {
  const queue = buildConstitutionReviewQueue(today);
  return EXCHANGE_CONSTITUTIONS.map(c => {
    const myQueue = queue.filter(q => q.exchangeSlug === c.exchangeSlug);
    return {
      exchangeSlug: c.exchangeSlug,
      constitutionConfidence: c.constitutionConfidence,
      geoRuleCount: c.geoRules.length,
      manualReviewRequired: c.manualReviewRequired,
      flags: c.flags,
      overdueCritical: myQueue.filter(q => q.priority === 'critical').length,
      overdueHigh: myQueue.filter(q => q.priority === 'high').length,
      conflictCount: c.conflicts.length,
      lastFullReview: c.lastFullReview,
    };
  });
}
