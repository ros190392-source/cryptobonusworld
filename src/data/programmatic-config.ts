/**
 * Programmatic SEO Configuration
 * ================================
 * Architecture for future scalable page generation.
 * DO NOT generate thousands of pages yet — prepare the schemas and utilities.
 *
 * Planned page types:
 *   1. /coins/[coin]/                    — Coin-specific bonus pages (e.g. /coins/bitcoin/)
 *   2. /bonus-codes/[exchange]-bonus-code/  — Bonus code pages
 *   3. /features/[feature]/              — Exchange-by-feature pages
 *   4. /use-cases/[use-case]/            — Exchange-by-use-case pages
 *   5. /exchanges-for/[country]/         — Full country exchange listing (already live as /countries/[slug]/)
 */

// ── 1. Feature taxonomy ─────────────────────────────────────────────────────
export const EXCHANGE_FEATURES = [
  {
    slug: 'no-kyc',
    label: 'No-KYC',
    description: 'Trade without identity verification',
    exchanges: ['mexc', 'kucoin', 'coinex', 'bitunix', 'gate-io'],
    seoTitle: 'Best No-KYC Crypto Exchanges 2026',
    metaDesc: 'Trade crypto without ID verification on MEXC, KuCoin, CoinEx and Bitunix. Compare no-KYC exchange bonuses.',
    priority: 'high',
  },
  {
    slug: 'copy-trading',
    label: 'Copy Trading',
    description: 'Automatically copy expert traders',
    exchanges: ['bybit', 'bitget', 'okx', 'bingx'],
    seoTitle: 'Best Copy Trading Exchanges 2026',
    metaDesc: 'Compare copy trading platforms: Bybit, Bitget, OKX and BingX. Find exchanges where you can automatically copy expert traders.',
    priority: 'high',
  },
  {
    slug: 'p2p-trading',
    label: 'P2P Trading',
    description: 'Buy crypto directly from other users',
    exchanges: ['bybit', 'binance', 'okx', 'mexc', 'htx'],
    seoTitle: 'Best P2P Crypto Exchange 2026',
    metaDesc: 'Compare P2P crypto trading platforms with local payment methods in your currency.',
    priority: 'high',
  },
  {
    slug: 'futures-trading',
    label: 'Futures Trading',
    description: 'Trade perpetual and quarterly futures',
    exchanges: ['bybit', 'okx', 'bitget', 'bingx', 'phemex'],
    seoTitle: 'Best Crypto Futures Trading Exchanges 2026',
    metaDesc: 'Compare crypto futures trading exchanges with the highest bonuses, lowest fees, and best liquidity.',
    priority: 'high',
  },
  {
    slug: 'spot-trading',
    label: 'Spot Trading',
    description: 'Buy and sell crypto at current market prices',
    exchanges: ['binance', 'mexc', 'kucoin', 'coinex', 'gate-io'],
    seoTitle: 'Best Spot Crypto Trading Exchanges 2026',
    metaDesc: 'Compare spot crypto exchanges with the most coins, lowest fees and best bonuses for new users.',
    priority: 'medium',
  },
  {
    slug: 'grid-trading',
    label: 'Grid Trading',
    description: 'Automated trading bots for ranging markets',
    exchanges: ['bingx', 'kucoin', 'gate-io', 'bybit'],
    seoTitle: 'Best Grid Trading Crypto Exchanges 2026',
    metaDesc: 'Compare exchanges with grid trading bots for automated crypto trading in ranging markets.',
    priority: 'medium',
  },
  {
    slug: 'staking',
    label: 'Staking',
    description: 'Earn passive income by staking crypto',
    exchanges: ['binance', 'bybit', 'okx', 'kucoin', 'mexc'],
    seoTitle: 'Best Crypto Staking Exchanges 2026',
    metaDesc: 'Compare crypto staking platforms with the highest APY and most supported coins.',
    priority: 'medium',
  },
  {
    slug: 'launchpool',
    label: 'Launchpool',
    description: 'Earn new tokens by staking existing crypto',
    exchanges: ['binance', 'okx', 'mexc', 'kucoin'],
    seoTitle: 'Best Crypto Launchpool Platforms 2026',
    metaDesc: 'Earn new project tokens by staking BNB, USDT or exchange tokens on top launchpool platforms.',
    priority: 'medium',
  },
] as const;

