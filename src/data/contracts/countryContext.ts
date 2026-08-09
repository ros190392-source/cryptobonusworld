/**
 * Country-context resolver for the Country Foundation (Issue #272).
 *
 * This module is deliberately pure: it never reads IP, headers, cookies,
 * browser locale or localStorage. Callers may pass an explicit persisted user
 * override and/or a proposed country from a future resolver. The decision is
 * deterministic and never treats context as proof of exchange availability.
 */
import {
  normalizeCountryInput,
  SUPPORTED_COUNTRY_CODES,
  type CountryInputState,
} from './countryInput';

export const COUNTRY_CONTEXT_STORAGE_KEY = 'cbw_country_context_v1';
export const COUNTRY_CONTEXT_STORAGE_VERSION = 1 as const;

export type CountryContextSource = 'explicit_override' | 'proposal' | 'global_default';
export type CountryContextReason =
  | 'EXPLICIT_COUNTRY'
  | 'EXPLICIT_GLOBAL'
  | 'EXPLICIT_INVALID'
  | 'PROPOSED_COUNTRY'
  | 'PROPOSAL_INVALID'
  | 'NO_COUNTRY_CONTEXT';

export interface CountryContextDecision {
  /** Exact uppercase country code when a valid country context exists. */
  countryCode: string | null;
  /** `country` is presentation/context only — never availability proof. */
  context: 'country' | 'global';
  source: CountryContextSource;
  reason: CountryContextReason;
  explicitState: CountryInputState;
  proposalState: CountryInputState;
}

export interface CountryContextInput {
  /** Persisted/manual owner-user choice, if one exists. */
  explicitOverride?: unknown;
  /** Optional proposed country from IP/browser/runtime context. */
  proposedCountry?: unknown;
  /** Injectable for deterministic tests and future rollout subsets. */
  supportedCountries?: readonly string[];
}

export interface StoredCountryContextV1 {
  v: typeof COUNTRY_CONTEXT_STORAGE_VERSION;
  country: string | 'global';
}

function isExplicitlyPresent(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

/**
 * Resolve country context with strict precedence:
 * explicit persisted/manual choice > proposal > global.
 *
 * Fail-closed detail: an explicitly-present malformed/unsupported override is
 * authoritative as an invalid choice and therefore resolves to GLOBAL. It does
 * NOT silently fall through to a different proposed country.
 */
export function resolveCountryContext(input: CountryContextInput): CountryContextDecision {
  const supported = input.supportedCountries ?? SUPPORTED_COUNTRY_CODES;
  const explicit = normalizeCountryInput(input.explicitOverride, supported);
  const proposal = normalizeCountryInput(input.proposedCountry, supported);

  if (isExplicitlyPresent(input.explicitOverride)) {
    if (explicit.state === 'valid') {
      return {
        countryCode: explicit.code,
        context: 'country',
        source: 'explicit_override',
        reason: 'EXPLICIT_COUNTRY',
        explicitState: explicit.state,
        proposalState: proposal.state,
      };
    }
    if (explicit.state === 'global') {
      return {
        countryCode: null,
        context: 'global',
        source: 'explicit_override',
        reason: 'EXPLICIT_GLOBAL',
        explicitState: explicit.state,
        proposalState: proposal.state,
      };
    }
    return {
      countryCode: null,
      context: 'global',
      source: 'explicit_override',
      reason: 'EXPLICIT_INVALID',
      explicitState: explicit.state,
      proposalState: proposal.state,
    };
  }

  if (proposal.state === 'valid') {
    return {
      countryCode: proposal.code,
      context: 'country',
      source: 'proposal',
      reason: 'PROPOSED_COUNTRY',
      explicitState: explicit.state,
      proposalState: proposal.state,
    };
  }

  if (isExplicitlyPresent(input.proposedCountry)) {
    return {
      countryCode: null,
      context: 'global',
      source: 'global_default',
      reason: 'PROPOSAL_INVALID',
      explicitState: explicit.state,
      proposalState: proposal.state,
    };
  }

  return {
    countryCode: null,
    context: 'global',
    source: 'global_default',
    reason: 'NO_COUNTRY_CONTEXT',
    explicitState: explicit.state,
    proposalState: proposal.state,
  };
}

/** Serialize only a valid normalized country or explicit global choice. */
export function serializeStoredCountryContext(
  country: unknown,
  supportedCountries: readonly string[] = SUPPORTED_COUNTRY_CODES,
): string | null {
  const normalized = normalizeCountryInput(country, supportedCountries);
  if (normalized.state !== 'valid' && normalized.state !== 'global') return null;
  const value: StoredCountryContextV1 = {
    v: COUNTRY_CONTEXT_STORAGE_VERSION,
    country: normalized.state === 'global' ? 'global' : normalized.code!,
  };
  return JSON.stringify(value);
}

/**
 * Parse a stored override fail-closed. Unknown versions, extra/missing shape,
 * malformed country values and unsupported countries return null.
 */
export function parseStoredCountryContext(
  raw: unknown,
  supportedCountries: readonly string[] = SUPPORTED_COUNTRY_CODES,
): StoredCountryContextV1 | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (record.v !== COUNTRY_CONTEXT_STORAGE_VERSION || typeof record.country !== 'string') return null;
  if (Object.keys(record).some((key) => key !== 'v' && key !== 'country')) return null;

  const normalized = normalizeCountryInput(record.country, supportedCountries);
  if (normalized.state !== 'valid' && normalized.state !== 'global') return null;
  return Object.freeze({
    v: COUNTRY_CONTEXT_STORAGE_VERSION,
    country: normalized.state === 'global' ? 'global' : normalized.code!,
  });
}
