/**
 * GEO availability + ranking data model v1 (Sprint 7, 2026-07-02)
 *
 * Foundation for future /promo-codes/{country}/ rankings. DATA ONLY —
 * nothing here is wired into a visible page yet. The live /promo-codes/
 * page keeps its static v1 selector until country data is verified.
 *
 * ── DO-NOT-INVENT RULES (binding) ────────────────────────────────────────
 *  1. No country-specific ranking may be rendered without verified evidence.
 *  2. No availability claim without a source URL and a date.
 *  3. `unknown` must remain `unknown` — never render unknown as available.
 *  4. `restricted` must be shown clearly to users, never hidden or softened.
 *  5. Country pages require explicit owner approval before being indexed.
 *  6. Every country ranking requires a source-QA pass before publishing.
 *
 * v1 data honesty:
 *  - The ONLY country-level signal currently in the repo is
 *    offers.ts → restrictedCountries (canonical, per-offer, with sourceUrl +
 *    lastChecked). Rows below are DERIVED from it at module load, so they
 *    can never drift from the canonical offer data.
 *  - Derived restrictions carry confidence 'partial' (the source is the
 *    offer terms summary, not a dedicated capture of the exchange's own
 *    restricted-countries page). Upgrading to 'verified' requires a dated
 *    evidence capture per exchange × country (see TODOs at the bottom).
 *  - Everything not covered by restrictedCountries stays 'unknown'.
 */

import { exchanges, type Exchange } from './exchanges';
import { getOffer, type Offer } from './offers';

// ── Types ──────────────────────────────────────────────────────────────────

export type CountryAvailability = 'available' | 'restricted' | 'unknown';
export type BonusAvailability = 'available' | 'not_available' | 'unknown';
export type EvidenceConfidence = 'verified' | 'partial' | 'unknown';

export type PromoCountrySlug =
  | 'global'
  | 'poland'
  | 'germany'
  | 'kazakhstan'
  | 'turkey'
  | 'united-kingdom'
  | 'european-union'
  | 'united-states';

export type LiveExchangeSlug = 'bybit' | 'mexc' | 'okx' | 'bitget' | 'kucoin' | 'bingx';

export interface GeoRankingRow {
  countrySlug: PromoCountrySlug;
  exchangeSlug: LiveExchangeSlug;
  availability: CountryAvailability;
  bonusAvailability: BonusAvailability;
  kycNote: string | null;
  localPaymentNote: string | null;
  restrictionNote: string | null;
  bonusNote: string | null;
  evidenceUrl: string | null;
  evidenceLabel: string | null;
  evidenceDate: string | null;   // e.g. 'June 2026' (from offer.lastChecked)
  confidence: EvidenceConfidence;
  rankingScore: number | null;   // null until enough verified data exists
  rankingReason: string | null;
}

/** Global ranking entry — mirrors the live /promo-codes/ table, canonical data only. */
export interface GlobalPromoRankingEntry {
  rank: number;
  exchangeSlug: LiveExchangeSlug;
  exchangeName: string;
  promoCode: string;
  bonusSnapshot: string;
  reviewUrl: string;   // live /{slug}/ page
  claimUrl: string;    // internal /go/{slug} route — never a raw affiliate URL
  offerStatus: Offer['status'];
  note: string;
}

// ── Supported sets ─────────────────────────────────────────────────────────

export const SUPPORTED_PROMO_COUNTRIES: PromoCountrySlug[] = [
  'global', 'poland', 'germany', 'kazakhstan', 'turkey',
  'united-kingdom', 'european-union', 'united-states',
];

export const LIVE_EXCHANGE_SLUGS: LiveExchangeSlug[] = [
  'bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx',
];

// ISO codes used by offers.ts restrictedCountries, per supported country.
// 'european-union' is deliberately unmapped: EU-wide status cannot be derived
// from a member-state code list — it stays 'unknown' until researched per offer.
const COUNTRY_ISO: Partial<Record<PromoCountrySlug, string[]>> = {
  'poland': ['PL'],
  'germany': ['DE'],
  'kazakhstan': ['KZ'],
  'turkey': ['TR'],
  'united-kingdom': ['UK', 'GB'],
  'united-states': ['US'],
};

const GENERAL_NOTE = 'Availability and bonus terms vary by country and account.';

// ── Global ranking (safe: canonical repo data only) ────────────────────────

function liveExchange(slug: LiveExchangeSlug): Exchange {
  return exchanges.find(ex => ex.slug === slug)!;
}

