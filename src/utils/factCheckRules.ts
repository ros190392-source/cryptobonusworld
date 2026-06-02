/**
 * CryptoBonusWorld — Fact-Check Validation Rules
 *
 * Per-field validation rules for verifiable claims.
 * Used to flag suspicious values, impossible ranges, and
 * required cross-field consistency checks.
 *
 * These rules do NOT make external requests — they operate on
 * the stored evidence data only.
 */

import type { EvidenceFact, ExchangeEvidence } from '../data/evidence/_schema';
import { getFact } from './evidenceEngine';

// ── Validation types ──────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  field: string;
  severity: ValidationSeverity;
  message: string;
  ruleId: string;
}

// ── Range constraints per field ───────────────────────────────────────────────

const FIELD_RANGES: Partial<Record<string, { min?: number; max?: number; unit?: string }>> = {
  bonus_amount:             { min: 0, max: 100000, unit: 'USDT' },
  bonus_expiry_days:        { min: 1, max: 365 },
  bonus_min_deposit:        { min: 0, max: 10000 },
  spot_maker_fee:           { min: 0, max: 2, unit: '%' },
  spot_taker_fee:           { min: 0, max: 2, unit: '%' },
  futures_maker_fee:        { min: -0.1, max: 1, unit: '%' },
  futures_taker_fee:        { min: 0, max: 1, unit: '%' },
  max_futures_leverage:     { min: 1, max: 500, unit: 'x' },
  no_kyc_withdrawal_limit:  { min: 0, max: 1000000 },
  trading_pairs_count:      { min: 1, max: 10000 },
  kyc_levels_count:         { min: 1, max: 5 },
};

/**
 * Validate a single EvidenceFact against its field-specific rules.
 */
export function validateFact(fact: EvidenceFact, ev: ExchangeEvidence): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { field, currentValue } = fact;

  // ── Range check ───────────────────────────────────────────────────────────
  const range = FIELD_RANGES[field];
  if (range && typeof currentValue === 'number') {
    if (range.min !== undefined && currentValue < range.min) {
      results.push({
        field,
        severity: 'error',
        message: `Value ${currentValue} is below minimum ${range.min}${range.unit ? ' ' + range.unit : ''}`,
        ruleId: 'range.below-min',
      });
    }
    if (range.max !== undefined && currentValue > range.max) {
      results.push({
        field,
        severity: 'error',
        message: `Value ${currentValue} exceeds maximum ${range.max}${range.unit ? ' ' + range.unit : ''}`,
        ruleId: 'range.above-max',
      });
    }
  }

  // ── Missing official source ───────────────────────────────────────────────
  if (!fact.officialSourceKey && !fact.officialSourceUrl && fact.confidenceScore > 0.5) {
    results.push({
      field,
      severity: 'warning',
      message: 'Confidence > 0.5 but no official source URL or key provided',
      ruleId: 'source.missing-for-high-confidence',
    });
  }

  // ── Consistency: bonus_requires_kyc vs kyc_required ──────────────────────
  if (field === 'bonus_requires_kyc') {
    const kycFact = getFact(ev, 'kyc_required');
    if (kycFact && currentValue === false && kycFact.currentValue === true) {
      // bonus says no KYC but exchange requires KYC — suspicious
      results.push({
        field,
        severity: 'warning',
        message: 'bonus_requires_kyc=false but kyc_required=true — verify bonus can be claimed without KYC',
        ruleId: 'consistency.bonus-kyc-mismatch',
      });
    }
  }

  // ── Consistency: maker fee should not exceed taker fee ───────────────────
  if (field === 'spot_maker_fee') {
    const takerFact = getFact(ev, 'spot_taker_fee');
    if (takerFact && typeof currentValue === 'number' && typeof takerFact.currentValue === 'number') {
      if (currentValue > takerFact.currentValue) {
        results.push({
          field,
          severity: 'warning',
          message: `spot_maker_fee (${currentValue}%) > spot_taker_fee (${takerFact.currentValue}%) — unusual, verify`,
          ruleId: 'consistency.maker-exceeds-taker',
        });
      }
    }
  }

  // ── p2p_available: no source is a red flag ───────────────────────────────
  if (field === 'p2p_available' && currentValue === true) {
    if (!fact.officialSourceKey && !fact.officialSourceUrl) {
      results.push({
        field,
        severity: 'warning',
        message: 'p2p_available=true but no official source URL — add p2p source key',
        ruleId: 'source.p2p-needs-url',
      });
    }
  }

  // ── proof_of_reserves: should link to actual PoR page ────────────────────
  if (field === 'proof_of_reserves' && currentValue === true) {
    if (!fact.officialSourceKey && !fact.officialSourceUrl) {
      results.push({
        field,
        severity: 'error',
        message: 'proof_of_reserves=true but no source URL — must link to official PoR page',
        ruleId: 'source.por-needs-url',
      });
    }
  }

  return results;
}

/**
 * Validate all facts in an exchange evidence file.
 */
export function validateExchangeEvidence(ev: ExchangeEvidence): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const fact of ev.facts) {
    results.push(...validateFact(fact, ev));
  }

  // ── Cross-fact checks ─────────────────────────────────────────────────────

  // Bonus amount should be consistent with bonus_currency
  const bonusFact = getFact(ev, 'bonus_amount');
  const currencyFact = getFact(ev, 'bonus_currency');
  if (bonusFact && currencyFact) {
    const amount = bonusFact.currentValue as number;
    const currency = currencyFact.currentValue as string;
    if (currency === 'USD' && amount > 10000) {
      results.push({
        field: 'bonus_amount',
        severity: 'warning',
        message: `Large bonus (${amount} USD) — verify this is not a USDT amount mislabelled as USD`,
        ruleId: 'consistency.large-usd-bonus',
      });
    }
  }

  return results;
}

/**
 * Check if an exchange evidence file has all critical fields populated.
 */
export function getMissingCriticalFields(ev: ExchangeEvidence): string[] {
  const CRITICAL = [
    'bonus_amount',
    'kyc_required',
    'spot_maker_fee',
    'spot_taker_fee',
    'p2p_available',
    'restricted_us',
  ] as const;

  const presentFields = new Set(ev.facts.map(f => f.field));
  return CRITICAL.filter(f => !presentFields.has(f));
}

/**
 * Get a human-readable summary of validation results.
 */
export function formatValidationSummary(results: ValidationResult[]): string {
  const errors   = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;
  const infos    = results.filter(r => r.severity === 'info').length;

  if (results.length === 0) return '✅ No validation issues';
  return `${errors > 0 ? `❌ ${errors} error(s)` : ''}${warnings > 0 ? ` ⚠️ ${warnings} warning(s)` : ''}${infos > 0 ? ` ℹ️ ${infos} info(s)` : ''}`.trim();
}