// ── 2. Use-case taxonomy ─────────────────────────────────────────────────────
export const EXCHANGE_USE_CASES = [
  {
    slug: 'beginners',
    label: 'Beginners',
    description: 'Best exchanges for first-time crypto traders',
    exchanges: ['mexc', 'binance', 'coinex', 'kucoin', 'bybit'],
    seoTitle: 'Best Crypto Exchanges for Beginners 2026',
    metaDesc: 'Compare beginner-friendly crypto exchanges with easy sign-up, low fees and welcome bonuses.',
    guideSlug: 'best-crypto-exchanges-for-beginners',
    priority: 'high',
  },
  {
    slug: 'day-traders',
    label: 'Day Traders',
    description: 'Best exchanges for high-frequency active trading',
    exchanges: ['bybit', 'okx', 'bitget', 'binance'],
    seoTitle: 'Best Crypto Exchanges for Day Traders 2026',
    metaDesc: 'Compare exchanges with lowest fees, highest liquidity and best tools for active day traders.',
    guideSlug: null,
    priority: 'high',
  },
  {
    slug: 'altcoin-traders',
    label: 'Altcoin Traders',
    description: 'Best exchanges for trading small and mid-cap coins',
    exchanges: ['mexc', 'kucoin', 'gate-io', 'bybit'],
    seoTitle: 'Best Exchanges for Altcoin Trading 2026',
    metaDesc: 'Compare crypto exchanges with the most altcoin listings and best bonuses for altcoin traders.',
    guideSlug: null,
    priority: 'medium',
  },
  {
    slug: 'passive-income',
    label: 'Passive Income',
    description: 'Best exchanges for staking and yield earning',
    exchanges: ['binance', 'bybit', 'okx', 'kucoin', 'mexc'],
    seoTitle: 'Best Crypto Exchanges for Passive Income 2026',
    metaDesc: 'Compare exchanges with the best staking, launchpool and earn features for passive crypto income.',
    guideSlug: 'staking-vs-launchpool',
    priority: 'medium',
  },
] as const;

// ── 3. Coin taxonomy (future /coins/[coin]/ pages) ───────────────────────────
export const COIN_PAGES = [
  {
    slug: 'bitcoin',
    symbol: 'BTC',
    label: 'Bitcoin',
    description: 'Best exchanges to buy Bitcoin with bonuses',
    seoTitle: 'Best Exchanges to Buy Bitcoin (BTC) + Bonus 2026',
    metaDesc: 'Compare crypto exchanges where you can buy Bitcoin and claim a signup bonus. Compare BTC bonuses.',
    priority: 'high',
  },
  {
    slug: 'ethereum',
    symbol: 'ETH',
    label: 'Ethereum',
    description: 'Best exchanges to buy Ethereum with bonuses',
    seoTitle: 'Best Exchanges to Buy Ethereum (ETH) + Bonus 2026',
    metaDesc: 'Compare crypto exchanges where you can buy Ethereum and claim a welcome bonus in 2026.',
    priority: 'high',
  },
  {
    slug: 'usdt',
    symbol: 'USDT',
    label: 'Tether (USDT)',
    description: 'Best exchanges to buy USDT cheaply',
    seoTitle: 'Best Exchanges to Buy USDT (Tether) in 2026',
    metaDesc: 'Compare exchanges where you can buy USDT with the lowest fees. P2P, card and bank transfer.',
    guideSlug: 'how-to-buy-usdt',
    priority: 'very-high',
  },
  {
    slug: 'bnb',
    symbol: 'BNB',
    label: 'BNB',
    description: 'Best exchanges to buy BNB with bonuses',
    seoTitle: 'Best Exchanges to Buy BNB in 2026',
    metaDesc: 'Compare where to buy BNB (Binance Coin) with the best rates and signup bonuses.',
    priority: 'high',
  },
  {
    slug: 'solana',
    symbol: 'SOL',
    label: 'Solana',
    description: 'Best exchanges to buy Solana',
    seoTitle: 'Best Exchanges to Buy Solana (SOL) + Bonus 2026',
    metaDesc: 'Compare crypto exchanges where you can buy Solana with bonuses and low fees.',
    priority: 'high',
  },
] as const;

