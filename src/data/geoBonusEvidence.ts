/**
 * GEO Bonus Discovery & Verification System v1 (Sprint 8D, 2026-07-03)
 *
 * DATA/CONFIG ONLY — nothing here is wired into a visible page. This module
 * defines HOW we will evidence "does this exchange show a bonus to this
 * country, on this device" (registration-page / terms / regulatory evidence),
 * as distinct from `geoRankings.ts` (which decides whether a full country
 * RANKING is publishable). The two are related but answer different
 * questions:
 *   - geoRankings.ts    → "is exchange X available/ranked in country Y?"
 *   - geoBonusEvidence.ts → "did exchange X's registration page SHOW a bonus
 *                            to country Y on device Z, and how strong is
 *                            that evidence?"
 *
 * ── WHY DASHBOARD/POST-SIGNUP VERIFICATION IS NOT ASSUMED (owner decision) ──
 * We cannot create real accounts per country/device to verify bonuses land in
 * a live dashboard — that requires KYC, funds, and per-country identities we
 * don't have. So `postSignupVerification` defaults to 'not_available' and
 * MUST stay that way unless a real, evidenced post-signup check exists. A
 * bonus being SHOWN on a registration page is evidence it was *offered*, not
 * proof it will be *credited*. Never collapse those two claims into one.
 *
 * ── DO-NOT-INVENT RULES (binding, extends geoRankings.ts) ───────────────────
 *  1. No country availability claim without evidence (screenshot, HTML
 *     snapshot, or cited official source + date).
 *  2. No bonus eligibility claim without evidence.
 *  3. `registration_page` evidence (Level 1) is NEVER presented as guaranteed
 *     eligibility — always pair with the eligibilityVerdict + a visible
 *     caveat when rendered.
 *  4. An EU/MiCA regulatory overlay (geoRankings.ts) does NOT equal local
 *     bonus eligibility — it is one input among several, never sufficient
 *     alone.
 *  5. Local payment/KZT/Kaspi/P2P support is a SEPARATE claim from bonus
 *     visibility — do not infer one from the other.
 *  6. Desktop and mobile results can legitimately differ. If they disagree
 *     for the same exchange/country, confidence must be 'partial' or
 *     'unknown', never 'verified'.
 *  7. `postSignupVerification` defaults to 'not_available'. Only set
 *     'verified'/'not_verified'/'blocked' with a real, dated basis.
 */

import type { PromoCountrySlug, LiveExchangeSlug, EvidenceConfidence } from './geoRankings';
import { LIVE_EXCHANGE_SLUGS, getCountryPromoRanking, SUPPORTED_PROMO_COUNTRIES } from './geoRankings';

// ── Truth levels ─────────────────────────────────────────────────────────
//
// Level 1 — registration_page_shown: the bonus/promo/offer was visible on
//   the affiliate registration page or referral landing page, captured for a
//   given country/device viewport. This is the level most automated capture
//   can reach. It establishes "shown", not "eligible".
//
// Level 2 — terms_supported: official terms / restricted-country evidence
//   does not contradict availability, or explicitly supports the country.
//   Upgrades confidence but still does not prove post-signup crediting.
//
// Level 3 — post_signup_verified: inside-account/dashboard verification
//   after a real signup. Normally UNAVAILABLE per owner decision — see
//   PostSignupVerification below. Do not attempt to synthesize this level.

export type TruthLevel = 'registration_page_shown' | 'terms_supported' | 'post_signup_verified';

export const TRUTH_LEVEL_ORDER: TruthLevel[] = [
  'registration_page_shown',
  'terms_supported',
  'post_signup_verified',
];

/**
 * Level 3 status. Defaults to 'not_available' — this is the safe default for
 * every row unless a real post-signup check was performed and dated.
 */
export type PostSignupVerification = 'not_available' | 'verified' | 'not_verified' | 'blocked';

// ── GEO bonus evidence model ────────────────────────────────────────────

export type DeviceViewport = 'desktop' | 'mobile';

export type GeoEvidenceSourceType =
  | 'registration_page'      // Level 1: affiliate/referral landing page capture
  | 'official_terms'         // Level 2: exchange's own ToS / promo terms
  | 'restricted_country_page'// Level 2: exchange's own restricted-countries page
  | 'regulatory_overlay'     // Level 2: derived from geoRankings.ts EU/MiCA overlay
  | 'manual_owner_note';     // owner-supplied context, always confidence-capped

export type GeoBonusEvidenceStatus =
  | 'shown'        // bonus/promo text detected on the tested page
  | 'not_shown'    // page loaded but no bonus/promo text detected
  | 'blocked'      // capture blocked (bot protection, geo-block, timeout)
  | 'redirected'   // tested URL redirected somewhere unexpected (e.g. country selector, local domain)
  | 'unclear'      // ambiguous result — needs manual review
  | 'unknown';     // not yet tested

export type GeoBonusEligibilityVerdict =
  | 'likely_available'
  | 'limited'            // available but with material caveats (KYC gate, local-entity-only, etc.)
  | 'unknown'
  | 'likely_unavailable'
  | 'unavailable';

export interface GeoBonusEvidenceRow {
  exchangeSlug: LiveExchangeSlug;
  countrySlug: PromoCountrySlug;
  deviceViewport: DeviceViewport;

  /** Which affiliate link config this test used, e.g. 'default' or a geo key from exchanges.json affiliateLinks.geo. */
  affiliateUrlKey: string;
  /** If tested via the internal /go/{slug} redirect, its slug (goRouteSlug === exchangeSlug for this site's structure). */
  goRouteSlug: string | null;

  testedUrl: string;
  finalUrl: string | null;
  redirectChain: string[];

