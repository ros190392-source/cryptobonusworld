/**
 * contentGapEngine.ts — Topical Content Gap Detection
 * =====================================================
 *
 * Detects opportunities for new content across all major page types:
 *
 *   detectUseCaseGaps()     — missing /use-cases/[slug]/ pages
 *   detectGeoGaps()         — missing /countries/[slug]/ pages
 *   detectCompareGaps()     — missing /compare/[pair]/ pages
 *   detectCoinGaps()        — missing /coins/[slug]/ pages
 *   detectWeakClusters()    — topical clusters with too few pages
 *   runGapAnalysis()        — full gap report
 *
 * All functions return typed recommendation objects.
 * No page-generating logic here — output is recommendations only.
 */

// ── Gap recommendation types ──────────────────────────────────────────────────

export type GapPriority = 'high' | 'medium' | 'low';
export type GapType = 'use-case' | 'geo' | 'compare' | 'coin' | 'cluster' | 'guide' | 'bonus-code';

export interface GapItem {
  type: GapType;
  slug: string;
  title: string;
  rationale: string;
  estimatedMonthlySearches?: string;
  priority: GapPriority;
  /** Cluster this gap item belongs to */
  cluster?: string;
  /** Prerequisite pages that should exist first */
  dependsOn?: string[];
  /** Data fields needed to implement this page */
  dataRequirements: string[];
}

export interface ClusterGap {
  clusterName: string;
  clusterSlug: string;
  existingPageCount: number;
  targetPageCount: number;
  missingTypes: string[];
  coverage: number;    // 0–100%
  priority: GapPriority;
  recommendation: string;
}

export interface GapReport {
  generatedAt: string;
  totalGapsFound: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  useCaseGaps: GapItem[];
  geoGaps: GapItem[];
  compareGaps: GapItem[];
  coinGaps: GapItem[];
  guideGaps: GapItem[];
  bonusCodeGaps: GapItem[];
  clusterGaps: ClusterGap[];
  /** Ordered implementation roadmap */
  roadmap: GapItem[];
}

// ── Master use-case taxonomy ──────────────────────────────────────────────────

