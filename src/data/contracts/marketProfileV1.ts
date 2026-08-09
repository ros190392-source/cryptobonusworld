/**
 * Country Foundation MarketProfile V1 (Issue #272 / remediation #299).
 *
 * The existing portalFactory MarketProfile remains the shared base record. This
 * extension adds the structured country dimensions required for a production
 * Exchange × Country profile without creating a second availability authority.
 * Public country CTA authorization must validate this V1 contract in addition
 * to the canonical base MarketProfile validation.
 */
import {
  validateMarketProfile,
  type Confidence,
  type MarketProfile,
  type ValidationIssue,
  type ValidationResult,
} from './portalFactory';

export const COUNTRY_MARKET_PROFILE_SCHEMA_VERSION = 1 as const;

export type CountryFactState =
  | 'supported'
  | 'limited'
  | 'restricted'
  | 'unavailable'
  | 'under_review'
  | 'unknown';

export type RegulationState =
  | 'licensed'
  | 'registered'
  | 'restricted'
  | 'prohibited'
  | 'under_review'
  | 'unknown';

export type RestrictionFactState = 'clear' | 'restricted' | 'under_review' | 'unknown';

export interface CountryFactDimension {
  state: CountryFactState;
  claimIds: string[];
  limitations: string[];
}

export interface CountryFiatPaymentDimension extends CountryFactDimension {
  /** Normalized human-readable method labels; factual support still comes from claimIds. */
  methods: string[];
}

export interface CountryRegulationDimension {
  state: RegulationState;
  legalEntityClaimIds: string[];
  licenseClaimIds: string[];
  limitations: string[];
}

export interface CountryRestrictionDimension {
  state: RestrictionFactState;
  claimIds: string[];
  limitations: string[];
}

export interface CountryMarketProfileV1 extends MarketProfile {
  schemaVersion: typeof COUNTRY_MARKET_PROFILE_SCHEMA_VERSION;
  confidence: Confidence;
  regulation: CountryRegulationDimension;
  kyc: CountryFactDimension;
  deposits: CountryFactDimension;
  withdrawals: CountryFactDimension;
  fiatPayments: CountryFiatPaymentDimension;
  products: CountryFactDimension;
  bonusAvailability: CountryFactDimension;
  restrictions: CountryRestrictionDimension;
}

export type CountryCommercialReadinessBlock =
  | 'invalid'
  | 'restricted'
  | 'unavailable'
  | 'under_review';

export type CountryCommercialReadiness =
  | { ok: true }
  | { ok: false; block: CountryCommercialReadinessBlock; path: string };