  status: GeoBonusEvidenceStatus;
  detectedBonusText: string | null;
  detectedPromoCode: string | null;
  detectedRestrictionText: string | null;
  detectedTermsText: string | null;

  /** Paths are repo-relative, under reports/evidence/geo-bonus/ (untracked) — see folder convention below. */
  screenshotPath: string | null;
  htmlSnapshotPath: string | null;

  capturedAt: string | null;   // ISO 8601 timestamp

  evidenceSourceType: GeoEvidenceSourceType;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
  evidenceDate: string | null;
  confidence: EvidenceConfidence;

  eligibilityVerdict: GeoBonusEligibilityVerdict;
  postSignupVerification: PostSignupVerification;

  note: string | null;
}

/**
 * v1: EMPTY BY DESIGN. No automated country/device capture has run yet — see
 * scripts/verify-geo-bonus.mjs (skeleton). This array is the seed point for
 * real evidence rows once that script (or a manual capture) produces them.
 * Do NOT add rows here without a real capturedAt/evidenceUrl — an empty
 * array is honest; a fabricated row is not.
 */
export const GEO_BONUS_EVIDENCE: GeoBonusEvidenceRow[] = [];

// ── Country + device + exchange verification matrix ─────────────────────
// Config only — used to validate CLI args and plan capture runs. Mirror any
// change here into scripts/verify-geo-bonus.mjs's own constant (that script
// is plain .mjs and cannot import this .ts module directly).

export const VERIFICATION_COUNTRIES: PromoCountrySlug[] = SUPPORTED_PROMO_COUNTRIES;
export const VERIFICATION_DEVICES: DeviceViewport[] = ['desktop', 'mobile'];
export const VERIFICATION_EXCHANGES: LiveExchangeSlug[] = LIVE_EXCHANGE_SLUGS;

/**
 * Env var NAME placeholders only — never real credentials. A capture script
 * reads e.g. `process.env.PROXY_PL` at runtime; if unset, that country's
 * capture must be skipped/marked 'blocked', never silently run un-proxied
 * and mislabeled as a country-specific result. 'global' intentionally has no
 * proxy (direct connection is the correct test for a global/undetected user).
 */
export const PROXY_ENV_PLACEHOLDERS: Partial<Record<PromoCountrySlug, string>> = {
  poland: 'PROXY_PL',
  germany: 'PROXY_DE',
  kazakhstan: 'PROXY_KZ',
  turkey: 'PROXY_TR',
  'united-kingdom': 'PROXY_UK',
  'united-states': 'PROXY_US',
};

/** How old evidence may be before it stops counting toward readiness. */
export const EVIDENCE_MAX_AGE_DAYS = 60;

// ── Helpers ────────────────────────────────────────────────────────────

export function getGeoBonusEvidence(
  countrySlug: PromoCountrySlug,
  exchangeSlug: LiveExchangeSlug,
  deviceViewport?: DeviceViewport,
): GeoBonusEvidenceRow[] {
  return GEO_BONUS_EVIDENCE.filter(r =>
    r.countrySlug === countrySlug
    && r.exchangeSlug === exchangeSlug
    && (deviceViewport ? r.deviceViewport === deviceViewport : true),
  );
}

function isEvidenceRecent(evidenceDate: string | null, capturedAt: string | null): boolean {
  const dateStr = capturedAt ?? evidenceDate;
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= EVIDENCE_MAX_AGE_DAYS;
}

/**
 * A single exchange×country bonus card may be shown as "country-checked"
 * only when ALL of these hold (section 8 readiness rules):
 *  - registration_page evidence exists (Level 1, status 'shown')
 *  - that evidence is recent enough (EVIDENCE_MAX_AGE_DAYS)
 *  - geoRankings.ts does not mark the country 'restricted' for this exchange
 *  - at least one device (desktop OR mobile) succeeded
 *  - no 'not_shown'/'blocked' terms-level contradiction at 'verified' confidence
 *  - overall confidence is 'verified' or 'partial' (never rendered on 'unknown')
 * Desktop/mobile disagreement is handled by rule 6 above (rows would already
 * be capped to 'partial'/'unknown' confidence at capture time).
 */
export function isCountryBonusCardReady(
  countrySlug: PromoCountrySlug,
  exchangeSlug: LiveExchangeSlug,
): boolean {
  const rows = getGeoBonusEvidence(countrySlug, exchangeSlug);
  if (rows.length === 0) return false;

  const rankingRow = getCountryPromoRanking(countrySlug).find(r => r.exchangeSlug === exchangeSlug);
  if (rankingRow?.availability === 'restricted') return false;

  const registrationHit = rows.find(
    r => r.evidenceSourceType === 'registration_page'
      && r.status === 'shown'
      && isEvidenceRecent(r.evidenceDate, r.capturedAt),
  );
  if (!registrationHit) return false;

  const hasContradiction = rows.some(
    r => r.confidence === 'verified'
      && (r.status === 'blocked' || r.status === 'not_shown')
      && r.evidenceSourceType !== 'registration_page',
  );
  if (hasContradiction) return false;

  return registrationHit.confidence === 'verified' || registrationHit.confidence === 'partial';
}

/**
 * Whether enough exchange rows exist for a country to consider a full
 * "bonuses available in this country" homepage/GEO-page treatment. This is
 * intentionally stricter than a single card — mirrors, but does not replace,
 * geoRankings.ts's isCountryRankingReady(). Both must independently pass
 * before any country page is built.
 */
export function isCountryBonusDiscoveryReady(countrySlug: PromoCountrySlug): boolean {
  const readyCount = VERIFICATION_EXCHANGES.filter(ex => isCountryBonusCardReady(countrySlug, ex)).length;
  return readyCount >= 4;
}