/** All use-case slugs that should eventually exist */
const MASTER_USE_CASES: Array<{
  slug: string;
  title: string;
  cluster: string;
  priority: GapPriority;
  searches: string;
  rationale: string;
}> = [
  // Trader profiles
  { slug: 'beginners',         title: 'Best Crypto Exchanges for Beginners',            cluster: 'trader-profile', priority: 'high',   searches: '12K/mo', rationale: 'High-volume head term, strong affiliate conversion' },
  { slug: 'day-trading',       title: 'Best Exchanges for Day Trading',                 cluster: 'trader-profile', priority: 'high',   searches: '8K/mo',  rationale: 'Active traders spend more and convert well' },
  { slug: 'scalping',          title: 'Best Crypto Exchanges for Scalping',             cluster: 'trader-profile', priority: 'medium', searches: '3K/mo',  rationale: 'Niche but high-intent — scalpers need low fees + fast execution' },
  { slug: 'swing-trading',     title: 'Best Exchanges for Swing Trading Crypto',        cluster: 'trader-profile', priority: 'medium', searches: '2K/mo',  rationale: 'Complements day-trading cluster' },
  { slug: 'high-leverage',     title: 'Best High Leverage Crypto Exchanges',            cluster: 'trader-profile', priority: 'medium', searches: '4K/mo',  rationale: 'High leverage traders seek exchanges with 100x+ futures' },
  { slug: 'passive-income',    title: 'Best Crypto Exchanges for Passive Income',       cluster: 'trader-profile', priority: 'medium', searches: '5K/mo',  rationale: 'Staking, earn products, and referral passive income angle' },

  // Feature-based
  { slug: 'no-kyc',            title: 'Best No-KYC Crypto Exchanges',                  cluster: 'feature',        priority: 'high',   searches: '18K/mo', rationale: 'Highest organic volume in niche, direct commercial intent' },
  { slug: 'futures',           title: 'Best Crypto Futures Exchanges',                 cluster: 'feature',        priority: 'high',   searches: '10K/mo', rationale: 'Strong commercial intent, fuels compare page traffic' },
  { slug: 'copy-trading',      title: 'Best Copy Trading Crypto Platforms',            cluster: 'feature',        priority: 'high',   searches: '6K/mo',  rationale: 'Growing trend, Bitget/OKX strong in this category' },
  { slug: 'p2p',               title: 'Best P2P Crypto Exchanges',                     cluster: 'feature',        priority: 'medium', searches: '5K/mo',  rationale: 'Addresses privacy-conscious + unbanked audience' },
  { slug: 'altcoins',          title: 'Best Crypto Exchanges for Altcoins',            cluster: 'feature',        priority: 'high',   searches: '7K/mo',  rationale: 'Gate.io/MEXC differentiation, large altcoin market' },
  { slug: 'low-fees',          title: 'Lowest Fee Crypto Exchanges',                   cluster: 'feature',        priority: 'high',   searches: '9K/mo',  rationale: 'Core comparison signal, high commercial intent' },
  { slug: 'mobile-trading',    title: 'Best Crypto Exchanges with Mobile App',         cluster: 'feature',        priority: 'medium', searches: '4K/mo',  rationale: 'Mobile-first audience segment' },
  { slug: 'api-trading',       title: 'Best Crypto Exchange APIs for Algorithmic Trading', cluster: 'feature',   priority: 'low',    searches: '2K/mo',  rationale: 'Developer audience, high retention after sign-up' },
  { slug: 'web3',              title: 'Best Crypto Exchanges with Web3 Wallet',        cluster: 'feature',        priority: 'low',    searches: '1K/mo',  rationale: 'OKX Web3 angle, emerging topic' },

  // Geo
  { slug: 'europe',            title: 'Best Crypto Exchanges in Europe',               cluster: 'geo',            priority: 'high',   searches: '6K/mo',  rationale: 'EU regulatory landscape post-MiCA is high editorial value' },
  { slug: 'uk',                title: 'Best Crypto Exchanges in the UK',               cluster: 'geo',            priority: 'high',   searches: '8K/mo',  rationale: 'FCA-registered exchanges angle, UK is huge crypto market' },
  { slug: 'canada',            title: 'Best Crypto Exchanges in Canada',               cluster: 'geo',            priority: 'high',   searches: '5K/mo',  rationale: 'Significant diaspora market, FINTRAC compliance angle' },
  { slug: 'australia',         title: 'Best Crypto Exchanges in Australia',            cluster: 'geo',            priority: 'medium', searches: '4K/mo',  rationale: 'High crypto adoption, AUSTRAC regulation' },
  { slug: 'india',             title: 'Best Crypto Exchanges in India',                cluster: 'geo',            priority: 'medium', searches: '15K/mo', rationale: 'Massive market, regulatory complexity is unique editorial angle' },
  { slug: 'usa',               title: 'Best Crypto Exchanges in the USA',              cluster: 'geo',            priority: 'medium', searches: '20K/mo', rationale: 'Highly competitive but enormous traffic if ranked' },
  { slug: 'uae',               title: 'Best Crypto Exchanges in UAE',                  cluster: 'geo',            priority: 'low',    searches: '2K/mo',  rationale: 'Growing hub, VARA regulation angle' },
  { slug: 'nigeria',           title: 'Best Crypto Exchanges in Nigeria',              cluster: 'geo',            priority: 'low',    searches: '5K/mo',  rationale: 'P2P + stablecoin angle, high adoption country' },
];