const globalRanking: GlobalPromoRankingEntry[] = LIVE_EXCHANGE_SLUGS
  .map(slug => ({ ex: liveExchange(slug), offer: getOffer(slug)! }))
  .filter(r => r.ex && r.offer)
  // Same grounded order as the live /promo-codes/ table: verified status first,
  // then canonical catalog order. No invented scores.
  .sort((a, b) => (a.offer.status === 'verified' ? 0 : 1) - (b.offer.status === 'verified' ? 0 : 1))
  .map((r, i) => ({
    rank: i + 1,
    exchangeSlug: r.ex.slug as LiveExchangeSlug,
    exchangeName: r.ex.name,
    promoCode: r.offer.promoCode,
    bonusSnapshot: r.offer.bonusHeadline,
    reviewUrl: r.ex.pageUrl ?? `/${r.ex.slug}/`,
    claimUrl: r.ex.affiliateUrl,
    offerStatus: r.offer.status,
    note: GENERAL_NOTE,
  }));

// ── Country rows (derived, conservative) ───────────────────────────────────

function buildCountryRow(country: PromoCountrySlug, slug: LiveExchangeSlug): GeoRankingRow {
  const offer = getOffer(slug);
  const isoCodes = COUNTRY_ISO[country] ?? [];
  const restrictedHit = !!offer?.restrictedCountries?.some(c => isoCodes.includes(c));
  return {
    countrySlug: country,
    exchangeSlug: slug,
    // Derived: listed in the offer's restrictedCountries → restricted.
    // NOT listed → unknown (absence of a restriction is not proof of availability).
    availability: restrictedHit ? 'restricted' : 'unknown',
    bonusAvailability: restrictedHit ? 'not_available' : 'unknown',
    kycNote: null,
    localPaymentNote: null,
    restrictionNote: restrictedHit
      ? `Listed in the tracked offer's restricted countries (${offer!.lastChecked}).`
      : null,
    bonusNote: null,
    evidenceUrl: restrictedHit ? offer!.sourceUrl : null,
    evidenceLabel: restrictedHit ? 'Offer terms page (tracked offer source)' : null,
    evidenceDate: restrictedHit ? offer!.lastChecked : null,
    confidence: restrictedHit ? 'partial' : 'unknown',
    rankingScore: null,
    rankingReason: null,
  };
}

const countryRows: GeoRankingRow[] = SUPPORTED_PROMO_COUNTRIES
  .filter(c => c !== 'global')
  .flatMap(country => LIVE_EXCHANGE_SLUGS.map(slug => buildCountryRow(country, slug)));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Current safe global ranking — mirrors the live /promo-codes/ table data. */
export function getGlobalPromoRanking(): GlobalPromoRankingEntry[] {
  return globalRanking;
}

/**
 * Country rows for a supported country. Unknown-safe: rows default to
 * 'unknown'/'partial' and carry no ranking scores. NOT for direct rendering
 * as a ranking — check isCountryRankingReady() first.
 */
export function getCountryPromoRanking(countrySlug: string): GeoRankingRow[] {
  if (countrySlug === 'global' || !SUPPORTED_PROMO_COUNTRIES.includes(countrySlug as PromoCountrySlug)) return [];
  return countryRows.filter(r => r.countrySlug === countrySlug);
}

export function getSupportedPromoCountries(): PromoCountrySlug[] {
  return SUPPORTED_PROMO_COUNTRIES;
}

/**
 * A country ranking is publishable only when EVERY live exchange has a
 * verified availability row (no 'unknown' availability, no 'unknown'
 * confidence) and at least 4 exchanges are actually available there.
 * As of v1 this is false for every country — by design.
 */
export function isCountryRankingReady(countrySlug: string): boolean {
  if (countrySlug === 'global') return true;
  const rows = getCountryPromoRanking(countrySlug);
  if (rows.length !== LIVE_EXCHANGE_SLUGS.length) return false;
  const allVerified = rows.every(r => r.availability !== 'unknown' && r.confidence === 'verified');
  const availableCount = rows.filter(r => r.availability === 'available').length;
  return allVerified && availableCount >= 4;
}

// ── TODO: evidence required before any country ranking can go live ─────────
// For EACH country × exchange pair, capture and record:
//   - the exchange's official restricted-countries / terms page (dated capture)
//   - whether the tracked bonus is claimable from that country
//   - KYC and local payment specifics where claimed
// poland / germany / kazakhstan / turkey: no restriction hits derived — ALL
//   rows are 'unknown' and need primary-source research.
// united-kingdom / united-states: derived 'restricted' hits exist (partial
//   confidence) — upgrade with dated captures of official restriction pages.
// european-union: unmapped by design; needs per-offer EU policy research.
// Publishing flow: data → source QA → owner approval → /promo-codes/{country}/.
