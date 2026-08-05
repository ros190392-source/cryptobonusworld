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
}

export type RestrictionState = 'ok' | 'missing' | 'invalid';

/**
 * Normalize + validate offer.restrictedCountries for a PRODUCTION country gate.
 *
 * Completeness is required (R3): absent restriction metadata is NOT proof of an
 * empty restriction list — it is unproven and fails closed. Only an EXPLICIT
 * array (possibly empty) counts as recorded proof.
 *   - undefined / null            → 'missing' (fail closed)
 *   - non-array                   → 'invalid' (fail closed)
 *   - any malformed element       → 'invalid' (fail closed)
 *   - []                          → 'ok' (proof: no restrictions recorded)
 *   - valid uppercase alpha-2 list → 'ok'
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

  // 0) Canonical exchange identity (R1). The affiliate destination is derived
  //    only from a single, internally-consistent identity, so a profile for
  //    exchange A can never authorize /go/{exchange-B}. No silent normalization.
  if (typeof exchangeId !== 'string' || typeof slug !== 'string'
    || !CANONICAL_SLUG.test(exchangeId) || !CANONICAL_SLUG.test(slug)
    || exchangeId !== slug) {
    return review('EXCHANGE_IDENTITY_MISMATCH');
  }

  // 1) Explicit country input.
  const sel = normalizeCountryInput(countryCode, supportedCountries);
  if (sel.state === 'missing') return review('COUNTRY_MISSING');
  if (sel.state === 'malformed') return review('COUNTRY_MALFORMED');
  if (sel.state === 'global') return review('COUNTRY_GLOBAL');
  if (sel.state === 'unsupported') return review('COUNTRY_UNSUPPORTED');
  const code = sel.code!; // 'valid'

  // 2) Canonical Exchange × Country MarketProfile. resolveMarketProfile never
  //    throws on a malformed registry (R6) — it reports PROFILE_REGISTRY_INVALID.
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
  const profile = res.profile; // approved + available/limited + valid

  // Defense in depth: the resolved profile must carry the same exchange identity.
  if (profile.exchangeId !== exchangeId) return review('EXCHANGE_IDENTITY_MISMATCH');

  // 3) Offer must exist and be verified (authorizes the offer itself only).
  if (!offer || offer.status !== 'verified') return review('OFFER_NOT_APPROVED');

  // 3b) Offer identity (R2): the offer must belong to this exact exchange.
  if (typeof offer.exchangeSlug !== 'string' || !CANONICAL_SLUG.test(offer.exchangeSlug)
    || offer.exchangeSlug !== exchangeId) {
    return review('OFFER_IDENTITY_MISMATCH');
  }

  // 4) Independent restricted-country enforcement (malformed/missing → fail closed).
  const restricted = normalizeRestrictedCountries(offer.restrictedCountries);
  if (restricted.state === 'missing') return review('RESTRICTION_DATA_MISSING');
  if (restricted.state === 'invalid') return disabled('restricted', 'RESTRICTION_DATA_INVALID');
  if (restricted.codes.includes(code)) return disabled('restricted', 'MARKET_RESTRICTED');

  // 5) Profile-level offer eligibility must be approved (distinct from offer.status).
  if (profile.offerEligibility !== 'approved') return review('OFFER_NOT_APPROVED');

  // 5b) Finite explicit clock (R4): a live decision requires a real, finite now.
  if (!Number.isFinite(now)) return review('CLOCK_INVALID');
  const nowMs = now as number;

  // 5c) Scheduled review must not be overdue (R5), independent of the
  //     lastCheckedAt freshness policy which the base gate also enforces.
  const nextReview = Date.parse(profile.nextReviewAt);
  if (!Number.isFinite(nextReview) || nowMs >= nextReview) return review('PROFILE_REVIEW_OVERDUE');

  // 5d) Independent OFFER evidence (R1/R2): a live CTA requires authoritative,
  //     identity-bound offer evidence in ADDITION to the approved/fresh profile.
  //     offer.status === 'verified' can never substitute for machine evidence.
  const offerEvidence = resolveOfferEvidenceAuthorization(offer.evidence, exchangeId, nowMs);
  if (!offerEvidence.ok) return review(offerEvidence.reason);

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
  }, { now: nowMs });
}