// ── 4. Bonus code pages ──────────────────────────────────────────────────────
export const BONUS_CODE_PAGES = [
  {
    slug: 'bybit-bonus-code',
    exchange: 'bybit',
    codes: ['CRYPTOBONUSW', 'BYBIT2026'],
    seoTitle: 'Bybit Bonus Code 2026: Up to 30,000 USDT',
    metaDesc: 'Use the latest Bybit bonus code to claim up to 30,000 USDT in welcome rewards. Verified working codes.',
    priority: 'very-high',
  },
  {
    slug: 'mexc-bonus-code',
    exchange: 'mexc',
    codes: ['mexc-cryptobonusw'],
    seoTitle: 'MEXC Bonus Code 2026: Up to 10,000 USDT',
    metaDesc: 'Use a MEXC referral or bonus code to claim up to 10,000 USDT. No KYC required for base tiers.',
    priority: 'high',
  },
  {
    slug: 'okx-bonus-code',
    exchange: 'okx',
    codes: [],
    seoTitle: 'OKX Bonus Code 2026: Up to 10,000 USDT',
    metaDesc: 'Claim the OKX signup bonus and welcome package. Use our affiliate link for verified bonus activation.',
    priority: 'high',
  },
  {
    slug: 'bitget-bonus-code',
    exchange: 'bitget',
    codes: [],
    seoTitle: 'Bitget Bonus Code 2026: Up to 6,200 USDT',
    metaDesc: 'Claim the Bitget welcome bonus for new users. Up to 6,200 USDT for traders and copy trading followers.',
    priority: 'high',
  },
  {
    slug: 'binance-bonus-code',
    exchange: 'binance',
    codes: ['CRYPTOBONUSW'],
    seoTitle: 'Binance Bonus Code 2026: Up to 100 USDT',
    metaDesc: 'Use our Binance referral code to claim up to 100 USDT in new user rewards. Verified working codes.',
    priority: 'very-high',
  },
] as const;

// ── 5. Page generation helpers ───────────────────────────────────────────────
export function getFeatureBySlug(slug: string) {
  return EXCHANGE_FEATURES.find(f => f.slug === slug) ?? null;
}

export function getUseCaseBySlug(slug: string) {
  return EXCHANGE_USE_CASES.find(u => u.slug === slug) ?? null;
}

export function getCoinBySlug(slug: string) {
  return COIN_PAGES.find(c => c.slug === slug) ?? null;
}

export function getBonusCodeBySlug(slug: string) {
  return BONUS_CODE_PAGES.find(b => b.slug === slug) ?? null;
}

/**
 * Generate SEO-optimised page title for any programmatic page type.
 * Centralises title construction for consistency.
 */
export function buildProgrammaticTitle(
  type: 'feature' | 'use-case' | 'coin' | 'bonus-code',
  slug: string,
  year = new Date().getFullYear()
): string {
  const item = type === 'feature' ? getFeatureBySlug(slug)
    : type === 'use-case' ? getUseCaseBySlug(slug)
    : type === 'coin' ? getCoinBySlug(slug)
    : getBonusCodeBySlug(slug);
  return item ? item.seoTitle.replace('2026', String(year)) : `Crypto Exchange Guide ${year}`;
}
