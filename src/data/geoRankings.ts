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

// ── Manual, evidence-backed overrides ──────────────────────────────────────
// Every entry here MUST cite an official source URL + date. Evidence captures
// live in reports/evidence/geo/{country}/{date}/{exchange}/ (untracked).
// Sprint 8A (2026-07-02): Poland pack. Regulatory context: the EU MiCA
// transitional period ended 2026-07-01 — only ESMA-registered CASPs may
// lawfully serve EU/EEA clients (incl. Poland) from that date.
const MANUAL_OVERRIDES: Partial<Record<PromoCountrySlug, Partial<Record<LiveExchangeSlug, Partial<GeoRankingRow>>>>> = {
  poland: {
    bybit: {
      availability: 'available',
      bonusAvailability: 'not_available',
      restrictionNote:
        'Served by Bybit EU GmbH (MiCAR license, Austrian FMA, passported incl. Poland). '
        + 'Global bybit.com services are restricted for EEA residents since the MiCA transition '
        + 'ended 2026-07-01 — the tracked global welcome package is not claimable from Poland; '
        + 'Bybit EU bonus terms need separate verification.',
      kycNote: 'KYC required (per tracked offer terms).',
      evidenceUrl: 'https://announcements.bybit.com/en/article/important-notice-for-users-in-the-european-economic-area-eea--blt4135ab861456d7bf/',
      evidenceLabel: 'Official Bybit EEA restriction announcement (capture blocked — see evidence BLOCKER.md)',
      evidenceDate: '2026-07-02',
      confidence: 'partial', // official pages identified but automated capture was blocked
    },
    mexc: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Poland is NOT in the official prohibited-jurisdictions list (mexc.com/terms, captured '
        + '2026-07-02). However, MEXC holds no MiCA CASP authorisation — after 2026-07-01 '
        + 'unlicensed providers may not lawfully serve EU/EEA clients. Practical status unclear.',
      evidenceUrl: 'https://www.mexc.com/terms',
      evidenceLabel: 'MEXC User Agreement — prohibited jurisdictions (dated capture on file)',
      evidenceDate: '2026-07-02',
      confidence: 'partial',
    },
    okx: {
      availability: 'available',
      bonusAvailability: 'unknown',
      restrictionNote:
        'OKX Europe Limited holds a MiCA CASP license (Malta MFSA, 2025-01-27), passported '
        + 'across all 30 EEA states including Poland.',
      bonusNote: 'Tracked bonus was verified on the global platform; OKX EU bonus terms need separate verification.',
      kycNote: 'KYC required (per tracked offer terms).',
      evidenceUrl: 'https://www.okx.com/en-eu/learn/unregulated-crypto-exchanges-mica-july-2026',
      evidenceLabel: 'OKX Europe official MiCA page (dated capture on file)',
      evidenceDate: '2026-07-02',
      confidence: 'verified',
    },
    bitget: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Bitget holds no MiCA CASP authorisation (not in ESMA register as of 2026-07-02); '
        + 'Bitget EU filed a MiCAR application with the Austrian FMA (announced 2026-06-17). '
        + 'Bitget\'s own regulatory roadmap page lists no EU license. Post-deadline status unclear.',
      evidenceUrl: 'https://www.bitget.com/promotion/regulatory-license',
      evidenceLabel: 'Bitget official regulatory roadmap (dated capture on file)',
      evidenceDate: '2026-07-02',
      confidence: 'partial',
    },
    kucoin: {
      availability: 'available',
      bonusAvailability: 'not_available',
      restrictionNote:
        'KuCoin EU Exchange GmbH holds a MiCAR license (Austrian FMA, 2025-11-28), passported '
        + 'across 29 EEA states incl. Poland (excl. Malta). Official announcement: "EEA users may '
        + 'no longer register or onboard on KuCoin Global\'s platform" — the tracked global '
        + 'referral offer is not claimable from Poland; KuCoin EU bonus terms need verification.',
      kycNote: 'KuCoin EU operates under MiCAR requirements; global no-KYC base tier does not apply.',
      evidenceUrl: 'https://www.kucoin.com/blog/en-kucoin-secures-landmark-micar-license-expanding-regulated-digital-asset-services-across-europe',
      evidenceLabel: 'KuCoin official MiCAR license announcement (dated capture on file)',
      evidenceDate: '2026-07-02',
      confidence: 'verified',
    },
    bingx: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'BingX holds no MiCA CASP authorisation (not in ESMA register as of 2026-07-02; '
        + 'register-tracker capture on file). After 2026-07-01 unlicensed providers may not '
        + 'lawfully serve EU/EEA clients. BingX has published no Poland/EU exit or entity plan.',
      evidenceUrl: 'https://casptracker.eu/exchange/bingx/',
      evidenceLabel: 'ESMA-register tracker: BingX CASP status (supporting source; dated capture on file)',
      evidenceDate: '2026-07-02',
      confidence: 'partial',
    },
  },
  // Sprint 8B (2026-07-03): Kazakhstan pack. Kazakhstan has no EU-style blanket
  // licensing mandate — the AFSA/AIFC regime (Astana International Financial Centre)
  // is a voluntary local-entity license, not a requirement to serve the country.
  // So absence from an exchange's own prohibited-jurisdictions list is treated as
  // a partial positive signal here, unlike the Poland/MiCA pack — but it still does
  // NOT get promoted to 'available' without a dedicated confirmation (do-not-invent
  // rule 3). Evidence: reports/evidence/geo/kazakhstan/2026-07-03/.
  kazakhstan: {
    bybit: {
      availability: 'available',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Bybit Limited holds an active AFSA (Astana Financial Services Authority) license '
        + '(AFSA-A-LA-2024-0027, issued 2024-09-25), confirmed directly on the AFSA public '
        + 'register, covering digital asset trading, custody, and investment dealing/management. '
        + 'Bybit Kazakhstan launched the country\'s first regulated P2P platform in Nov 2025 '
        + '(reported KZT limits: 2.5M/transaction, 5M/day). Kazakhstan is not on Bybit\'s global '
        + '14-jurisdiction exclusion list, so this is not a forced-migration case like Poland/MiCA.',
      bonusNote:
        'No evidence found confirming whether the tracked global welcome package (claimed via '
        + 'global bybit.com through our /go/bybit link) is available to Kazakhstan-registered '
        + 'users, or whether KZ users are directed to the separately licensed Bybit Kazakhstan '
        + 'product with different terms. Needs dedicated verification before claiming.',
      kycNote: 'KYC required (per tracked offer terms); AFSA-regulated entity implies formal KYC for the licensed local product.',
      evidenceUrl: 'https://publicreg.myafsa.com/licence_details/AFSA-A-LA-2024-0027/',
      evidenceLabel: 'AFSA (Kazakhstan regulator) public register — Bybit Limited license, Active (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'verified',
    },
    mexc: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Kazakhstan is absent from MEXC\'s official prohibited-jurisdictions list '
        + '(mexc.com/terms, captured 2026-07-03). No dedicated Kazakhstan support page, KZT '
        + 'currency page, or AFSA/AIFC license found. Not-prohibited is a partial positive '
        + 'signal (Kazakhstan has no EU-style blanket licensing mandate) but not a confirmation.',
      evidenceUrl: 'https://www.mexc.com/terms',
      evidenceLabel: 'MEXC User Agreement — prohibited jurisdictions (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'partial',
    },
    okx: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Kazakhstan is absent from OKX\'s Risk & Compliance Disclosure restricted-locations '
        + 'list (Section 3, captured 2026-07-03). No dedicated Kazakhstan support page, KZT '
        + 'currency page, or AFSA/AIFC license found. Not-restricted is a partial positive '
        + 'signal but not a confirmation.',
      evidenceUrl: 'https://www.okx.com/en-us/help/risk-compliance-disclosure',
      evidenceLabel: 'OKX Risk & Compliance Disclosure, Section 3 (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'partial',
    },
    bitget: {
      availability: 'restricted',
      bonusAvailability: 'not_available',
      restrictionNote:
        'Kazakhstan is explicitly named in Bitget\'s own Terms of Use "Prohibited Countries" '
        + 'definition (captured 2026-07-03). Third-party P2P trackers show live Bitget P2P KZT '
        + 'order flow, but that is unverified user-market activity and does not override '
        + 'Bitget\'s own legal terms.',
      kycNote: 'Not applicable — service is prohibited per official terms.',
      evidenceUrl: 'https://www.bitget.com/support/articles/360014944032-terms-of-use',
      evidenceLabel: 'Bitget Terms of Use — Prohibited Countries (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'verified',
    },
    kucoin: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Kazakhstan is absent from KuCoin\'s Terms of Use Restricted Locations list '
        + '(Article 17(5), captured 2026-07-03). No dedicated Kazakhstan support page, KZT '
        + 'currency page, or AFSA/AIFC license found. Not-restricted is a partial positive '
        + 'signal but not a confirmation.',
      evidenceUrl: 'https://www.kucoin.com/legal/terms-of-use',
      evidenceLabel: 'KuCoin Terms of Use, Article 17(5) — Restricted Locations (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'partial',
    },
    bingx: {
      availability: 'unknown',
      bonusAvailability: 'unknown',
      restrictionNote:
        'Kazakhstan is absent from BingX\'s official Disclaimer restricted-jurisdictions list '
        + '(captured 2026-07-03). No dedicated Kazakhstan support page, KZT currency page, or '
        + 'AFSA/AIFC license found. Not-restricted is a partial positive signal but not a '
        + 'confirmation.',
      evidenceUrl: 'https://bingx.com/en/support/articles/360034028153-Disclaimer',
      evidenceLabel: 'BingX Disclaimer — restricted jurisdictions (dated capture on file)',
      evidenceDate: '2026-07-03',
      confidence: 'partial',
    },
  },
};

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
  const override = MANUAL_OVERRIDES[country]?.[slug];
  const derived: GeoRankingRow = {
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
  // Evidence-backed manual overrides win over derived defaults.
  return override ? { ...derived, ...override } : derived;
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
// poland: researched 2026-07-02 (Sprint 8A) — see MANUAL_OVERRIDES above and
//   reports/evidence/geo/poland/2026-07-02/. Still NOT ranking-ready: only 2
//   of 6 rows are 'verified', bonus terms on the EU entities (Bybit EU,
//   KuCoin EU, OKX EU) are unverified, and Bybit's official pages blocked
//   automated capture (manual browser capture needed).
// kazakhstan: researched 2026-07-03 (Sprint 8B) — see MANUAL_OVERRIDES above and
//   reports/evidence/geo/kazakhstan/2026-07-03/. Still NOT ranking-ready: 2 of 6 rows
//   are 'verified' (bybit available via AFSA license, bitget restricted per own ToS),
//   4 remain 'unknown' (not-prohibited is only a partial signal, not confirmation).
//   Bybit's tracked global bonus availability is itself unverified — the AFSA-licensed
//   local entity may or may not share the global welcome package.
// germany / turkey: no restriction hits derived — ALL rows are 'unknown' and need
//   primary-source research (MiCA findings for Poland largely transfer to Germany/EU
//   but must be re-verified per country).
// united-kingdom / united-states: derived 'restricted' hits exist (partial
//   confidence) — upgrade with dated captures of official restriction pages.
// european-union: unmapped by design; needs per-offer EU policy research.
// Publishing flow: data → source QA → owner approval → /promo-codes/{country}/.