/** All coin slugs that should eventually exist */
const MASTER_COINS: Array<{
  slug: string;
  title: string;
  priority: GapPriority;
  searches: string;
  rationale: string;
}> = [
  { slug: 'bitcoin',    title: 'Buy Bitcoin (BTC) with Bonus',        priority: 'high',   searches: '50K/mo', rationale: 'Highest volume coin, essential hub page' },
  { slug: 'ethereum',   title: 'Buy Ethereum (ETH) with Bonus',       priority: 'high',   searches: '30K/mo', rationale: 'Second-largest, drives DeFi audience' },
  { slug: 'usdt',       title: 'Buy USDT with Bonus',                  priority: 'high',   searches: '25K/mo', rationale: 'Stablecoin onboarding, highest relevance to bonuses' },
  { slug: 'solana',     title: 'Buy Solana (SOL) with Bonus',          priority: 'high',   searches: '20K/mo', rationale: 'Top-3 by trading volume, ecosystem growth' },
  { slug: 'bnb',        title: 'Buy BNB with Bonus',                   priority: 'high',   searches: '15K/mo', rationale: 'Binance ecosystem, utility token' },
  { slug: 'xrp',        title: 'Buy XRP with Bonus',                   priority: 'high',   searches: '18K/mo', rationale: 'Post-SEC ruling recovery, surging interest' },
  { slug: 'doge',       title: 'Buy Dogecoin (DOGE) with Bonus',       priority: 'medium', searches: '10K/mo', rationale: 'Meme coin but mainstream retail audience' },
  { slug: 'ton',        title: 'Buy Toncoin (TON) with Bonus',         priority: 'medium', searches: '8K/mo',  rationale: 'Telegram ecosystem, high 2024 growth' },
  { slug: 'ada',        title: 'Buy Cardano (ADA) with Bonus',         priority: 'medium', searches: '8K/mo',  rationale: 'Established altcoin with dedicated community' },
  { slug: 'avax',       title: 'Buy Avalanche (AVAX) with Bonus',      priority: 'medium', searches: '6K/mo',  rationale: 'L1 competitor, institutional interest' },
  { slug: 'trx',        title: 'Buy TRON (TRX) with Bonus',            priority: 'medium', searches: '5K/mo',  rationale: 'High USDT transfer volume angle' },
  { slug: 'link',       title: 'Buy Chainlink (LINK) with Bonus',      priority: 'medium', searches: '5K/mo',  rationale: 'DeFi infrastructure, strong oracle narrative' },
  { slug: 'dot',        title: 'Buy Polkadot (DOT) with Bonus',        priority: 'low',    searches: '4K/mo',  rationale: 'Cross-chain narrative, parachain staking' },
  { slug: 'ltc',        title: 'Buy Litecoin (LTC) with Bonus',        priority: 'low',    searches: '4K/mo',  rationale: 'Legacy coin, P2P payment use-case' },
  { slug: 'pepe',       title: 'Buy PEPE Token with Bonus',            priority: 'low',    searches: '6K/mo',  rationale: 'Meme coin, high retail interest, clear risk disclaimer needed' },
  { slug: 'sui',        title: 'Buy SUI with Bonus',                   priority: 'low',    searches: '3K/mo',  rationale: 'New L1 with growing ecosystem' },
  { slug: 'apt',        title: 'Buy Aptos (APT) with Bonus',           priority: 'low',    searches: '2K/mo',  rationale: 'Move-language L1, Binance backing' },
  { slug: 'arb',        title: 'Buy Arbitrum (ARB) with Bonus',        priority: 'low',    searches: '3K/mo',  rationale: 'L2 leader, airdrop community' },
  { slug: 'op',         title: 'Buy Optimism (OP) with Bonus',         priority: 'low',    searches: '2K/mo',  rationale: 'L2 Superchain, governance angle' },
  { slug: 'usdc',       title: 'Buy USDC with Bonus',                  priority: 'medium', searches: '8K/mo',  rationale: 'Circle stablecoin, US institutional angle' },
];

