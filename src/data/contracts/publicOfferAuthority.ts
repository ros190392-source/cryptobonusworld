/**
 * Global public-offer authority registry (Issue #266).
 *
 * ONE code-owned registry that says, per PUBLIC COMMERCIAL-CANDIDATE exchange, WHICH
 * authority strategy governs its public presentation. This is the single place that decides
 * whether an exchange may make a public commercial offer claim / affiliate redirect.
 *
 * Governing rule: NO DEDICATED MACHINE-AUTHORITATIVE OFFER EVIDENCE PATH ⇒ NO PUBLIC
 * COMMERCIAL OFFER CLAIM + NO PUBLIC AFFILIATE REDIRECT.
 *
 * The governed set is NOT the clean offers.ts registry (six slugs). It is the full set of
 * raw commercial candidates discovered from exchanges.json — every exchange whose raw record
 * still carries a real affiliate destination or promo/referral code. `/go/[exchange]` is
 * generated from ALL of exchanges.json, so the authority registry MUST cover every one of
 * those candidates or a legacy record could fall through to a commercial redirect (the R1
 * defect this task fixes). `validatePublicOfferAuthorityRegistryCoverage()` proves the
 * registry covers exactly the independently-discovered candidate set (R11).
 *
 * Only a strategy listed in `AUTHORIZING_STRATEGIES` may be commercial, and each such
 * strategy MUST be backed by an EXECUTABLE authorizer (dispatcher) wired in publicOfferView.ts
 * (`validateAuthorizingStrategyWiring`). A future exchange can never become commercial by
 * editing data alone (e.g. setting `strategy: 'verified'`, or flipping `implemented: true`):
 * the per-entry capability flags are DERIVED from the strategy definition and validated, so a
 * data-only edit that disagrees with the strategy fails closed. The `no_authorizing_evidence`
 * strategy is non-authorizing: the public view stays neutral / under re-verification.
 */

export type PublicOfferAuthorityStrategyId =
  | 'bybit_claim_packet_v1' // dedicated claim packet + trusted promo confirmation + production adapter + exact-value projection
  | 'no_authorizing_evidence'; // no dedicated authorizing path yet → neutral, non-commercial

/**
 * Code-owned definition of what each strategy is CAPABLE of. Capabilities live here, keyed by
 * strategy — NOT as free-standing per-exchange data flags (R8). A registry entry's flags are
 * validated to match its strategy's definition, so no per-exchange data edit can invent
 * authority.
 */
export interface PublicOfferStrategyDefinition {
  /** Whether this strategy is permitted to produce a commercial public view at all. */
  authorizing: boolean;
}

export const PUBLIC_OFFER_STRATEGY_DEFINITIONS: Readonly<
  Record<PublicOfferAuthorityStrategyId, PublicOfferStrategyDefinition>
> = Object.freeze({
  bybit_claim_packet_v1: Object.freeze({ authorizing: true }),
  no_authorizing_evidence: Object.freeze({ authorizing: false }),
});

export interface PublicOfferAuthorityEntry {
  /** Canonical exchange slug. */
  slug: string;
  /** The code-owned strategy that governs this exchange's public presentation. */
  strategy: PublicOfferAuthorityStrategyId;
  /** Whether the strategy is actually implemented (an executable authorizer exists). Derived from the strategy — validated, never independent data authority. */
  implemented: boolean;
  /** Whether the strategy can restore individual claim-bearing public copy. Derived from the strategy. */
  claimLevelRestoration: boolean;
  /** Whether the strategy can authorize a public promo code. Derived from the strategy. */
  promoCodeAuthority: boolean;
  /** Whether the strategy can authorize a public commercial (affiliate) CTA. Derived from the strategy. */
  commercialCtaAuthority: boolean;
}

/** Strategies permitted to be commercial. EACH must have an executable authorizer (R14). */
export const AUTHORIZING_STRATEGIES: readonly PublicOfferAuthorityStrategyId[] = Object.freeze(
  (Object.keys(PUBLIC_OFFER_STRATEGY_DEFINITIONS) as PublicOfferAuthorityStrategyId[]).filter(
    (id) => PUBLIC_OFFER_STRATEGY_DEFINITIONS[id].authorizing,
  ),
);

export function isAuthorizingStrategy(id: string): id is PublicOfferAuthorityStrategyId {
  return (AUTHORIZING_STRATEGIES as readonly string[]).includes(id);
}