const FACT_STATES: readonly CountryFactState[] = Object.freeze([
  'supported', 'limited', 'restricted', 'unavailable', 'under_review', 'unknown',
]);
const REGULATION_STATES: readonly RegulationState[] = Object.freeze([
  'licensed', 'registered', 'restricted', 'prohibited', 'under_review', 'unknown',
]);
const RESTRICTION_STATES: readonly RestrictionFactState[] = Object.freeze([
  'clear', 'restricted', 'under_review', 'unknown',
]);
const CONFIDENCE_STATES: readonly Confidence[] = Object.freeze(['high', 'medium', 'low', 'unknown']);
const POSITIVE_FACT_STATES: readonly CountryFactState[] = Object.freeze(['supported', 'limited']);
const POSITIVE_REGULATION_STATES: readonly RegulationState[] = Object.freeze(['licensed', 'registered']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(hasText);
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

function pushUniqueArrayIssues(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] {
  if (!isStringArray(value)) {
    issues.push(issue(path, 'INVALID_ARRAY', `${path} must be a string array.`));
    return [];
  }
  const values = value as string[];
  if (new Set(values).size !== values.length) {
    issues.push(issue(path, 'DUPLICATE_REFERENCE', `${path} must not contain duplicates.`));
  }
  return values;
}

function validateFactDimension(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] {
  if (!isObject(value)) {
    issues.push(issue(path, 'NOT_OBJECT', `${path} must be an object.`));
    return [];
  }
  if (!FACT_STATES.includes(value.state as CountryFactState)) {
    issues.push(issue(`${path}.state`, 'INVALID_STATE', `${path} state is invalid.`));
  }
  const claimIds = pushUniqueArrayIssues(value.claimIds, `${path}.claimIds`, issues);
  pushUniqueArrayIssues(value.limitations, `${path}.limitations`, issues);
  const state = value.state as CountryFactState;
  if (['supported', 'limited', 'restricted', 'unavailable'].includes(state) && claimIds.length === 0) {
    issues.push(issue(`${path}.claimIds`, 'EVIDENCE_REQUIRED', `${path} needs claim references for a factual state.`));
  }
  return claimIds;
}

function validateRegulationDimension(
  value: unknown,
  issues: ValidationIssue[],
): string[] {
  const path = 'regulation';
  if (!isObject(value)) {
    issues.push(issue(path, 'NOT_OBJECT', 'Regulation dimension must be an object.'));
    return [];
  }
  if (!REGULATION_STATES.includes(value.state as RegulationState)) {
    issues.push(issue(`${path}.state`, 'INVALID_STATE', 'Regulation state is invalid.'));
  }
  const legal = pushUniqueArrayIssues(value.legalEntityClaimIds, `${path}.legalEntityClaimIds`, issues);
  const license = pushUniqueArrayIssues(value.licenseClaimIds, `${path}.licenseClaimIds`, issues);
  pushUniqueArrayIssues(value.limitations, `${path}.limitations`, issues);
  const state = value.state as RegulationState;
  if (['licensed', 'registered', 'restricted', 'prohibited'].includes(state) && legal.length + license.length === 0) {
    issues.push(issue(path, 'EVIDENCE_REQUIRED', 'A factual regulation state needs legal-entity or licence claim references.'));
  }
  return [...legal, ...license];
}

function validateRestrictionDimension(
  value: unknown,
  issues: ValidationIssue[],
): string[] {
  const path = 'restrictions';
  if (!isObject(value)) {
    issues.push(issue(path, 'NOT_OBJECT', 'Restrictions dimension must be an object.'));
    return [];
  }
  if (!RESTRICTION_STATES.includes(value.state as RestrictionFactState)) {
    issues.push(issue(`${path}.state`, 'INVALID_STATE', 'Restrictions state is invalid.'));
  }
  const claimIds = pushUniqueArrayIssues(value.claimIds, `${path}.claimIds`, issues);
  pushUniqueArrayIssues(value.limitations, `${path}.limitations`, issues);
  const state = value.state as RestrictionFactState;
  if ((state === 'clear' || state === 'restricted') && claimIds.length === 0) {
    issues.push(issue(`${path}.claimIds`, 'EVIDENCE_REQUIRED', 'A clear/restricted country state needs claim references.'));
  }
  return claimIds;
}

function factState(value: unknown): CountryFactState | null {
  if (!isObject(value) || !FACT_STATES.includes(value.state as CountryFactState)) return null;
  return value.state as CountryFactState;
}

function regulationState(value: unknown): RegulationState | null {
  if (!isObject(value) || !REGULATION_STATES.includes(value.state as RegulationState)) return null;
  return value.state as RegulationState;
}

function restrictionState(value: unknown): RestrictionFactState | null {
  if (!isObject(value) || !RESTRICTION_STATES.includes(value.state as RestrictionFactState)) return null;
  return value.state as RestrictionFactState;
}

function classifyFactForCommercial(state: CountryFactState, path: string): CountryCommercialReadiness {
  if (POSITIVE_FACT_STATES.includes(state)) return { ok: true };
  if (state === 'restricted') return { ok: false, block: 'restricted', path };
  if (state === 'unavailable') return { ok: false, block: 'unavailable', path };
  return { ok: false, block: 'under_review', path };
}

/**
 * Code-owned V1 commercial-readiness policy (#299).
 *
 * This is deliberately stricter than mere structural validity. A country CTA is
 * positive only when every material V1 dimension is explicitly positive. Negative
 * and unresolved states are never silently treated as authorization.
 */
export function evaluateCountryMarketProfileV1CommercialReadiness(
  input: unknown,
): CountryCommercialReadiness {
  const validation = validateCountryMarketProfileV1(input);
  if (!validation.ok || !validation.value) return { ok: false, block: 'invalid', path: '$' };
  const profile = validation.value;

  if (profile.approval !== 'approved') return { ok: false, block: 'under_review', path: 'approval' };
  if (profile.availability === 'restricted') return { ok: false, block: 'restricted', path: 'availability' };
  if (profile.availability === 'unavailable') return { ok: false, block: 'unavailable', path: 'availability' };
  if (profile.availability !== 'available' && profile.availability !== 'limited') {
    return { ok: false, block: 'under_review', path: 'availability' };
  }
  if (profile.offerEligibility !== 'approved') {
    return { ok: false, block: 'under_review', path: 'offerEligibility' };
  }

  const reg = profile.regulation.state;
  if (!POSITIVE_REGULATION_STATES.includes(reg)) {
    if (reg === 'restricted') return { ok: false, block: 'restricted', path: 'regulation.state' };
    if (reg === 'prohibited') return { ok: false, block: 'unavailable', path: 'regulation.state' };
    return { ok: false, block: 'under_review', path: 'regulation.state' };
  }

  const restrictions = profile.restrictions.state;
  if (restrictions !== 'clear') {
    return restrictions === 'restricted'
      ? { ok: false, block: 'restricted', path: 'restrictions.state' }
      : { ok: false, block: 'under_review', path: 'restrictions.state' };
  }

  const material: Array<[string, CountryFactState]> = [
    ['kyc.state', profile.kyc.state],
    ['deposits.state', profile.deposits.state],
    ['withdrawals.state', profile.withdrawals.state],
    ['fiatPayments.state', profile.fiatPayments.state],
    ['products.state', profile.products.state],
    ['bonusAvailability.state', profile.bonusAvailability.state],
  ];
  for (const [path, state] of material) {
    const result = classifyFactForCommercial(state, path);
    if (!result.ok) return result;
  }

  return { ok: true };
}

/** Strict validator for a production-capable country MarketProfile V1. */
export function validateCountryMarketProfileV1(input: unknown): ValidationResult<CountryMarketProfileV1> {
  const base = validateMarketProfile(input);
  const issues: ValidationIssue[] = [...base.issues];
  if (!isObject(input)) return { ok: false, issues };

  if (input.schemaVersion !== COUNTRY_MARKET_PROFILE_SCHEMA_VERSION) {
    issues.push(issue('schemaVersion', 'INVALID_SCHEMA_VERSION', 'Country MarketProfile schemaVersion must be 1.'));
  }

  if (!CONFIDENCE_STATES.includes(input.confidence as Confidence)) {
    issues.push(issue('confidence', 'INVALID_CONFIDENCE', 'Country MarketProfile confidence is invalid.'));
  }
  if (input.approval === 'approved' && !['high', 'medium'].includes(input.confidence as string)) {
    issues.push(issue('confidence', 'INSUFFICIENT_CONFIDENCE', 'An approved country profile requires high or medium confidence.'));
  }

  const referenced = new Set<string>();
  for (const id of validateRegulationDimension(input.regulation, issues)) referenced.add(id);
  for (const id of validateFactDimension(input.kyc, 'kyc', issues)) referenced.add(id);
  for (const id of validateFactDimension(input.deposits, 'deposits', issues)) referenced.add(id);
  for (const id of validateFactDimension(input.withdrawals, 'withdrawals', issues)) referenced.add(id);
  for (const id of validateFactDimension(input.products, 'products', issues)) referenced.add(id);
  for (const id of validateFactDimension(input.bonusAvailability, 'bonusAvailability', issues)) referenced.add(id);
  for (const id of validateRestrictionDimension(input.restrictions, issues)) referenced.add(id);

  if (!isObject(input.fiatPayments)) {
    issues.push(issue('fiatPayments', 'NOT_OBJECT', 'Fiat-payments dimension must be an object.'));
  } else {
    for (const id of validateFactDimension(input.fiatPayments, 'fiatPayments', issues)) referenced.add(id);
    const methods = pushUniqueArrayIssues(input.fiatPayments.methods, 'fiatPayments.methods', issues);
    const state = input.fiatPayments.state as CountryFactState;
    if ((state === 'supported' || state === 'limited') && methods.length === 0) {
      issues.push(issue('fiatPayments.methods', 'METHODS_REQUIRED', 'Supported/limited fiat payments require at least one method label.'));
    }
  }

  const baseClaimIds = Array.isArray(input.claimIds) ? new Set(input.claimIds.filter(hasText)) : new Set<string>();
  for (const id of referenced) {
    if (!baseClaimIds.has(id)) {
      issues.push(issue('claimIds', 'UNBOUND_DIMENSION_CLAIM', `Dimension claim ${id} must also appear in MarketProfile.claimIds.`));
    }
  }

  const availabilityPositive = input.availability === 'available' || input.availability === 'limited';
  const regState = regulationState(input.regulation);
  const restrState = restrictionState(input.restrictions);

  // A base positive country-availability statement must not contradict the richer
  // legal/restriction dimensions. Unknown or under-review legal state cannot back
  // an approved positive availability result.
  if (input.approval === 'approved' && availabilityPositive) {
    if (!regState || !POSITIVE_REGULATION_STATES.includes(regState)) {
      issues.push(issue('regulation.state', 'BASE_STATE_CONTRADICTION', 'Positive approved availability requires licensed or registered regulation state.'));
    }
    if (restrState !== 'clear') {
      issues.push(issue('restrictions.state', 'BASE_STATE_CONTRADICTION', 'Positive approved availability requires clear restriction state.'));
    }
  }

  // Local commercial approval is stricter than general availability: every
  // material operational/offer dimension must be explicitly supported or limited.
  if (input.offerEligibility === 'approved') {
    if (!availabilityPositive || input.approval !== 'approved') {
      issues.push(issue('offerEligibility', 'OFFER_STATE_MISMATCH', 'Approved local offer eligibility requires approved available/limited country availability.'));
    }
    const material: Array<[string, CountryFactState | null]> = [
      ['kyc.state', factState(input.kyc)],
      ['deposits.state', factState(input.deposits)],
      ['withdrawals.state', factState(input.withdrawals)],
      ['fiatPayments.state', factState(input.fiatPayments)],
      ['products.state', factState(input.products)],
      ['bonusAvailability.state', factState(input.bonusAvailability)],
    ];
    for (const [path, state] of material) {
      if (!state || !POSITIVE_FACT_STATES.includes(state)) {
        issues.push(issue(path, 'COMMERCIAL_DIMENSION_NOT_READY', 'Approved local offer eligibility requires this material dimension to be supported or limited.'));
      }
    }
    if (!regState || !POSITIVE_REGULATION_STATES.includes(regState)) {
      issues.push(issue('regulation.state', 'COMMERCIAL_DIMENSION_NOT_READY', 'Approved local offer eligibility requires licensed or registered regulation state.'));
    }
    if (restrState !== 'clear') {
      issues.push(issue('restrictions.state', 'COMMERCIAL_DIMENSION_NOT_READY', 'Approved local offer eligibility requires clear restriction state.'));
    }
  }

  return issues.length
    ? { ok: false, issues }
    : { ok: true, value: input as unknown as CountryMarketProfileV1, issues };
}