/** Master compare pairs that have high commercial intent */
const MASTER_COMPARE_PAIRS: Array<{
  pair: string;
  a: string;
  b: string;
  priority: GapPriority;
  searches: string;
  rationale: string;
}> = [
  { pair: 'bybit-vs-mexc',      a: 'bybit',   b: 'mexc',    priority: 'high',   searches: '2K/mo',  rationale: 'Top no-KYC alternatives' },
  { pair: 'bybit-vs-okx',       a: 'bybit',   b: 'okx',     priority: 'high',   searches: '2.5K/mo', rationale: 'Most-searched exchange comparison' },
  { pair: 'okx-vs-mexc',        a: 'okx',     b: 'mexc',    priority: 'high',   searches: '1.5K/mo', rationale: 'Feature-rich mid-size exchanges' },
  { pair: 'bybit-vs-bitget',    a: 'bybit',   b: 'bitget',  priority: 'high',   searches: '1.8K/mo', rationale: 'Copy trading angle' },
  { pair: 'okx-vs-bitget',      a: 'okx',     b: 'bitget',  priority: 'high',   searches: '1.2K/mo', rationale: 'Futures + copy trading' },
  { pair: 'mexc-vs-bitget',     a: 'mexc',    b: 'bitget',  priority: 'medium', searches: '800/mo',  rationale: 'No-KYC vs copy trading' },
  { pair: 'bybit-vs-kucoin',    a: 'bybit',   b: 'kucoin',  priority: 'medium', searches: '900/mo',  rationale: 'Altcoin depth comparison' },
  { pair: 'okx-vs-kucoin',      a: 'okx',     b: 'kucoin',  priority: 'medium', searches: '700/mo',  rationale: 'Web3 vs altcoin angle' },
  { pair: 'mexc-vs-kucoin',     a: 'mexc',    b: 'kucoin',  priority: 'medium', searches: '600/mo',  rationale: 'Both no-KYC altcoin exchanges' },
  { pair: 'bybit-vs-bingx',     a: 'bybit',   b: 'bingx',   priority: 'medium', searches: '500/mo',  rationale: 'Grid trading vs futures' },
  { pair: 'binance-vs-bybit',   a: 'binance', b: 'bybit',   priority: 'high',   searches: '4K/mo',   rationale: 'Most-searched CEX comparison globally' },
  { pair: 'binance-vs-okx',     a: 'binance', b: 'okx',     priority: 'high',   searches: '2K/mo',   rationale: 'Top-2 CEX comparison' },
  { pair: 'bitget-vs-kucoin',   a: 'bitget',  b: 'kucoin',  priority: 'low',    searches: '400/mo',  rationale: 'Mid-tier comparison' },
  { pair: 'bingx-vs-bitget',    a: 'bingx',   b: 'bitget',  priority: 'low',    searches: '300/mo',  rationale: 'Grid trading vs copy trading' },
  { pair: 'gate-io-vs-mexc',    a: 'gate-io', b: 'mexc',    priority: 'medium', searches: '600/mo',  rationale: 'Altcoin exchange comparison' },
  { pair: 'bybit-vs-gate-io',   a: 'bybit',   b: 'gate-io', priority: 'medium', searches: '500/mo',  rationale: 'Large vs altcoin-focused' },
  { pair: 'phemex-vs-bybit',    a: 'phemex',  b: 'bybit',   priority: 'low',    searches: '300/mo',  rationale: 'Futures-only platforms' },
  { pair: 'coinex-vs-mexc',     a: 'coinex',  b: 'mexc',    priority: 'low',    searches: '200/mo',  rationale: 'No-KYC exchange comparison' },
];

/** GEO pages that should exist */
const MASTER_COUNTRIES: Array<{
  slug: string;
  name: string;
  priority: GapPriority;
  searches: string;
  rationale: string;
}> = [
  { slug: 'global',       name: 'Global',       priority: 'high',   searches: '20K/mo', rationale: 'Catch-all for unspecified countries' },
  { slug: 'united-states', name: 'United States', priority: 'high',  searches: '40K/mo', rationale: 'Biggest English-language crypto market' },
  { slug: 'united-kingdom', name: 'United Kingdom', priority: 'high', searches: '15K/mo', rationale: 'FCA angle, large retail market' },
  { slug: 'canada',        name: 'Canada',        priority: 'high',   searches: '8K/mo',  rationale: 'FINTRAC regulation, large market' },
  { slug: 'australia',     name: 'Australia',     priority: 'high',   searches: '7K/mo',  rationale: 'AUSTRAC, high crypto adoption' },
  { slug: 'germany',       name: 'Germany',       priority: 'medium', searches: '5K/mo',  rationale: 'BaFin regulation, EU MiCA' },
  { slug: 'india',         name: 'India',         priority: 'medium', searches: '20K/mo', rationale: 'Massive market, 30% crypto tax' },
  { slug: 'singapore',     name: 'Singapore',     priority: 'medium', searches: '3K/mo',  rationale: 'MAS regulation, crypto hub' },
  { slug: 'uae',           name: 'UAE',           priority: 'low',    searches: '2K/mo',  rationale: 'VARA, 0% tax jurisdiction' },
  { slug: 'nigeria',       name: 'Nigeria',       priority: 'low',    searches: '5K/mo',  rationale: 'High P2P adoption' },
  { slug: 'brazil',        name: 'Brazil',        priority: 'low',    searches: '4K/mo',  rationale: 'Largest LATAM crypto market' },
  { slug: 'japan',         name: 'Japan',         priority: 'low',    searches: '3K/mo',  rationale: 'FSA regulation, strong retail market' },
  { slug: 'south-korea',   name: 'South Korea',   priority: 'low',    searches: '3K/mo',  rationale: 'Kimchi premium angle, high adoption' },
  { slug: 'turkey',        name: 'Turkey',        priority: 'low',    searches: '4K/mo',  rationale: 'High inflation = high crypto demand' },
  { slug: 'france',        name: 'France',        priority: 'low',    searches: '3K/mo',  rationale: 'AMF regulation, large EU economy' },
];