/** Build a deeply-frozen entry with capability flags DERIVED from the strategy definition. */
function entry(slug: string, strategy: PublicOfferAuthorityStrategyId): PublicOfferAuthorityEntry {
  const authorizing = PUBLIC_OFFER_STRATEGY_DEFINITIONS[strategy].authorizing;
  return Object.freeze({
    slug,
    strategy,
    implemented: authorizing,
    claimLevelRestoration: authorizing,
    promoCodeAuthority: authorizing,
    commercialCtaAuthority: authorizing,
  });
}

/**
 * The registry: one entry per CURRENT public commercial-candidate exchange (discovered from
 * exchanges.json — see R11 coverage proof). Only Bybit has a dedicated authorizing strategy
 * today (and it currently still resolves to under_re_verification); every other candidate has
 * no authorizing evidence path and is non-commercial. Order follows the exchanges.json catalog.
 */
export const PUBLIC_OFFER_AUTHORITY_REGISTRY: readonly PublicOfferAuthorityEntry[] = Object.freeze([
  entry('bybit', 'bybit_claim_packet_v1'),
  entry('mexc', 'no_authorizing_evidence'),
  entry('okx', 'no_authorizing_evidence'),
  entry('bitget', 'no_authorizing_evidence'),
  entry('bingx', 'no_authorizing_evidence'),
  entry('gate-io', 'no_authorizing_evidence'),
  entry('kucoin', 'no_authorizing_evidence'),
  entry('htx', 'no_authorizing_evidence'),
  entry('coinex', 'no_authorizing_evidence'),
  entry('phemex', 'no_authorizing_evidence'),
  entry('bitunix', 'no_authorizing_evidence'),
  entry('binance', 'no_authorizing_evidence'),
  entry('coinbase', 'no_authorizing_evidence'),
]);

/** All current governed public commercial-candidate slugs (registry order). */
export const PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES: readonly string[] = Object.freeze(
  PUBLIC_OFFER_AUTHORITY_REGISTRY.map((e) => e.slug),
);

/**
 * @deprecated Misleading name retained only as a compatibility alias. The governed set is the
 * commercial-candidate catalog (13 slugs), NOT the six clean offer-bearing exchanges. Prefer
 * {@link PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES}.
 */
export const OFFER_BEARING_EXCHANGES: readonly string[] = PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES;

/** Resolve the authority entry for a slug, or null when it is not a governed candidate. */
export function getPublicOfferAuthority(slug: string): PublicOfferAuthorityEntry | null {
  return PUBLIC_OFFER_AUTHORITY_REGISTRY.find((e) => e.slug === slug) ?? null;
}

export function isCommercialCandidateExchange(slug: string): boolean {
  return getPublicOfferAuthority(slug) !== null;
}

/** @deprecated Alias of {@link isCommercialCandidateExchange}. */
export function isOfferBearingExchange(slug: string): boolean {
  return isCommercialCandidateExchange(slug);
}

// ── Independent commercial-candidate discovery (R1/R5/R11) ──────────────────────────────────
//
// The raw shape we read from exchanges.json to decide whether an exchange is a commercial
// candidate. Kept intentionally minimal and permissive so a future field addition still parses.

export interface RawExchangeCandidateRecord {
  slug: string;
  affiliateUrl?: unknown;
  affiliateLinks?: { default?: unknown; geo?: Record<string, unknown> } | null;
  promoCode?: unknown;
  promoCodes?: Array<{ code?: unknown } | null> | null;
}

