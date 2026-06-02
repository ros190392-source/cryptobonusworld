/**
 * Internal Link Graph Utilities
 * ================================
 * Hub-and-spoke linking architecture for CryptoBonusWorld.
 *
 * Link hierarchy:
 *
 *   HUBs (highest authority pages):
 *     /                   — Homepage
 *     /bonuses/           — All bonuses hub
 *     /exchanges/         — Exchange directory hub
 *
 *   SPOKES (mid-tier):
 *     /exchanges/[slug]/  — Exchange reviews
 *     /categories/[slug]/ — Bonus categories
 *     /countries/[slug]/  — Country pages
 *     /compare/[pair]/    — Compare pages
 *     /use-cases/[slug]/  — Use-case pages
 *     /coins/[slug]/      — Coin pages
 *
 *   LEAF nodes:
 *     /guides/[slug]/     — Guides
 *     /bonus-codes/[slug]/— Bonus code pages
 *     /bonuses/[slug]-bonus/ — Exchange bonus landing pages
 *
 * Hub → Spoke: hubs link to all relevant spokes
 * Spoke → Hub: spokes link back to parent hub(s)
 * Spoke → Spoke: contextually relevant cross-links
 * Leaf → Spoke: every leaf links to at least one spoke
 *
 * Anchor text diversity rules:
 *  - Avoid exact-match repetition: rotate between brand name, bonus amount, feature
 *  - Max 2 same-anchor links per page
 *  - Use semantic variations (see getAnchorVariants)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface InternalLink {
  href: string;
  anchor: string;
  rel?: string;
}

export interface HubSpoke {
  hub: string;   // Hub page URL (relative)
  spoke: string; // Spoke page URL (relative)
  anchor: string;
}

// ── Hub pages ────────────────────────────────────────────────────────────────

export const HUB_PAGES = [
  { url: '/',            label: 'Best Crypto Exchange Bonuses' },
  { url: '/bonuses/',    label: 'All Crypto Exchange Bonuses' },
  { url: '/exchanges/',  label: 'Crypto Exchange Directory' },
  { url: '/compare/',    label: 'Compare Crypto Exchanges' },
  { url: '/guides/',     label: 'Crypto Bonus Guides' },
];

// ── Anchor text variants (prevents exact-match spam) ─────────────────────────

const EXCHANGE_ANCHOR_VARIANTS: Record<string, string[]> = {
  bybit:    ['Bybit', 'Bybit bonus', 'Bybit welcome package', 'Bybit 30,000 USDT offer', 'Bybit review'],
  mexc:     ['MEXC', 'MEXC bonus', 'MEXC no-KYC offer', 'MEXC signup reward', 'MEXC review'],
  okx:      ['OKX', 'OKX bonus', 'OKX welcome package', 'OKX review'],
  binance:  ['Binance', 'Binance bonus', 'Binance referral reward', 'Binance review'],
  bitget:   ['Bitget', 'Bitget bonus', 'Bitget copy trading offer', 'Bitget review'],
  bingx:    ['BingX', 'BingX bonus', 'BingX grid trading offer', 'BingX review'],
  kucoin:   ['KuCoin', 'KuCoin bonus', 'KuCoin no-KYC offer', 'KuCoin review'],
  'gate-io':['Gate.io', 'Gate.io bonus', 'Gate.io altcoin exchange', 'Gate.io review'],
  htx:      ['HTX', 'HTX bonus', 'HTX P2P trading', 'HTX review'],
  coinex:   ['CoinEx', 'CoinEx bonus', 'CoinEx no-KYC exchange', 'CoinEx review'],
  phemex:   ['Phemex', 'Phemex bonus', 'Phemex futures offer', 'Phemex review'],
  bitunix:  ['Bitunix', 'Bitunix bonus', 'Bitunix no-KYC offer', 'Bitunix review'],
  lbank:    ['LBank', 'LBank bonus', 'LBank review'],
};

/**
 * Get a diverse set of anchor text variants for an exchange.
 * Caller should rotate through variants to avoid exact-match repetition.
 */
