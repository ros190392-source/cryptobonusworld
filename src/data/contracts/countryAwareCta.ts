/**
 * Country-aware commercial CTA resolver.
 *
 * Composes the existing fail-closed contracts — explicit country input, the
 * canonical Exchange × Country MarketProfile resolver, the offer restriction
 * check, and the base commercial CTA gate — into ONE decision. It does NOT
 * duplicate resolveCommercialCta; it feeds that gate the REAL profile facts only
 * when every country-level condition is proven, and otherwise downgrades to an
 * honest internal review / disabled state with a localized reason.
 *
 * A live `/go/*` action requires ALL of:
 *   - explicit production mode + commercial intent;
 *   - a valid, supported country (never `global` / missing / malformed);
 *   - exactly one valid, approved Exchange × Country MarketProfile;
 *   - profile availability available|limited AND offerEligibility approved;
 *   - fresh machine-readable profile evidence (canonical freshness policy);
 *   - an offer that exists and is itself verified;
 *   - the country NOT present in offer.restrictedCountries (malformed → block);
 *   - a valid affiliate slug/route (enforced by the base gate).
 * No single input implies the others.
 */
import type { MarketProfile } from './portalFactory';
import {
  resolveCommercialCta,
  type CommercialCtaModel,
  type CtaIntent,
  type CtaLocale,
} from './portalCta';
import type { CtaMode } from '../exchangePreview/cta-contract';
import { normalizeCountryInput, SUPPORTED_COUNTRY_CODES } from './countryInput';
import { resolveMarketProfile } from './marketProfileRegistry';

/** Explicit non-country homepage context until real country routing exists. */
export const PUBLIC_HOMEPAGE_COUNTRY = 'global';

const ISO_ALPHA2 = /^[A-Z]{2}$/;

export interface CountryAwareOfferInput {
  /** Offer status; authorizes the OFFER only — never country availability. */
  status?: string;
  restrictedCountries?: unknown;
}

export interface CountryAwareCtaInput {
  intent: CtaIntent;
  locale: CtaLocale;
  mode: CtaMode;
  /** Explicit country code (or 'global'); never inferred from IP/locale here. */
  countryCode: unknown;
  exchangeId: string;
  slug: string;
  /** Internal review destination (validated by the base gate). */
  reviewHref: string;
  offer: CountryAwareOfferInput | null | undefined;
  marketProfiles: readonly MarketProfile[];
  /** Explicit clock for freshness (required for a live decision). */
  now: number;
  /** Supported country set (injected for purity/testability). */
  supportedCountries?: readonly string[];
}

/** Normalize + validate offer.restrictedCountries. Malformed → fail closed. */
export function normalizeRestrictedCountries(
  list: unknown,
): { codes: string[]; malformed: boolean } {
  if (list === undefined || list === null) return { codes: [], malformed: false };
  if (!Array.isArray(list)) return { codes: [], malformed: true };
  const codes: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') return { codes: [], malformed: true };
    const code = raw.trim();
    if (!ISO_ALPHA2.test(code)) return { codes: [], malformed: true };
    codes.push(code);
  }
  return { codes, malformed: false };
}

/**
 * Resolve a country-aware commercial CTA model. Always returns a valid model;
 * a `/go/*` href appears only when every condition above is proven.
 */
export function resolveCountryAwareCommercialCta(input: CountryAwareCtaInput): CommercialCtaModel {
  const {
    intent, locale, mode, countryCode, exchangeId, slug, reviewHref,
    offer, marketProfiles, now, supportedCountries = SUPPORTED_COUNTRY_CODES,
  } = input;

  // Non-commercial internal review with a specific (later localized) reason.
  const review = (reason: string): CommercialCtaModel => ({
    ...resolveCommercialCta(intent, locale, mode, {
      exchangeId, slug, availability: 'unknown', offerEligibility: 'under_review',
      approval: 'validated', reviewHref,
    }),
    gateReason: reason,
  });
  // Genuine disabled control (restricted/unavailable) with a specific reason.
  const disabled = (availability: 'restricted' | 'unavailable', reason: string): CommercialCtaModel => ({
    ...resolveCommercialCta(intent, locale, mode, {
      exchangeId, slug, availability, offerEligibility: 'not_eligible',
      approval: 'validated', reviewHref,
    }),
    gateReason: reason,
  });

  // 1) Explicit country input.
  const sel = normalizeCountryInput(countryCode, supportedCountries);
  if (sel.state === 'missing') return review('COUNTRY_MISSING');
  if (sel.state === 'malformed') return review('COUNTRY_MALFORMED');
  if (sel.state === 'global') return review('COUNTRY_GLOBAL');
  if (sel.state === 'unsupported') return review('COUNTRY_UNSUPPORTED');
  const code = sel.code!; // 'valid'

  // 2) Canonical Exchange × Country MarketProfile.
  const res = resolveMarketProfile(exchangeId, code, marketProfiles);
  if (!res.ok) {
    switch (res.reason) {
      case 'PROFILE_RESTRICTED': return disabled('restricted', 'MARKET_RESTRICTED');
      case 'PROFILE_UNAVAILABLE': return disabled('unavailable', 'MARKET_UNAVAILABLE');
      case 'PROFILE_CONFLICT': return review('PROFILE_CONFLICT');
      case 'PROFILE_INVALID': return review('PROFILE_INVALID');
      case 'PROFILE_NOT_APPROVED': return review('PROFILE_UNDER_REVIEW');
      case 'PROFILE_MISSING':
      default: return review('PROFILE_MISSING');
    }
  }
  const profile = res.profile; // approved + available/limited + valid

  // 3) Offer must exist and be verified (authorizes the offer itself only).
  if (!offer || offer.status !== 'verified') return review('OFFER_NOT_APPROVED');

  // 4) Independent restricted-country enforcement (malformed → fail closed).
  const restricted = normalizeRestrictedCountries(offer.restrictedCountries);
  if (restricted.malformed) return disabled('restricted', 'RESTRICTION_DATA_INVALID');
  if (restricted.codes.includes(code)) return disabled('restricted', 'MARKET_RESTRICTED');

  // 5) Profile-level offer eligibility must be approved (distinct from offer.status).
  if (profile.offerEligibility !== 'approved') return review('OFFER_NOT_APPROVED');

  // 6) All country conditions met — hand the REAL profile facts to the canonical
  //    gate, which enforces production mode + evidence freshness + slug/route
  //    safety, fail-closed. Availability/eligibility/approval come from the
  //    approved MarketProfile, never from offer.status.
  return resolveCommercialCta(intent, locale, mode, {
    exchangeId, slug,
    availability: profile.availability,
    offerEligibility: profile.offerEligibility,
    approval: profile.approval,
    reviewHref,
    evidenceCheckedAt: profile.lastCheckedAt,
  }, { now });
}