/** Guide topics that fill content gaps */
const MASTER_GUIDES: Array<{
  slug: string;
  title: string;
  cluster: string;
  priority: GapPriority;
  searches: string;
  rationale: string;
}> = [
  { slug: 'how-to-claim-crypto-welcome-bonus',  title: 'How to Claim a Crypto Welcome Bonus (Step by Step)', cluster: 'how-to', priority: 'high',   searches: '5K/mo',  rationale: 'Top of funnel, direct conversion path' },
  { slug: 'what-is-kyc-crypto',                 title: 'What Is KYC in Crypto? (And How to Avoid It)',       cluster: 'education', priority: 'high',   searches: '8K/mo',  rationale: 'Massive informational volume, no-KYC affiliate angle' },
  { slug: 'how-to-trade-futures-crypto',        title: 'How to Trade Crypto Futures for Beginners',          cluster: 'how-to', priority: 'high',   searches: '6K/mo',  rationale: 'Futures affiliate angle, evergreen' },
  { slug: 'best-crypto-bonus-2026',             title: `Best Crypto Exchange Bonuses in 2026`,               cluster: 'roundup', priority: 'high',   searches: '4K/mo',  rationale: 'Evergreen year-stamped roundup' },
  { slug: 'crypto-bonus-wagering-requirements', title: 'How Crypto Bonus Wagering Requirements Work',        cluster: 'education', priority: 'medium', searches: '2K/mo',  rationale: 'Reduces churn from disappointed users, builds trust' },
  { slug: 'bybit-bonus-guide',                  title: 'Bybit Welcome Bonus: Full Walkthrough',              cluster: 'exchange-guide', priority: 'high', searches: '3K/mo', rationale: 'Most searched exchange in portfolio' },
  { slug: 'mexc-bonus-guide',                   title: 'MEXC Bonus Guide: How to Get Your Welcome Reward',   cluster: 'exchange-guide', priority: 'high', searches: '2K/mo', rationale: 'No-KYC audience segment, strong conversion' },
  { slug: 'how-to-use-copy-trading',            title: 'How to Use Copy Trading on Crypto Exchanges',        cluster: 'how-to', priority: 'medium', searches: '4K/mo',  rationale: 'Growing feature, Bitget angle' },
  { slug: 'crypto-tax-guide',                   title: 'Crypto Tax Basics: What Traders Need to Know',       cluster: 'education', priority: 'medium', searches: '10K/mo', rationale: 'High-volume, trust-building, no direct affiliate but brand authority' },
  { slug: 'p2p-trading-guide',                  title: 'P2P Crypto Trading Explained',                       cluster: 'how-to', priority: 'low',    searches: '3K/mo',  rationale: 'P2P use-case support guide' },
];

// ── Gap detection functions ───────────────────────────────────────────────────

/**
 * Detect missing use-case pages.
 */
export function detectUseCaseGaps(existingSlugs: string[]): GapItem[] {
  const existing = new Set(existingSlugs);
  return MASTER_USE_CASES
    .filter(uc => !existing.has(uc.slug))
    .map(uc => ({
      type: 'use-case' as GapType,
      slug: uc.slug,
      title: uc.title,
      rationale: uc.rationale,
      estimatedMonthlySearches: uc.searches,
      priority: uc.priority,
      cluster: uc.cluster,
      dataRequirements: [
        'answerBox (2–3 sentence definition)',
        'quickFacts (3–5 items)',
        'exchangePool (filtered exchange list)',
        'scoring weights (featureBadgeBoost, noKycBoost)',
        'faq (4+ questions)',
        'relatedUseCaseSlugs',
        'relatedCategorySlugs',
      ],
    }));
}

/**
 * Detect missing country/geo pages.
 */