export function getExchangeAnchorVariants(slug: string): string[] {
  return EXCHANGE_ANCHOR_VARIANTS[slug] ?? [slug];
}

/**
 * Pick an anchor variant for a given position.
 * Uses modulo to cycle through variants without random (SSG-safe).
 */
export function pickAnchor(slug: string, position: number): string {
  const variants = getExchangeAnchorVariants(slug);
  return variants[position % variants.length];
}

// ── Hub → Spoke link builders ─────────────────────────────────────────────────

/**
 * Get exchange page links for a hub page.
 * Returns up to `count` links, sorted by rating.
 */
export function getExchangeHubLinks(
  exchanges: Array<{ slug: string; name: string; rating: number }>,
  count = 6
): InternalLink[] {
  return [...exchanges]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
    .map((ex, i) => ({
      href: `/exchanges/${ex.slug}/`,
      anchor: pickAnchor(ex.slug, i),
    }));
}

/**
 * Get coin page links for a hub.
 */
export function getCoinHubLinks(): InternalLink[] {
  return [
    { href: '/coins/bitcoin/', anchor: 'Buy Bitcoin (BTC) with bonus' },
    { href: '/coins/usdt/', anchor: 'Buy USDT cheaply' },
    { href: '/coins/ethereum/', anchor: 'Buy Ethereum (ETH)' },
    { href: '/coins/solana/', anchor: 'Buy Solana (SOL)' },
    { href: '/coins/bnb/', anchor: 'Buy BNB' },
  ];
}

/**
 * Get use-case page links for a hub.
 */
export function getUseCaseHubLinks(): InternalLink[] {
  return [
    { href: '/use-cases/beginners/', anchor: 'Best exchanges for beginners' },
    { href: '/use-cases/no-kyc/', anchor: 'Best no-KYC exchanges' },
    { href: '/use-cases/futures/', anchor: 'Best exchanges for futures trading' },
    { href: '/use-cases/copy-trading/', anchor: 'Best copy trading platforms' },
    { href: '/use-cases/altcoins/', anchor: 'Best exchanges for altcoins' },
    { href: '/use-cases/p2p/', anchor: 'Best P2P crypto exchanges' },
    { href: '/use-cases/low-fees/', anchor: 'Lowest fee crypto exchanges' },
    { href: '/use-cases/scalping/', anchor: 'Best exchanges for scalping' },
  ];
}

// ── Spoke → Hub link builders ─────────────────────────────────────────────────

/**
 * Get the parent hub links for a given page type.
 * Every spoke/leaf page should include at least one of these.
 */
export function getParentHubLinks(
  pageType: 'exchange' | 'category' | 'country' | 'compare' | 'guide' | 'coin' | 'use-case' | 'bonus-code'
): InternalLink[] {
  const base: InternalLink[] = [
    { href: '/', anchor: 'crypto exchange bonuses' },
    { href: '/bonuses/', anchor: 'compare all bonuses' },
  ];

  if (pageType === 'exchange' || pageType === 'compare') {
    base.push({ href: '/exchanges/', anchor: 'crypto exchange directory' });
  }
  if (pageType === 'coin') {
    base.push({ href: '/coins/', anchor: 'buy crypto by coin' });
    base.push({ href: '/bonuses/', anchor: 'compare all exchange bonuses' });
  }
  if (pageType === 'use-case') {
    base.push({ href: '/use-cases/', anchor: 'find exchange by use case' });
  }
  if (pageType === 'bonus-code') {
    base.push({ href: '/bonus-codes/', anchor: 'all bonus codes' });
  }
  if (pageType === 'guide') {
    base.push({ href: '/guides/', anchor: 'crypto bonus guides' });
  }

  return base;
}

// ── Spoke → Spoke link builders ───────────────────────────────────────────────

/**
 * Get compare page links relevant to an exchange.
 * Returns pairs where the exchange is one of the two compared.
 */
