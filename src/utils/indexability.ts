/**
 * CryptoBonusWorld — Indexability Audit Utilities
 *
 * Centralises the logic that determines whether a page should be indexed,
 * and provides a runtime-safe crawl audit map for debugging and monitoring.
 *
 * Usage in Astro frontmatter:
 *   import { getRobotsDirective, isIndexable } from '../../utils/indexability';
 *
 *   const robots = getRobotsDirective({ exchangeCount: ranked.length });
 *   // → "noindex, nofollow" | undefined
 *
 *   const indexable = isIndexable(robots);
 *   // → false | true
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type RobotsDirective =
  | 'noindex, nofollow'
  | 'noindex, follow'
  | 'index, nofollow'
  | 'noarchive'
  | string
  | undefined;

export interface IndexabilityOptions {
  /** Number of ranked/available exchanges on this page */
  exchangeCount?: number;
  /** Minimum exchanges required for the page to be considered content-rich */
  minExchanges?: number;
  /** True if this page has been explicitly designated as a utility/redirect page */
  isUtility?: boolean;
  /** True if this page is a framework page pending content differentiation */
  isFramework?: boolean;
}

// ── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Determine the correct robots meta directive for a programmatic page.
 *
 * Decision tree:
 *  1. Utility/redirect pages (go/, contact/) → "noindex, nofollow"
 *  2. Framework pages (best-exchanges-for/) → "noindex, follow"
 *  3. Zero-result content pages → "noindex, nofollow" (thin content guard)
 *  4. Below minimum exchange threshold → "noindex, follow" (soft block)
 *  5. Otherwise → undefined (default: index, follow)
 */
export function getRobotsDirective(opts: IndexabilityOptions = {}): RobotsDirective {
  const {
    exchangeCount,
    minExchanges = 1,
    isUtility = false,
    isFramework = false,
  } = opts;

  if (isUtility) return 'noindex, nofollow';
  if (isFramework) return 'noindex, follow';

  if (exchangeCount !== undefined) {
    if (exchangeCount === 0) return 'noindex, nofollow';
    if (exchangeCount < minExchanges) return 'noindex, follow';
  }

  return undefined; // Default: index, follow
}

/**
 * Returns true if the given robots directive allows indexation.
 * undefined means no robots tag → default index, follow → true.
 */
export function isIndexable(directive: RobotsDirective): boolean {
  if (!directive) return true;
  return !directive.toLowerCase().includes('noindex');
}

// ── Site-wide indexability map ───────────────────────────────────────────────
//
// This map documents the INTENDED indexability state of each page type.
// Used for auditing, monitoring and developer documentation.
// Keep in sync with actual page implementations.
//
// Format: { route: { indexable, robots, note } }

export interface IndexabilityRecord {
  indexable: boolean;
  robots: RobotsDirective;
  inSitemap: boolean;
  note: string;
}