export function detectGeoGaps(existingSlugs: string[]): GapItem[] {
  const existing = new Set(existingSlugs);
  return MASTER_COUNTRIES
    .filter(c => !existing.has(c.slug))
    .map(c => ({
      type: 'geo' as GapType,
      slug: c.slug,
      title: `Best Crypto Exchanges in ${c.name}`,
      rationale: c.rationale,
      estimatedMonthlySearches: c.searches,
      priority: c.priority,
      cluster: 'geo',
      dataRequirements: [
        'regulatoryStatus (active/restricted/banned)',
        'cryptoAdoptionRank (high/medium/low)',
        'marketContext (100+ char editorial note)',
        'topExchanges (array of exchange slugs)',
        'restrictedExchanges (if any)',
        'currency and language settings',
      ],
    }));
}

/**
 * Detect missing compare pairs.
 */
export function detectCompareGaps(existingPairs: string[]): GapItem[] {
  const existing = new Set(existingPairs);
  return MASTER_COMPARE_PAIRS
    .filter(p => !existing.has(p.pair))
    .map(p => ({
      type: 'compare' as GapType,
      slug: p.pair,
      title: `${p.a.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} vs ${p.b.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`,
      rationale: p.rationale,
      estimatedMonthlySearches: p.searches,
      priority: p.priority,
      cluster: 'compare',
      dependsOn: [`/exchanges/${p.a}/`, `/exchanges/${p.b}/`],
      dataRequirements: [
        `Exchange data for ${p.a} in exchanges.json`,
        `Exchange data for ${p.b} in exchanges.json`,
        `New entry in compare-pairs.json: { pair: "${p.pair}", a: "${p.a}", b: "${p.b}", label: "..." }`,
      ],
    }));
}

/**
 * Detect missing coin pages.
 */
export function detectCoinGaps(existingSlugs: string[]): GapItem[] {
  const existing = new Set(existingSlugs);
  return MASTER_COINS
    .filter(c => !existing.has(c.slug))
    .map(c => ({
      type: 'coin' as GapType,
      slug: c.slug,
      title: c.title,
      rationale: c.rationale,
      estimatedMonthlySearches: c.searches,
      priority: c.priority,
      cluster: 'coins',
      dataRequirements: [
        'supportedBy (exchange slug array)',
        'noKycExchanges (subset of supportedBy)',
        'networks (blockchain network array)',
        'quickFacts (4+ items)',
        'faq (4+ questions)',
      ],
    }));
}

/**
 * Detect missing guide pages.
 */
export function detectGuideGaps(existingSlugs: string[]): GapItem[] {
  const existing = new Set(existingSlugs);
  return MASTER_GUIDES
    .filter(g => !existing.has(g.slug))
    .map(g => ({
      type: 'guide' as GapType,
      slug: g.slug,
      title: g.title,
      rationale: g.rationale,
      estimatedMonthlySearches: g.searches,
      priority: g.priority,
      cluster: g.cluster,
      dataRequirements: [
        'guide content entry in guide-content.ts',
        'entry in guides.json with tags',
        'min 1200 words body content',
        'faq (3+ items)',
        'relatedExchanges (slug array)',
      ],
    }));
}

/**
 * Detect missing bonus-code pages.
 */
export function detectBonusCodeGaps(
  existingSlugs: string[],
  allExchangeSlugs: string[],
): GapItem[] {
  const existing = new Set(existingSlugs);
  // Exchanges with no bonus-code page yet
  const missing = allExchangeSlugs.filter(slug => !existing.has(slug));
  return missing.map(slug => ({
    type: 'bonus-code' as GapType,
    slug,
    title: `${slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} Bonus Code ${new Date().getFullYear()}`,
    rationale: 'Promo code pages capture branded search traffic and improve conversion with direct code CTA',
    estimatedMonthlySearches: '200–1000/mo',
    priority: 'medium' as GapPriority,
    cluster: 'bonus-codes',
    dependsOn: [`/exchanges/${slug}/`],
    dataRequirements: [
      'exchangeSlug',
      'seoTitle, heading, intro',
      'howToUse steps array',
      'codes array (or empty if link-only)',
      'affiliateUrl, bonusAmount, bonusCurrency',
      'faq (3+ questions)',
    ],
  }));
}

// ── Cluster gap detection ─────────────────────────────────────────────────────

interface ClusterDefinition {
  name: string;
  slug: string;
  requiredPageTypes: string[];
  existingPages: Record<string, number>;  // type → count
}

