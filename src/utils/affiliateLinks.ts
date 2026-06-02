/**
 * affiliateLinks.ts — Affiliate Link Helper Functions
 *
 * All outbound URL decisions go through this module.
 * Data source: src/data/affiliate-links.ts (canonical registry)
 *
 * Usage:
 *   import { getExchangeOutboundUrl, shouldShowPromoCode } from '../utils/affiliateLinks';
 */

import { AFFILIATE_LINKS_MAP, type AffiliateEntry, type GeoRegion } from '../data/affiliate-links';

// ── Options ───────────────────────────────────────────────────────────────────

export interface OutboundUrlOptions {
  /**
   * Geo region code — returns a geo-specific affiliate URL when available.
   * Falls through to GLOBAL → primary → clean if no geo-specific URL set.
   */
  geo?: GeoRegion | string;
  /**
   * When true, forces the clean (non-affiliate) URL regardless of partnerStatus.
   * Used for editorial/review contexts where you want a non-sponsored link.
   */
  forceClean?: boolean;
}

export interface ValidationResult {
  slug: string;
  ok: boolean;
  issues: string[];
  warnings: string[];
}

// ── Core lookup ───────────────────────────────────────────────────────────────

function getEntry(slug: string): AffiliateEntry | undefined {
  return AFFILIATE_LINKS_MAP.get(slug);
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Primary entry point — returns the best outbound URL for a given exchange.
 *
 * Resolution order for `full` partners:
 *   1. geo-specific link (if geo provided and mapped)
 *   2. affiliateWithCode (if primaryLinkType === affiliate_with_code)
 *   3. affiliate (if primaryLinkType === affiliate)
 *   4. clean (fallback)
 *
 * For `limited` / `pending` partners: always returns clean/fallback URL.
 * For `disabled` partners: returns '#' (caller must check and suppress CTA).
 */
export function getExchangeOutboundUrl(slug: string, opts: OutboundUrlOptions = {}): string {
  const entry = getEntry(slug);
  if (!entry) return '#';

  if (entry.partnerStatus === 'disabled') return '#';

  // limited/pending always get clean link
  if (entry.partnerStatus === 'limited' || entry.partnerStatus === 'pending' || opts.forceClean) {
    return entry.links.fallback ?? entry.links.clean;
  }

  // full partner: geo override first
  if (opts.geo && opts.geo !== 'unknown' && entry.geoLinks) {
    const geoUrl = entry.geoLinks[opts.geo as GeoRegion];
    if (geoUrl && geoUrl !== '#') return geoUrl;
  }

  // affiliate_with_code → affiliateWithCode URL
  if (entry.primaryLinkType === 'affiliate_with_code' && entry.links.affiliateWithCode) {
    return entry.links.affiliateWithCode;
  }

  // affiliate → affiliate URL
  if (entry.primaryLinkType === 'affiliate' && entry.links.affiliate) {
    return entry.links.affiliate;
  }

  // clean_with_ref_param — return clean + append code if available
  if (entry.primaryLinkType === 'clean_with_ref_param') {
    const code = entry.promoCode ?? entry.refCode;
    if (code && entry.appendRules.canAppendPromoCode && entry.appendRules.promoParamNames.length > 0) {
      try {
        const url = new URL(entry.links.clean);
        url.searchParams.set(entry.appendRules.promoParamNames[0], code);
        return url.toString();
      } catch {
        return entry.links.clean;
      }
    }
    return entry.links.clean;
  }

  // clean
  return entry.links.fallback ?? entry.links.clean;
}

/**
 * Returns the plain exchange homepage URL — no tracking, no referral params.
 * Use for editorial context, disclaimer links, or limited partners.
 */
export function getExchangeCleanUrl(slug: string): string {
  return getEntry(slug)?.links.clean ?? '#';
}

/**
 * Returns the affiliate URL (with or without code depending on primaryLinkType).
 * Returns clean URL for limited/pending/disabled partners.
 */
export function getExchangeAffiliateUrl(slug: string): string {
  const entry = getEntry(slug);
  if (!entry) return '#';
  if (entry.partnerStatus !== 'full') return entry.links.fallback ?? entry.links.clean;
  return entry.links.affiliateWithCode ?? entry.links.affiliate ?? entry.links.clean;
}

/**
 * Whether a promo code box should be displayed for this exchange.
 * False when: no promoCode, limited/pending/disabled partner, or
 * code is embedded in URL and cannot be entered separately.
 */
export function shouldShowPromoCode(slug: string): boolean {
  const entry = getEntry(slug);
  if (!entry) return false;
  if (entry.partnerStatus !== 'full') return false;
  return typeof entry.promoCode === 'string' && entry.promoCode.length > 0;
}

/**
 * Returns the promo code string or null.
 */
export function getPromoCode(slug: string): string | null {
  const entry = getEntry(slug);
  if (!entry || entry.partnerStatus !== 'full') return null;
  return entry.promoCode;
}

/**
 * Whether the primary outbound URL for this exchange contains
 * referral/tracking parameters (i.e. is not a clean URL).
 */
export function hasReferralTracking(slug: string): boolean {
  const entry = getEntry(slug);
  if (!entry) return false;
  if (entry.partnerStatus !== 'full') return false;
  return (
    entry.primaryLinkType === 'affiliate' ||
    entry.primaryLinkType === 'affiliate_with_code' ||
    (entry.primaryLinkType === 'clean_with_ref_param' && (entry.appendRules.canAppendPromoCode || entry.appendRules.canAppendRefCode))
  );
}

/**
 * Returns the partner status for a given exchange slug.
 * Defaults to 'full' for unknown slugs (backwards-compatible behaviour).
 */
export function getPartnerStatus(slug: string): AffiliateEntry['partnerStatus'] {
  return getEntry(slug)?.partnerStatus ?? 'full';
}

/**
 * Whether bonus CTAs (Claim/View Offer) should be shown for this exchange.
 * Hidden for limited, pending, and disabled partners.
 */
export function showBonusCta(slug: string): boolean {
  return getPartnerStatus(slug) === 'full';
}

/**
 * The `rel` attribute string appropriate for a link to this exchange.
 * Full partners: includes `sponsored` (paid affiliate).
 * Others: omits `sponsored`.
 */
export function getLinkRel(slug: string): string {
  return getPartnerStatus(slug) === 'full'
    ? 'noopener noreferrer nofollow sponsored'
    : 'noopener noreferrer nofollow';
}

/**
 * Neutral CTA label for limited/pending partners.
 * Full partners should use getCtaLabel() from affiliateUtils.ts.
 */
export function getNeutralCtaLabel(slug: string): string {
  const entry = getEntry(slug);
  return entry ? `Visit ${entry.name} →` : 'Visit exchange →';
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a single registry entry for common issues.
 * Used by the audit script.
 */
export function validateAffiliateLink(slug: string): ValidationResult {
  const result: ValidationResult = { slug, ok: true, issues: [], warnings: [] };
  const entry = getEntry(slug);

  if (!entry) {
    result.ok = false;
    result.issues.push(`No entry found for slug "${slug}"`);
    return result;
  }

  const fail = (msg: string) => { result.ok = false; result.issues.push(msg); };
  const warn = (msg: string) => { result.warnings.push(msg); };

  function isValidUrl(url: string): boolean {
    try { return /^https?:\/\//.test(new URL(url).href); } catch { return false; }
  }

  // clean URL must always be present and valid
  if (!entry.links.clean || !isValidUrl(entry.links.clean)) {
    fail(`links.clean is missing or invalid: "${entry.links.clean}"`);
  }

  // clean URL must not contain tracking params
  try {
    const u = new URL(entry.links.clean);
    const suspiciousParams = ['ref', 'invite', 'code', 'shareCode', 'inviteCode', 'referral', 'promo', 'aff', 'partner'];
    for (const p of suspiciousParams) {
      if (u.searchParams.has(p)) {
        fail(`links.clean contains tracking param "${p}": ${entry.links.clean}`);
      }
    }
    if (/\/join\/|\/share\/|\/invite\/|\/partner\/|\/b\/|\/bg\//.test(u.pathname)) {
      warn(`links.clean pathname looks like a referral path: ${entry.links.clean}`);
    }
  } catch { /* already caught above */ }

  // full partners must have an affiliate URL
  if (entry.partnerStatus === 'full') {
    const hasAffiliate = !!(entry.links.affiliateWithCode || entry.links.affiliate);
    if (!hasAffiliate && entry.primaryLinkType !== 'clean' && entry.primaryLinkType !== 'clean_with_ref_param') {
      fail(`Full partner "${slug}" has no affiliate URL (affiliateWithCode or affiliate)`);
    }
    if (entry.links.affiliateWithCode && !isValidUrl(entry.links.affiliateWithCode)) {
      fail(`links.affiliateWithCode is not a valid URL: "${entry.links.affiliateWithCode}"`);
    }
    if (entry.links.affiliate && !isValidUrl(entry.links.affiliate)) {
      fail(`links.affiliate is not a valid URL: "${entry.links.affiliate}"`);
    }
  }

  // limited partners must use clean links only
  if (entry.partnerStatus === 'limited') {
    if (entry.promoCode) fail(`Limited partner "${slug}" should not have a promoCode`);
    if (entry.refCode)   fail(`Limited partner "${slug}" should not have a refCode`);
    const outbound = getExchangeOutboundUrl(slug);
    if (outbound !== entry.links.clean && outbound !== entry.links.fallback) {
      fail(`Limited partner "${slug}" outbound URL is not clean: ${outbound}`);
    }
    // Validate no referral params in the resolved URL
    try {
      const u = new URL(outbound);
      if (u.searchParams.toString() !== '') {
        fail(`Limited partner "${slug}" clean URL has query params: ${outbound}`);
      }
    } catch { /* skip */ }
  }

  // promoCode consistency with affiliateWithCode
  if (entry.promoCode && entry.links.affiliateWithCode) {
    if (!entry.links.affiliateWithCode.includes(entry.promoCode) &&
        !entry.links.affiliateWithCode.toLowerCase().includes(entry.promoCode.toLowerCase())) {
      warn(`promoCode "${entry.promoCode}" not found in affiliateWithCode URL — verify it's still active`);
    }
  }

  // no '#' placeholders in active full-partner links
  if (entry.partnerStatus === 'full') {
    for (const [key, val] of Object.entries(entry.links)) {
      if (val === '#') fail(`Placeholder "#" in links.${key} for full partner "${slug}"`);
    }
  }

  return result;
}

/**
 * Validate all entries in the registry and return results.
 */
export function validateAllAffiliateLinks(): ValidationResult[] {
  const { AFFILIATE_LINKS } = require('../data/affiliate-links') as typeof import('../data/affiliate-links');
  return AFFILIATE_LINKS.map(e => validateAffiliateLink(e.slug));
}