export function getRelatedComparePairsForExchange(
  exchangeSlug: string,
  comparePairs: Array<{ pair: string; a: string; b: string; label: string }>,
  count = 3
): InternalLink[] {
  return comparePairs
    .filter(p => p.a === exchangeSlug || p.b === exchangeSlug)
    .slice(0, count)
    .map(p => ({
      href: `/compare/${p.pair}/`,
      anchor: p.label,
    }));
}

/**
 * Get coin pages relevant to an exchange based on its features.
 * Exchanges with spot trading link to coin pages.
 */
export function getCoinLinksForExchange(
  featureBadges: string[]
): InternalLink[] {
  const hasSpot = featureBadges.includes('spot');
  const hasFutures = featureBadges.includes('futures');
  const links: InternalLink[] = [];

  if (hasSpot || hasFutures) {
    links.push({ href: '/coins/bitcoin/', anchor: 'buy Bitcoin with bonus' });
    links.push({ href: '/coins/usdt/', anchor: 'buy USDT on this exchange' });
    links.push({ href: '/coins/ethereum/', anchor: 'buy Ethereum (ETH)' });
  }

  return links.slice(0, 2); // max 2 coin links per exchange page
}

/**
 * Get use-case page links relevant to an exchange.
 */
export function getUseCaseLinksForExchange(
  featureBadges: string[],
  kycRequired: boolean
): InternalLink[] {
  const links: InternalLink[] = [];

  if (!kycRequired) {
    links.push({ href: '/use-cases/no-kyc/', anchor: 'no-KYC crypto exchanges' });
  }
  if (featureBadges.includes('futures')) {
    links.push({ href: '/use-cases/futures/', anchor: 'best exchanges for futures' });
  }
  if (featureBadges.includes('copy-trading')) {
    links.push({ href: '/use-cases/copy-trading/', anchor: 'best copy trading platforms' });
  }
  if (featureBadges.includes('p2p')) {
    links.push({ href: '/use-cases/p2p/', anchor: 'best P2P exchanges' });
  }

  return links.slice(0, 3);
}

/**
 * Get bonus code page link for an exchange.
 */
export function getBonusCodeLinkForExchange(
  exchangeSlug: string,
  exchangeName: string,
  availableSlugs: string[]
): InternalLink | null {
  if (!availableSlugs.includes(exchangeSlug)) return null;
  return {
    href: `/bonus-codes/${exchangeSlug}/`,
    anchor: `${exchangeName} bonus code`,
  };
}

// ── Guide → Exchange loop ─────────────────────────────────────────────────────

/**
 * Get exchange links for a guide page based on guide tags.
 * Guides with 'no-kyc' tag → no-KYC exchanges, etc.
 */
export function getExchangeLinksForGuide(
  guideTags: string[],
  allExchanges: Array<{ slug: string; name: string; rating: number; kycRequired: boolean; featureBadges?: string[] }>,
  count = 3
): InternalLink[] {
  let pool = [...allExchanges];

  if (guideTags.includes('no-kyc') || guideTags.includes('no-deposit')) {
    pool = pool.filter(e => !e.kycRequired);
  }
  if (guideTags.includes('futures')) {
    pool = pool.filter(e => (e.featureBadges ?? []).includes('futures'));
  }
  if (guideTags.includes('copy-trading')) {
    pool = pool.filter(e => (e.featureBadges ?? []).includes('copy-trading'));
  }

  return pool
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
    .map((ex, i) => ({
      href: `/exchanges/${ex.slug}/`,
      anchor: pickAnchor(ex.slug, i + 2), // offset to avoid brand-only anchors
    }));
}

// ── Duplicate protection helpers ──────────────────────────────────────────────

/**
 * Deduplicate a list of internal links by href.
 * Preserves first occurrence of each href.
 */
export function dedupeLinks(links: InternalLink[]): InternalLink[] {
  const seen = new Set<string>();
  return links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

/**
 * Filter out the current page URL from a link list.
 * Prevents self-referencing internal links.
 */
export function excludeSelf(links: InternalLink[], currentPath: string): InternalLink[] {
  return links.filter(l => l.href !== currentPath && l.href !== currentPath.replace(/\/$/, ''));
}
