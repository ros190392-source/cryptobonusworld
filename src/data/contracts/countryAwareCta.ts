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
 *   - for Country Foundation V1, every material structured dimension explicitly positive;
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
import {
  evaluateCountryMarketProfileV1CommercialReadiness,
  validateCountryMarketProfileV1,
} from './marketProfileV1';
import { resolveOfferEvidenceAuthorization } from './evidenceMetadata';

/** Explicit non-country homepage context until real country routing exists. */
export const PUBLIC_HOMEPAGE_COUNTRY = 'global';

const ISO_ALPHA2 = /^[A-Z]{2}$/;
/** Canonical exchange identity (CBW: MarketProfile.exchangeId === exchange slug). */
const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export interface CountryAwareOfferInput {
  /** Canonical exchange slug this offer belongs to (must match the target). */
  exchangeSlug?: unknown;
  /** Offer status; authorizes the OFFER only — never country availability. */
  status?: string;
  restrictedCountries?: unknown;
  /**
   * Canonical machine-readable offer evidence (EvidenceMetadata | null). A live
   * CTA requires this to be authoritative AND identity-bound (R1/R2). It is a
   * SEPARATE, independent proof from the MarketProfile evidence; offer.status
   * can never substitute for it.
   */
  evidence?: unknown;
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
  marketProfiles: unknown;
  /**
   * Explicit finite clock (epoch ms) for freshness + review-deadline checks.
   * A live decision REQUIRES a finite `now`; missing/non-finite → internal review.
   */
  now?: number;
  /** Supported country set (injected for purity/testability). */
  supportedCountries?: readonly string[];
  /**
   * Legacy keeps the existing structural MarketProfile gate for backwards-compatible
   * internal fixtures. Country Foundation public consumers MUST use `country_v1`.
   */
  profileContract?: 'legacy' | 'country_v1';
}

export type CountryFoundationCtaInput = Omit<CountryAwareCtaInput, 'profileContract'>;
export type RestrictionState = 'ok' | 'missing' | 'invalid';

/**
 * Normalize + validate offer.restrictedCountries for a PRODUCTION country gate.
 *
 * Completeness is required (R3): absent restriction metadata is NOT proof of an
 * empty restriction list — it is unproven and fails closed. Only an EXPLICIT
 * array (possibly empty) counts as recorded proof.
 */
export function normalizeRestrictedCountries(
  list: unknown,
): { state: RestrictionState; codes: string[] } {
  if (list === undefined || list === null) return { state: 'missing', codes: [] };
  if (!Array.isArray(list)) return { state: 'invalid', codes: [] };
  const codes: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') return { state: 'invalid', codes: [] };
    const code = raw.trim();
    if (!ISO_ALPHA2.test(code)) return { state: 'invalid', codes: [] };
    codes.push(code);
  }
  return { state: 'ok', codes };
}

/**
 * Resolve a country-aware commercial CTA model. Always returns a valid model;
 * a `/go/*` href appears only when every condition above is proven.
 */