export const INDEXABILITY_MAP: Record<string, IndexabilityRecord> = {
  // ── Core content pages ───────────────────────────────────────────────────
  '/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Homepage — highest priority, daily crawl',
  },
  '/exchanges/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Exchange hub — weekly crawl',
  },
  '/exchanges/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Exchange review pages — core money pages',
  },
  '/bonuses/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Bonus hub — daily crawl, highest non-home priority',
  },
  '/bonuses/[slug]-bonus/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Bonus landing pages — transactional intent',
  },
  '/compare/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Compare hub',
  },
  '/compare/[pair]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Compare pair pages — one-directional, no reverse duplicates',
  },
  '/categories/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Bonus category pages — filtered listing',
  },
  '/countries/[slug]/': {
    indexable: true,
    robots: 'noindex, nofollow (when 0 exchanges)', // conditional
    inSitemap: true,
    note: 'Country pages — noindex guard if 0 available exchanges',
  },
  '/use-cases/[slug]/': {
    indexable: true,
    robots: 'noindex, nofollow (when 0 exchanges)', // conditional
    inSitemap: true,
    note: 'Use-case pages — noindex guard if ranking returns 0 exchanges',
  },
  '/coins/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Coin pages — all coins supported by at least 1 exchange',
  },
  '/bonus-codes/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Bonus code pages — high transactional intent',
  },
  '/guides/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Guide pages — editorial content',
  },

  // ── Programmatic framework (pending differentiation) ────────────────────
  '/best-exchanges-for/[slug]/': {
    indexable: false,
    robots: 'noindex, follow',
    inSitemap: false,
    note: 'Framework pages — noindex until content is differentiated from /use-cases/. ' +
          'Remove robots directive + add to sitemap when ready to launch.',
  },

  // ── Trust / E-E-A-T pages ────────────────────────────────────────────────
  '/about/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'About page — Organization schema, E-E-A-T signal',
  },
  '/editorial-policy/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Editorial policy — Article schema, E-E-A-T signal',
  },
  '/methodology/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Methodology page — trust signal',
  },
  '/update-policy/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Update policy — demonstrates content freshness commitment',
  },
  '/reviewers/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Reviewers hub — E-E-A-T signal, author authority',
  },
  '/reviewers/[slug]/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Individual reviewer pages — Person schema opportunity',
  },

  // ── Legal pages ──────────────────────────────────────────────────────────
  '/affiliate-disclosure/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Affiliate disclosure — transparency signal, keep indexed',
  },
  '/disclaimer/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Disclaimer — legal/trust page, keep indexed',
  },
  '/privacy-policy/': {
    indexable: true,
    robots: undefined,
    inSitemap: true,
    note: 'Privacy policy — legal requirement, keep indexed',
  },

  // ── Utility pages (noindexed) ────────────────────────────────────────────
  '/contact/': {
    indexable: false,
    robots: 'noindex, nofollow',
    inSitemap: false,
    note: 'Contact page — utility only, no search value. Intentionally noindexed + excluded from sitemap.',
  },
  '/go/[exchange]/': {
    indexable: false,
    robots: 'noindex, nofollow',
    inSitemap: false,
    note: 'Affiliate redirect pages — utility only. noindex hardcoded in HTML (does not use Layout).',
  },
};

// ── Canonical chain documentation ───────────────────────────────────────────
//
// Documents intended canonical relationships.
// No circular chains exist — all canonicals point to the definitive URL.

export const CANONICAL_CHAINS: Array<{
  from: string;
  to: string;
  reason: string;
}> = [
  {
    from: '/go/[exchange]/',
    to: '/exchanges/[exchange]/',
    reason: 'Affiliate redirect page — canonical points to authoritative exchange review',
  },
  {
    from: '/best-exchanges-for/[slug]/',
    to: 'self (/best-exchanges-for/[slug]/)',
    reason: 'Framework page with self-canonical — ready for future indexation without re-canonicalization',
  },
  // All other pages are self-canonical (canonical = own URL)
];

// ── Duplicate cluster risk map ───────────────────────────────────────────────
//
// Near-duplicate URL pairs and their mitigation status.

export const DUPLICATE_RISK_MAP: Array<{
  urlA: string;
  urlB: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  mitigation: string;
}> = [
  {
    urlA: '/exchanges/[slug]/',
    urlB: '/bonuses/[slug]-bonus/',
    riskLevel: 'low',
    mitigation: 'Different content focus (full review vs. bonus-only). Separate canonicals. ' +
                'Both indexed intentionally — they target different query intents.',
  },
  {
    urlA: '/use-cases/[slug]/',
    urlB: '/best-exchanges-for/[slug]/',
    riskLevel: 'low',
    mitigation: 'best-exchanges-for/ is noindexed (robots="noindex, follow"). ' +
                'Self-canonical — no link equity conflict. Promote to indexed when differentiated.',
  },
  {
    urlA: '/categories/[slug]/',
    urlB: '/bonuses/ (filtered)',
    riskLevel: 'none',
    mitigation: 'Category pages are distinct URLs. FilterPanel creates query params but ' +
                'canonical always points to the unfiltered base URL.',
  },
  {
    urlA: '/compare/bybit-vs-okx/',
    urlB: '/compare/okx-vs-bybit/ (does not exist)',
    riskLevel: 'none',
    mitigation: 'Compare pairs are unidirectional — only one URL exists per pair. ' +
                'No reverse-direction duplicates in compare-pairs.json.',
  },
];