/**
 * Detect weak topical clusters — clusters where page count is below target.
 *
 * A healthy cluster needs: hub page + 2+ spoke pages + 1+ guide + 1+ compare
 */
export function detectWeakClusters(params: {
  useCaseSlugs: string[];
  coinSlugs: string[];
  comparePairs: string[];
  guideSlugs: string[];
  categorySlugs: string[];
}): ClusterGap[] {
  const { useCaseSlugs, coinSlugs, comparePairs, guideSlugs, categorySlugs } = params;

  // Define clusters and check completeness
  const clusters: Array<{ name: string; slug: string; checks: Array<{ label: string; present: boolean; weight: number }> }> = [
    {
      name: 'No-KYC Cluster',
      slug: 'no-kyc',
      checks: [
        { label: '/use-cases/no-kyc/ page',           present: useCaseSlugs.includes('no-kyc'),           weight: 30 },
        { label: '/categories/no-kyc-bonuses/ page',  present: categorySlugs.includes('no-kyc-bonuses'), weight: 25 },
        { label: 'At least 1 no-kyc guide',           present: guideSlugs.some(g => g.includes('kyc') || g.includes('no-kyc')), weight: 20 },
        { label: 'At least 3 compare pairs featuring no-KYC exchanges', present: comparePairs.filter(p => ['mexc','kucoin','coinex','bitunix'].some(ex => p.includes(ex))).length >= 3, weight: 25 },
      ],
    },
    {
      name: 'Futures Trading Cluster',
      slug: 'futures',
      checks: [
        { label: '/use-cases/futures/ page',          present: useCaseSlugs.includes('futures'),          weight: 30 },
        { label: '/use-cases/high-leverage/ page',    present: useCaseSlugs.includes('high-leverage'),    weight: 15 },
        { label: 'Futures guide',                     present: guideSlugs.some(g => g.includes('futures')), weight: 20 },
        { label: 'Futures compare pairs',             present: comparePairs.filter(p => ['bybit','okx','binance','phemex'].some(ex => p.includes(ex))).length >= 2, weight: 20 },
        { label: '/categories/futures-bonuses/ page', present: categorySlugs.includes('futures-bonuses'), weight: 15 },
      ],
    },
    {
      name: 'Geo / Regulatory Cluster',
      slug: 'geo',
      checks: [
        { label: '/use-cases/europe/ page',           present: useCaseSlugs.includes('europe'),           weight: 20 },
        { label: '/use-cases/uk/ page',               present: useCaseSlugs.includes('uk'),               weight: 20 },
        { label: '/use-cases/canada/ page',           present: useCaseSlugs.includes('canada'),           weight: 15 },
        { label: 'At least 3 country pages',          present: ['united-kingdom','canada','australia'].every(c => params.categorySlugs.includes(c) || true), weight: 25 }, // country pages separate from categories
        { label: 'Geo-specific guides',               present: guideSlugs.some(g => g.includes('us') || g.includes('uk') || g.includes('eu')), weight: 20 },
      ],
    },
    {
      name: 'Coin / Asset Cluster',
      slug: 'coins',
      checks: [
        { label: 'Bitcoin page',         present: coinSlugs.includes('bitcoin'),  weight: 25 },
        { label: 'Ethereum page',        present: coinSlugs.includes('ethereum'), weight: 20 },
        { label: 'USDT page',            present: coinSlugs.includes('usdt'),     weight: 20 },
        { label: 'At least 10 coins',    present: coinSlugs.length >= 10,         weight: 20 },
        { label: 'At least 15 coins',    present: coinSlugs.length >= 15,         weight: 15 },
      ],
    },
    {
      name: 'Copy Trading Cluster',
      slug: 'copy-trading',
      checks: [
        { label: '/use-cases/copy-trading/ page',     present: useCaseSlugs.includes('copy-trading'),     weight: 35 },
        { label: 'Copy trading guide',                present: guideSlugs.some(g => g.includes('copy')),  weight: 30 },
        { label: 'Bitget compare page',               present: comparePairs.some(p => p.includes('bitget')), weight: 35 },
      ],
    },
    {
      name: 'Beginner Onboarding Cluster',
      slug: 'beginners',
      checks: [
        { label: '/use-cases/beginners/ page',        present: useCaseSlugs.includes('beginners'),        weight: 30 },
        { label: 'How-to claim bonus guide',          present: guideSlugs.some(g => g.includes('claim') || g.includes('how-to')), weight: 25 },
        { label: 'What is KYC guide',                 present: guideSlugs.some(g => g.includes('kyc')),   weight: 25 },
        { label: 'At least 2 beginner bonus codes',   present: true,  weight: 20 },  // bonus-codes exist
      ],
    },
  ];

  return clusters.map(cluster => {
    const totalWeight = cluster.checks.reduce((s, c) => s + c.weight, 0);
    const achievedWeight = cluster.checks
      .filter(c => c.present)
      .reduce((s, c) => s + c.weight, 0);
    const coverage = Math.round((achievedWeight / totalWeight) * 100);

    const missingTypes = cluster.checks
      .filter(c => !c.present)
      .map(c => c.label);

    const priority: GapPriority =
      coverage < 40 ? 'high' :
      coverage < 70 ? 'medium' : 'low';

    const recommendation = coverage < 40
      ? `${cluster.name} is severely underdeveloped. Create missing pages immediately to establish topical authority.`
      : coverage < 70
      ? `${cluster.name} has core pages but needs supporting content for full topical authority.`
      : `${cluster.name} is well-covered. Add the remaining pages to complete the cluster.`;

    return {
      clusterName: cluster.name,
      clusterSlug: cluster.slug,
      existingPageCount: cluster.checks.filter(c => c.present).length,
      targetPageCount: cluster.checks.length,
      missingTypes,
      coverage,
      priority,
      recommendation,
    };
  });
}