export function resolveCountryAwareCommercialCta(input: CountryAwareCtaInput): CommercialCtaModel {
  const {
    intent, locale, mode, countryCode, exchangeId, slug, reviewHref,
    offer, marketProfiles, now, supportedCountries = SUPPORTED_COUNTRY_CODES,
    profileContract = 'legacy',
  } = input;

  const review = (reason: string): CommercialCtaModel => ({
    ...resolveCommercialCta(intent, locale, mode, {
      exchangeId, slug, availability: 'unknown', offerEligibility: 'under_review',
      approval: 'validated', reviewHref,
    }),
    gateReason: reason,
  });
  const disabled = (availability: 'restricted' | 'unavailable', reason: string): CommercialCtaModel => ({
    ...resolveCommercialCta(intent, locale, mode, {
      exchangeId, slug, availability, offerEligibility: 'not_eligible',
      approval: 'validated', reviewHref,
    }),
    gateReason: reason,
  });

  if (typeof exchangeId !== 'string' || typeof slug !== 'string'
    || !CANONICAL_SLUG.test(exchangeId) || !CANONICAL_SLUG.test(slug)
    || exchangeId !== slug) {
    return review('EXCHANGE_IDENTITY_MISMATCH');
  }

  const sel = normalizeCountryInput(countryCode, supportedCountries);
  if (sel.state === 'missing') return review('COUNTRY_MISSING');
  if (sel.state === 'malformed') return review('COUNTRY_MALFORMED');
  if (sel.state === 'global') return review('COUNTRY_GLOBAL');
  if (sel.state === 'unsupported') return review('COUNTRY_UNSUPPORTED');
  const code = sel.code!;

  const res = resolveMarketProfile(exchangeId, code, marketProfiles as never);
  if (!res.ok) {
    switch (res.reason) {
      case 'PROFILE_RESTRICTED': return disabled('restricted', 'MARKET_RESTRICTED');
      case 'PROFILE_UNAVAILABLE': return disabled('unavailable', 'MARKET_UNAVAILABLE');
      case 'PROFILE_CONFLICT': return review('PROFILE_CONFLICT');
      case 'PROFILE_INVALID': return review('PROFILE_INVALID');
      case 'PROFILE_NOT_APPROVED': return review('PROFILE_UNDER_REVIEW');
      case 'PROFILE_REGISTRY_INVALID': return review('PROFILE_REGISTRY_INVALID');
      case 'PROFILE_MISSING':
      default: return review('PROFILE_MISSING');
    }
  }
  const profile = res.profile;

  // Country Foundation hardening: structural V1 validity is necessary but not
  // sufficient. The separate readiness policy independently composes the rich
  // V1 dimensions into the final country-commercial decision (#299).
  if (profileContract === 'country_v1') {
    if (!validateCountryMarketProfileV1(profile).ok) {
      return review('PROFILE_FOUNDATION_INVALID');
    }
    const readiness = evaluateCountryMarketProfileV1CommercialReadiness(profile);
    if (!readiness.ok) {
      if (readiness.block === 'restricted') return disabled('restricted', 'MARKET_RESTRICTED');
      if (readiness.block === 'unavailable') return disabled('unavailable', 'MARKET_UNAVAILABLE');
      return review('PROFILE_FOUNDATION_INVALID');
    }
  }

  if (profile.exchangeId !== exchangeId) return review('EXCHANGE_IDENTITY_MISMATCH');

  if (!offer || offer.status !== 'verified') return review('OFFER_NOT_APPROVED');

  if (typeof offer.exchangeSlug !== 'string' || !CANONICAL_SLUG.test(offer.exchangeSlug)
    || offer.exchangeSlug !== exchangeId) {
    return review('OFFER_IDENTITY_MISMATCH');
  }

  const restricted = normalizeRestrictedCountries(offer.restrictedCountries);
  if (restricted.state === 'missing') return review('RESTRICTION_DATA_MISSING');
  if (restricted.state === 'invalid') return disabled('restricted', 'RESTRICTION_DATA_INVALID');
  if (restricted.codes.includes(code)) return disabled('restricted', 'MARKET_RESTRICTED');

  if (profile.offerEligibility !== 'approved') return review('OFFER_NOT_APPROVED');

  if (!Number.isFinite(now)) return review('CLOCK_INVALID');
  const nowMs = now as number;

  const nextReview = Date.parse(profile.nextReviewAt);
  if (!Number.isFinite(nextReview) || nowMs >= nextReview) return review('PROFILE_REVIEW_OVERDUE');

  const offerEvidence = resolveOfferEvidenceAuthorization(offer.evidence, exchangeId, nowMs);
  if (!offerEvidence.ok) return review(offerEvidence.reason);

  return resolveCommercialCta(intent, locale, mode, {
    exchangeId, slug,
    availability: profile.availability,
    offerEligibility: profile.offerEligibility,
    approval: profile.approval,
    reviewHref,
    evidenceCheckedAt: profile.lastCheckedAt,
  }, { now: nowMs });
}

/**
 * Strict Country Foundation entry point for all new public PL/KZ country work.
 * It reuses the canonical resolver above and only pins the profile contract to V1.
 */
export function resolveCountryFoundationCommercialCta(
  input: CountryFoundationCtaInput,
): CommercialCtaModel {
  return resolveCountryAwareCommercialCta({ ...input, profileContract: 'country_v1' });
}
