/**
 * Global public-offer authority registry (Issue #266).
 *
 * ONE code-owned registry that says, per offer-bearing exchange, WHICH authority strategy
 * governs its public presentation. This is the single place that decides whether an
 * exchange may make a public commercial offer claim / affiliate redirect.
 *
 * Governing rule: NO DEDICATED MACHINE-AUTHORITATIVE OFFER EVIDENCE PATH ⇒ NO PUBLIC
 * COMMERCIAL OFFER CLAIM + NO PUBLIC AFFILIATE REDIRECT.
 *
 * Only a strategy listed in `AUTHORIZING_STRATEGIES` may be commercial, and each such
 * strategy MUST be backed by an EXECUTABLE authorizer wired in publicOfferView.ts — a
 * future exchange can never become commercial by editing data alone (e.g. setting
 * `strategy: 'verified'`). The `no_authorizing_evidence` strategy is non-authorizing: the
 * public view stays neutral / under re-verification (fail-closed).
 */

export type PublicOfferAuthorityStrategyId =
  | 'bybit_claim_packet_v1' // dedicated claim packet + trusted promo confirmation + production adapter + exact-value projection
  | 'no_authorizing_evidence'; // no dedicated authorizing path yet → neutral, non-commercial

export interface PublicOfferAuthorityEntry {
  /** Canonical exchange slug. */
  slug: string;
  /** The code-owned strategy that governs this exchange's public presentation. */
  strategy: PublicOfferAuthorityStrategyId;
  /** Whether the strategy is actually implemented (an executable authorizer exists). */
  implemented: boolean;
  /** Whether the strategy can restore individual claim-bearing public copy. */
  claimLevelRestoration: boolean;
  /** Whether the strategy can authorize a public promo code. */
  promoCodeAuthority: boolean;
  /** Whether the strategy can authorize a public commercial (affiliate) CTA. */
  commercialCtaAuthority: boolean;
}

/** Strategies permitted to be commercial. EACH must have an executable authorizer (R14). */
export const AUTHORIZING_STRATEGIES: readonly PublicOfferAuthorityStrategyId[] = Object.freeze([
  'bybit_claim_packet_v1',
]);

export function isAuthorizingStrategy(id: string): id is PublicOfferAuthorityStrategyId {
  return (AUTHORIZING_STRATEGIES as readonly string[]).includes(id);
}

/**
 * The registry: one entry per CURRENT offer-bearing exchange. Only Bybit has a dedicated
 * authorizing strategy today (and it currently still resolves to under_re_verification);
 * the other five have no authorizing evidence path and are non-commercial.
 */
export const PUBLIC_OFFER_AUTHORITY_REGISTRY: readonly PublicOfferAuthorityEntry[] = Object.freeze([
  { slug: 'bybit', strategy: 'bybit_claim_packet_v1', implemented: true, claimLevelRestoration: true, promoCodeAuthority: true, commercialCtaAuthority: true },
  { slug: 'mexc', strategy: 'no_authorizing_evidence', implemented: false, claimLevelRestoration: false, promoCodeAuthority: false, commercialCtaAuthority: false },
  { slug: 'bitget', strategy: 'no_authorizing_evidence', implemented: false, claimLevelRestoration: false, promoCodeAuthority: false, commercialCtaAuthority: false },
  { slug: 'okx', strategy: 'no_authorizing_evidence', implemented: false, claimLevelRestoration: false, promoCodeAuthority: false, commercialCtaAuthority: false },
  { slug: 'kucoin', strategy: 'no_authorizing_evidence', implemented: false, claimLevelRestoration: false, promoCodeAuthority: false, commercialCtaAuthority: false },
  { slug: 'bingx', strategy: 'no_authorizing_evidence', implemented: false, claimLevelRestoration: false, promoCodeAuthority: false, commercialCtaAuthority: false },
]);

/** All current offer-bearing exchange slugs (registry order). */
export const OFFER_BEARING_EXCHANGES: readonly string[] = Object.freeze(
  PUBLIC_OFFER_AUTHORITY_REGISTRY.map((e) => e.slug),
);

/** Resolve the authority entry for a slug, or null when it is not a registered offer. */
export function getPublicOfferAuthority(slug: string): PublicOfferAuthorityEntry | null {
  return PUBLIC_OFFER_AUTHORITY_REGISTRY.find((e) => e.slug === slug) ?? null;
}

export function isOfferBearingExchange(slug: string): boolean {
  return getPublicOfferAuthority(slug) !== null;
}

/** Concise, non-claiming neutral public copy shared by every non-authoritative surface. */
export const NEUTRAL_PUBLIC_HEADLINE = 'Offer details are being re-verified';
export const NEUTRAL_PUBLIC_DETAIL = 'Current promotion terms are not verified yet.';
export const NEUTRAL_PUBLIC_STATUS_LABEL = 'Under re-verification';
export const NEUTRAL_PUBLIC_SUMMARY =
  'Offer details are being re-verified. Current promotion terms are not verified yet — check the exchange directly for current terms.';

export interface AuthorityRegistryIssue {
  slug: string;
  code: string;
  message: string;
}

/**
 * Fail-closed registry validation (R13/R14). Rejects an unknown/malformed strategy, and a
 * non-authorizing strategy that nonetheless claims commercial/promo/claim authority — so a
 * future edit that flips a data flag without a real executable strategy can never quietly
 * make an exchange commercial.
 */
export function validatePublicOfferAuthorityRegistry(
  registry: readonly PublicOfferAuthorityEntry[] = PUBLIC_OFFER_AUTHORITY_REGISTRY,
): { ok: boolean; issues: AuthorityRegistryIssue[] } {
  const issues: AuthorityRegistryIssue[] = [];
  const known: readonly PublicOfferAuthorityStrategyId[] = ['bybit_claim_packet_v1', 'no_authorizing_evidence'];
  const seen = new Set<string>();
  for (const e of registry) {
    if (!e || typeof e.slug !== 'string' || !e.slug) { issues.push({ slug: String(e?.slug), code: 'INVALID_SLUG', message: 'Entry slug must be a non-empty string.' }); continue; }
    if (seen.has(e.slug)) issues.push({ slug: e.slug, code: 'DUPLICATE', message: 'Duplicate registry slug.' });
    seen.add(e.slug);
    if (!known.includes(e.strategy)) { issues.push({ slug: e.slug, code: 'UNKNOWN_STRATEGY', message: `Unknown authority strategy: ${e.strategy}` }); continue; }
    const authorizing = isAuthorizingStrategy(e.strategy);
    if (!authorizing && (e.commercialCtaAuthority || e.promoCodeAuthority || e.claimLevelRestoration)) {
      issues.push({ slug: e.slug, code: 'NON_AUTHORIZING_CLAIMS_AUTHORITY', message: 'A non-authorizing strategy must declare no commercial/promo/claim authority.' });
    }
    if (e.commercialCtaAuthority && !authorizing) {
      issues.push({ slug: e.slug, code: 'COMMERCIAL_WITHOUT_AUTHORIZER', message: 'Commercial CTA authority requires an authorizing, executable strategy.' });
    }
  }
  return { ok: issues.length === 0, issues };
}