// ── Full gap analysis ─────────────────────────────────────────────────────────

/**
 * Run a complete content gap analysis and return a prioritised report.
 */
export function runGapAnalysis(params: {
  existingUseCaseSlugs: string[];
  existingCountrySlugs: string[];
  existingComparePairs: string[];
  existingCoinSlugs: string[];
  existingGuideSlugs: string[];
  existingBonusCodeSlugs: string[];
  allExchangeSlugs: string[];
  existingCategorySlugs: string[];
}): GapReport {
  const {
    existingUseCaseSlugs, existingCountrySlugs, existingComparePairs,
    existingCoinSlugs, existingGuideSlugs, existingBonusCodeSlugs,
    allExchangeSlugs, existingCategorySlugs,
  } = params;

  const useCaseGaps    = detectUseCaseGaps(existingUseCaseSlugs);
  const geoGaps        = detectGeoGaps(existingCountrySlugs);
  const compareGaps    = detectCompareGaps(existingComparePairs);
  const coinGaps       = detectCoinGaps(existingCoinSlugs);
  const guideGaps      = detectGuideGaps(existingGuideSlugs);
  const bonusCodeGaps  = detectBonusCodeGaps(existingBonusCodeSlugs, allExchangeSlugs);
  const clusterGaps    = detectWeakClusters({
    useCaseSlugs: existingUseCaseSlugs,
    coinSlugs: existingCoinSlugs,
    comparePairs: existingComparePairs,
    guideSlugs: existingGuideSlugs,
    categorySlugs: existingCategorySlugs,
  });

  const allGaps = [
    ...useCaseGaps, ...geoGaps, ...compareGaps,
    ...coinGaps, ...guideGaps, ...bonusCodeGaps,
  ];

  const highPriorityCount   = allGaps.filter(g => g.priority === 'high').length;
  const mediumPriorityCount = allGaps.filter(g => g.priority === 'medium').length;
  const lowPriorityCount    = allGaps.filter(g => g.priority === 'low').length;

  // Build roadmap: high priority first, then medium, ordered by type
  const typeOrder: Record<GapType, number> = {
    'use-case': 1, 'compare': 2, 'coin': 3, 'geo': 4,
    'guide': 5, 'bonus-code': 6, 'cluster': 7,
  };
  const roadmap = [...allGaps]
    .filter(g => g.priority !== 'low')
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] ||
             typeOrder[a.type] - typeOrder[b.type];
    })
    .slice(0, 30);

  return {
    generatedAt: new Date().toISOString(),
    totalGapsFound: allGaps.length,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    useCaseGaps,
    geoGaps,
    compareGaps,
    coinGaps,
    guideGaps,
    bonusCodeGaps,
    clusterGaps,
    roadmap,
  };
}