/** A real, non-placeholder http(s) destination. `#`, empty and non-strings are placeholders. */
function isRealDestination(u: unknown): boolean {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

function isRealCode(c: unknown): boolean {
  return typeof c === 'string' && c.trim() !== '' && c.trim() !== '#';
}

/**
 * A legacy/raw exchange is a PUBLIC COMMERCIAL CANDIDATE when its raw record carries any real
 * commercial material: a non-placeholder affiliate destination (affiliateUrl / default / any
 * geo) OR a non-empty promo/referral code. A bare official-homepage `affiliateUrl` (e.g.
 * Coinbase → https://www.coinbase.com/) still counts — under the old fail-open `/go` logic it
 * would have redirected commercially, so it MUST be governed.
 */
export function isCommercialCandidate(rec: RawExchangeCandidateRecord): boolean {
  if (isRealDestination(rec.affiliateUrl)) return true;
  if (isRealDestination(rec.affiliateLinks?.default)) return true;
  for (const g of Object.values(rec.affiliateLinks?.geo ?? {})) if (isRealDestination(g)) return true;
  if (isRealCode(rec.promoCode)) return true;
  if (Array.isArray(rec.promoCodes) && rec.promoCodes.some((p) => p && isRealCode(p.code))) return true;
  return false;
}

/** Discover the complete current commercial-candidate slug set from raw exchange records. */
export function discoverCommercialCandidateSlugs(
  records: readonly RawExchangeCandidateRecord[],
): string[] {
  const set = new Set<string>();
  for (const rec of records) if (rec && typeof rec.slug === 'string' && isCommercialCandidate(rec)) set.add(rec.slug);
  return [...set];
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
 * Fail-closed registry validation (R8/R13/R14). Rejects an unknown/malformed strategy, a
 * duplicate, and — critically — any entry whose capability flags disagree with its strategy
 * definition, so a data-only edit that flips `implemented`/`commercialCtaAuthority`/etc. on a
 * non-authorizing strategy can never quietly make an exchange commercial.
 */
export function validatePublicOfferAuthorityRegistry(
  registry: readonly PublicOfferAuthorityEntry[] = PUBLIC_OFFER_AUTHORITY_REGISTRY,
): { ok: boolean; issues: AuthorityRegistryIssue[] } {
  const issues: AuthorityRegistryIssue[] = [];
  const seen = new Set<string>();
  for (const e of registry) {
    if (!e || typeof e.slug !== 'string' || !e.slug) { issues.push({ slug: String(e?.slug), code: 'INVALID_SLUG', message: 'Entry slug must be a non-empty string.' }); continue; }
    if (seen.has(e.slug)) issues.push({ slug: e.slug, code: 'DUPLICATE', message: 'Duplicate registry slug.' });
    seen.add(e.slug);
    const def = PUBLIC_OFFER_STRATEGY_DEFINITIONS[e.strategy];
    if (!def) { issues.push({ slug: e.slug, code: 'UNKNOWN_STRATEGY', message: `Unknown authority strategy: ${e.strategy}` }); continue; }
    const authorizing = def.authorizing;
    // Capability flags MUST equal what the strategy definition permits (R8). No independent data authority.
    if (
      e.implemented !== authorizing ||
      e.claimLevelRestoration !== authorizing ||
      e.promoCodeAuthority !== authorizing ||
      e.commercialCtaAuthority !== authorizing
    ) {
      issues.push({ slug: e.slug, code: 'CAPABILITY_STRATEGY_MISMATCH', message: 'Capability flags must be derived from (equal to) the strategy definition.' });
    }
    if (e.commercialCtaAuthority && !authorizing) {
      issues.push({ slug: e.slug, code: 'COMMERCIAL_WITHOUT_AUTHORIZER', message: 'Commercial CTA authority requires an authorizing, executable strategy.' });
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Prove the authority registry covers EXACTLY the independently-discovered commercial-candidate
 * set (R11) — breaking the circular assumption that the registry validates itself against a list
 * derived from itself. A new candidate in exchanges.json without a registry entry, or a stale
 * registry entry with no candidate, fails closed.
 */
export function validatePublicOfferAuthorityRegistryCoverage(
  records: readonly RawExchangeCandidateRecord[],
  registry: readonly PublicOfferAuthorityEntry[] = PUBLIC_OFFER_AUTHORITY_REGISTRY,
): { ok: boolean; issues: AuthorityRegistryIssue[]; discovered: string[]; registered: string[] } {
  const issues: AuthorityRegistryIssue[] = [];
  const discovered = new Set(discoverCommercialCandidateSlugs(records));
  const registered = new Set(registry.map((e) => e.slug));
  for (const slug of discovered) {
    if (!registered.has(slug)) issues.push({ slug, code: 'MISSING_REGISTRY_ENTRY', message: `Commercial candidate "${slug}" has no authority registry entry (would fall through to a commercial redirect).` });
  }
  for (const slug of registered) {
    if (!discovered.has(slug)) issues.push({ slug, code: 'STALE_REGISTRY_ENTRY', message: `Authority registry entry "${slug}" is not a current commercial candidate.` });
  }
  return { ok: issues.length === 0, issues, discovered: [...discovered], registered: [...registered] };
}

/**
 * Prove every authorizing strategy is backed by an EXECUTABLE dispatcher (R8/R14). The wired set
 * is owned by publicOfferView.ts (`WIRED_AUTHORIZING_STRATEGIES`); an authorizing strategy with
 * no wired dispatcher fails closed.
 */
export function validateAuthorizingStrategyWiring(
  wired: readonly string[],
): { ok: boolean; issues: AuthorityRegistryIssue[] } {
  const issues: AuthorityRegistryIssue[] = [];
  const wiredSet = new Set(wired);
  for (const strategy of AUTHORIZING_STRATEGIES) {
    if (!wiredSet.has(strategy)) issues.push({ slug: '(strategy)', code: 'MISSING_DISPATCHER', message: `Authorizing strategy "${strategy}" has no executable dispatcher wired.` });
  }
  return { ok: issues.length === 0, issues };
}
