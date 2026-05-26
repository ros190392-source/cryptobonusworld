/**
 * CryptoBonusWorld — Affiliate Conversion Utilities
 *
 * Centralised helpers for:
 *  - Contextual CTA label generation (exchange-property-aware)
 *  - GEO-to-affiliate-link mapping (timezone-based, no external API)
 *  - Editorial priority scoring (bonus value vs friction)
 *
 * Pure functions — no side effects, no framework imports.
 * Used by components and pages to generate conversion-optimised copy.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface AffiliateExchange {
  name: string;
  slug: string;
  kycRequired: boolean;
  depositRequired: boolean;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTypes: string[];
  rating: number;
  topChoice?: boolean;
}

// ── Contextual CTA label ─────────────────────────────────────────────────────

/**
 * Generate a contextual CTA label based on the exchange's most compelling
 * differentiator. Uses calm editorial tone — not aggressive affiliate copy.
 *
 * Priority order:
 *  1. No KYC + No Deposit → highlight frictionless access
 *  2. No KYC only → privacy-first angle
 *  3. No Deposit only → low-risk angle
 *  4. Futures bonus → targets active traders
 *  5. Top-rated → highlight quality
 *  6. Default → calm neutral CTA
 */
export function getCtaLabel(ex: AffiliateExchange): string {
  if (!ex.kycRequired && !ex.depositRequired) {
    return `Open ${ex.name} — No KYC or Deposit`;
  }
  if (!ex.kycRequired) {
    return `View ${ex.name} Offer — No KYC`;
  }
  if (!ex.depositRequired) {
    return `View ${ex.name} — No Deposit Required`;
  }
  if (ex.bonusTypes.includes('futures') && ex.bonusAmount >= 5000) {
    return `View ${ex.name} Futures Offer`;
  }
  if (ex.topChoice) {
    return `View ${ex.name} — Editor's Pick`;
  }
  return `View ${ex.name} Offer`;
}

/**
 * Short contextual label for space-constrained placements (table rows, cards).
 * Max ~30 chars. Calm and factual — not aggressive.
 */
export function getCtaLabelShort(ex: AffiliateExchange): string {
  if (!ex.kycRequired && !ex.depositRequired) return 'Open — No KYC';
  if (!ex.kycRequired) return 'View — No KYC';
  if (!ex.depositRequired) return 'No Deposit';
  return 'View Offer';
}

// ── Editorial priority score ──────────────────────────────────────────────────

/**
 * Score an exchange for editorial ranking on listing pages.
 * Higher = show first. Balances bonus value against friction.
 *
 * Factors:
 *  base rating (0–10)             × 2.0 — quality anchor
 *  no-KYC                        + 1.5 — friction reducer
 *  no-deposit                    + 1.0 — friction reducer
 *  topChoice flag                + 2.5 — editorial override
 *  bonus amount (log-scaled)     + up to 1.5 — value signal without dominating
 */
export function editorialScore(ex: AffiliateExchange): number {
  let score = ex.rating * 2.0;
  if (!ex.kycRequired)   score += 1.5;
  if (!ex.depositRequired) score += 1.0;
  if (ex.topChoice)      score += 2.5;
  // Log-scale bonus so 30K doesn't overwhelm 500 USDT by 60×
  score += Math.log10(ex.bonusAmount + 1) * 0.5;
  return score;
}

// ── Bonus expiry urgency copy ─────────────────────────────────────────────────

/**
 * Returns a factual urgency note based on real bonusExpiry data.
 * Returns null if no expiry data — NEVER invents urgency.
 */
export function getBonusExpiryNote(bonusExpiry: { days: number; note?: string } | null | undefined): string | null {
  if (!bonusExpiry || !bonusExpiry.days) return null;
  const days = bonusExpiry.days;
  if (days <= 7)  return `⏰ Bonus tasks must be completed within ${days} days of signup`;
  if (days <= 14) return `⏰ ${days}-day window to complete bonus tasks after registration`;
  return `⏰ Bonus valid for ${days} days — complete tasks within your signup window`;
}

// ── /go/ redirect URL builder ────────────────────────────────────────────────

/**
 * Build a /go/[exchange]/ redirect URL with optional tracking params.
 * Used when you want to route clicks through the analytics redirect page.
 *
 * @param slug        — exchange slug, e.g. 'bybit'
 * @param placement   — where the link is placed, e.g. 'table-featured'
 * @param pageType    — current page type, e.g. 'bonuses'
 * @param comparePair — compare pair if applicable, e.g. 'bybit-vs-mexc'
 * @param rank        — contextual rank from recommendation engine (1-indexed)
 *
 * Note: The /go/ page handles geo-aware routing and fires analytics itself,
 * so you don't need to pass the affiliate URL — it resolves it client-side.
 *
 * For direct linking (affiliateUrl field), keep using CTAButton directly.
 * Use goRedirectUrl() when you want the /go/ page to own the redirect.
 */
export function goRedirectUrl(
  slug: string,
  placement: string,
  pageType?: string,
  comparePair?: string,
  rank?: number,
): string {
  const params = new URLSearchParams();
  params.set('pl', placement);
  if (pageType)    params.set('pt', pageType);
  if (comparePair) params.set('cp', comparePair);
  if (rank != null) params.set('rank', String(rank));
  return `/go/${slug}/?${params.toString()}`;
}

// ── GEO timezone mapping ──────────────────────────────────────────────────────

/**
 * Maps IANA timezone strings to our country geo codes.
 * Used by client-side scripts — no external API calls.
 * Returns the 2-letter geo code matching affiliateLinks.geo keys.
 */
export const TIMEZONE_TO_GEO_CODE: Record<string, string> = {
  // Turkey
  'Europe/Istanbul': 'tr',
  // India
  'Asia/Kolkata':    'in',
  'Asia/Calcutta':   'in',
  // Indonesia
  'Asia/Jakarta':    'id',
  'Asia/Makassar':   'id',
  'Asia/Jayapura':   'id',
  // Nigeria
  'Africa/Lagos':    'ng',
  'Africa/Abuja':    'ng',
  // Brazil
  'America/Sao_Paulo':   'br',
  'America/Fortaleza':   'br',
  'America/Recife':      'br',
  'America/Manaus':      'br',
  'America/Belem':       'br',
  'America/Cuiaba':      'br',
  'America/Porto_Velho': 'br',
  // Vietnam
  'Asia/Ho_Chi_Minh': 'vn',
  'Asia/Saigon':      'vn',
  // Philippines
  'Asia/Manila': 'ph',
};
