/**
 * Explicit country-selection input contract for the country-aware commercial gate.
 *
 * Purity rules (enforced by design):
 *   - The country code is ALWAYS passed in explicitly. This module never reads
 *     IP, headers, cookies, browser locale or any global/runtime state.
 *   - Only already-normalized uppercase ISO-3166-1 alpha-2 codes are accepted;
 *     lowercase or otherwise unnormalized input is `malformed`.
 *   - `global` is a recognised non-country context — NOT proof of country
 *     eligibility — and can never authorize a live affiliate CTA.
 *   - The supported set is injected, so the validator stays pure and testable.
 *
 * The supported codes below are country IDENTITY metadata (which countries the
 * site recognizes), NOT a claim that any exchange is available in them. Exchange
 * availability is decided only by an approved Exchange × Country MarketProfile.
 */

export type CountryInputState = 'valid' | 'global' | 'missing' | 'malformed' | 'unsupported';

export interface CountrySelection {
  state: CountryInputState;
  /** The normalized code when `state === 'valid'` or `'unsupported'`, else null. */
  code: string | null;
}

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const GLOBAL_TOKEN = 'global';

/**
 * ISO alpha-2 identity for each recognized country slug in countries.json / the
 * controlled country foundation. Identity only — never an availability claim.
 */
export const COUNTRY_SLUG_TO_ISO: Readonly<Record<string, string>> = Object.freeze({
  poland: 'PL',
  kazakhstan: 'KZ',
  bulgaria: 'BG',
  turkey: 'TR',
  india: 'IN',
  indonesia: 'ID',
  nigeria: 'NG',
  brazil: 'BR',
  vietnam: 'VN',
  philippines: 'PH',
  'united-arab-emirates': 'AE',
  pakistan: 'PK',
  kenya: 'KE',
  ukraine: 'UA',
  mexico: 'MX',
  argentina: 'AR',
  'united-states': 'US',
});

/** Recognized country codes (excludes the non-country `global` context). */
export const SUPPORTED_COUNTRY_CODES: readonly string[] = Object.freeze(
  Object.values(COUNTRY_SLUG_TO_ISO),
);

/**
 * Deterministically classify an explicit country input against a supported set.
 * Pure — no side effects, no global reads.
 */
export function normalizeCountryInput(
  raw: unknown,
  supported: readonly string[] = SUPPORTED_COUNTRY_CODES,
): CountrySelection {
  if (raw === undefined || raw === null) return { state: 'missing', code: null };
  if (typeof raw !== 'string') return { state: 'malformed', code: null };

  const trimmed = raw.trim();
  if (trimmed === '') return { state: 'missing', code: null };
  if (trimmed.toLowerCase() === GLOBAL_TOKEN) return { state: 'global', code: null };

  // Require already-normalized uppercase alpha-2; anything else is malformed.
  if (!ISO_ALPHA2.test(trimmed)) return { state: 'malformed', code: null };
  if (!supported.includes(trimmed)) return { state: 'unsupported', code: trimmed };
  return { state: 'valid', code: trimmed };
}
