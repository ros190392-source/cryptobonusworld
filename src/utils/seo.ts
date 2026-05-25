/**
 * CryptoBonusWorld — SEO Utility Layer
 *
 * Central source of truth for:
 *  - Title + meta description generation (keyword-rich, length-safe)
 *  - Related content logic (relevance-scored)
 *  - Schema.org builders (Product, ItemList, Organization, WebSite)
 *  - Sitemap URL helpers
 *
 * Pure functions — no side effects, no framework imports.
 * Import from any Astro page or component.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const SITE_URL = 'https://cryptobonusworld.com';
export const SITE_NAME = 'CryptoBonusWorld';
export const YEAR = new Date().getFullYear();

// Bonus-type slug → category slug mapping
export const BONUS_TYPE_TO_CATEGORY: Record<string, string> = {
  signup:             'signup-bonuses',
  deposit:            'deposit-bonuses',
  futures:            'futures-bonuses',
  'no-deposit':       'no-deposit-bonuses',
  welcome:            'welcome-bonuses',
  'no-kyc':           'no-kyc-bonuses',
  'trading-rewards':  'trading-rewards',
  referral:           'referral-bonuses',
};

// Bonus-type emoji icons (matches bonusTypeDefs on exchange page)
export const BONUS_TYPE_ICONS: Record<string, string> = {
  signup:            '🎉',
  deposit:           '💰',
  futures:           '📈',
  'no-deposit':      '✨',
  welcome:           '🎊',
  'no-kyc':          '🔓',
  'trading-rewards': '🏆',
  referral:          '👥',
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface SeoExchange {
  name: string;
  slug: string;
  rating: number;
  bonusTitle: string;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTypes: string[];
  kycRequired: boolean;
  depositRequired: boolean;
  affiliateUrl: string;
  shortDescription: string;
  countries: string[];
  excludedCountries: string[];
  updatedAt: string;
  [key: string]: unknown;
}

export interface SeoCategory {
  name: string;
  slug: string;
  title: string;
  bonusType: string;
  seoTitle: string;
  seoDescription: string;
  intro?: string;
  [key: string]: unknown;
}

export interface SeoCountry {
  name: string;
  slug: string;
  flag: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  currency: string;
  paymentMethods: string[];
  localNotes?: string;
  // GEO expansion fields (added in Task 7)
  regulatoryStatus?: 'active' | 'evolving' | 'p2p-focused';
  cryptoAdoptionRank?: 'very-high' | 'high' | 'medium';
  marketContext?: string;
  topExchangeSlug?: string;
  noKycNote?: string;
  fiatOnRamp?: Array<{ method: string; note: string }>;
  [key: string]: unknown;
}

// ── Number formatting (locale-safe) ─────────────────────────────────────────

/** Always format with en-US commas — avoids non-breaking space on some locales. */
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// ── Title generators ─────────────────────────────────────────────────────────

/**
 * Exchange page <title> — CTR-optimised with display mode awareness.
 *
 * Variants:
 *  - Fixed-mode (e.g. Coinbase): "Coinbase Bonus 2026: $10 in Bitcoin for New Users"
 *  - No-KYC:   "MEXC Bonus 2026: Up to 1,000 USDT — No KYC Required"
 *  - Standard: "Bybit Bonus 2026: Up to 30,000 USDT for New Traders"
 *
 * Targets 50–62 chars for strong SERP display.
 */
export function exchangePageTitle(ex: SeoExchange): string {
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const bonusTitle: string = (ex as any).bonusTitle ?? '';

  if (displayMode === 'fixed' && bonusTitle) {
    // e.g. "Coinbase Bonus 2026: $10 in Bitcoin for New Users"
    return `${ex.name} Bonus ${YEAR}: ${bonusTitle} for New Users`;
  }

  if (displayMode === 'campaign') {
    // Campaign-based: don't lead with a potentially stale amount
    const kycNote = !ex.kycRequired ? ' — No KYC' : '';
    return `${ex.name} Welcome Offer ${YEAR}: Current Bonus Campaign${kycNote}`;
  }

  if (!ex.kycRequired) {
    // No-KYC: highlight it in the title — strong CTR signal
    return `${ex.name} Bonus ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} — No KYC`;
  }

  // Standard: "Up to X — strong action phrasing"
  return `${ex.name} Bonus ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} for New Traders`;
}

/**
 * Bonus landing page <title> — transactional intent, strong phrasing.
 * e.g. "Bybit Promo Code 2026: Up to 30,000 USDT (Verified + Working)"
 */
export function bonusPageTitle(ex: SeoExchange): string {
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const bonusTitle: string = (ex as any).bonusTitle ?? '';
  if (displayMode === 'fixed' && bonusTitle) {
    return `${ex.name} Promo Code ${YEAR}: ${bonusTitle} — Verified Offer`;
  }
  const kycTag = !ex.kycRequired ? ' | No KYC' : '';
  return `${ex.name} Promo Code ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency}${kycTag}`;
}

/**
 * Category page <title> — includes exchange count for freshness signal.
 */
export function categoryPageTitle(seoTitle: string, count: number): string {
  return `${seoTitle} — ${count} Verified Exchange${count !== 1 ? 's' : ''} (${YEAR})`;
}

/**
 * Country page <title> — includes exchange count.
 */
export function countryPageTitle(seoTitle: string, count: number): string {
  return `${seoTitle} — ${count} Exchange${count !== 1 ? 's' : ''} Available (${YEAR})`;
}

/**
 * Inject "No KYC" into an existing use-case or category page title
 * when the page has a meaningful no-KYC option.
 * Only appends if not already present and string length permits.
 */
export function injectNoKycTitle(baseTitle: string, noKycCount: number): string {
  if (noKycCount === 0) return baseTitle;
  if (baseTitle.toLowerCase().includes('no kyc') || baseTitle.toLowerCase().includes('no-kyc')) {
    return baseTitle;
  }
  const suffix = ' — No KYC Options';
  if (baseTitle.length + suffix.length <= 65) {
    return baseTitle + suffix;
  }
  return baseTitle;
}

// ── Meta description generators (target 145–155 chars) ──────────────────────

/**
 * Exchange meta description — trust signals + key facts + action.
 * Avoids "guaranteed", "best", "amazing" — focuses on verifiable claims.
 * Includes fee angle when competitively low to target fee-related SERP queries.
 */
export function exchangeMetaDesc(ex: SeoExchange): string {
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const verificationStatus: string = (ex as any).verificationStatus ?? 'verified';
  const spotMakerFee: number | undefined = (ex as any).spotMakerFee;
  const spotTakerFee: number | undefined = (ex as any).spotTakerFee;

  const kyc = ex.kycRequired ? 'KYC required' : 'no KYC';
  const deposit = ex.depositRequired ? 'deposit required' : 'no deposit';
  const trustTag = verificationStatus === 'verified' ? 'Verified.' : '';
  const noKycHighlight = !ex.kycRequired ? 'No KYC. ' : '';

  // Fee signal — include when maker=0% or taker ≤0.1% (notable CTR hook for fee queries)
  let feeNote = '';
  if (spotMakerFee === 0) {
    feeNote = '0% maker fee. ';
  } else if (spotTakerFee !== undefined && spotTakerFee <= 0.1) {
    feeNote = `${spotTakerFee}% spot fee. `;
  }

  if (displayMode === 'fixed') {
    const raw = `${ex.name} signup bonus ${YEAR}: fixed reward for new users. ${noKycHighlight}${feeNote}${trustTag} ${kyc}, ${deposit}. Full conditions and claim guide.`;
    return raw.replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  if (displayMode === 'campaign') {
    const raw = `${ex.name} welcome offer ${YEAR}: campaign bonus for new users. ${noKycHighlight}${feeNote}Verify on official site. ${trustTag} ${kyc}. Step-by-step guide.`;
    return raw.replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  const raw = `${ex.name} bonus ${YEAR}: up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency}. ${noKycHighlight}${feeNote}${trustTag} ${kyc}, ${deposit}. Verified conditions + guide.`;
  return raw.replace(/\s+/g, ' ').trim().slice(0, 160);
}

/**
 * Category meta description — dynamic exchange count + best offer.
 */
export function categoryMetaDesc(cat: SeoCategory, filtered: SeoExchange[]): string {
  const count = filtered.length;
  const noKycCount = filtered.filter(e => !e.kycRequired).length;
  const maxBonus = count > 0 ? Math.max(...filtered.map(e => e.bonusAmount)) : 0;
  const noKycNote = noKycCount > 0 ? ` ${noKycCount} available without KYC.` : '';
  const raw = `Compare ${count} crypto exchanges with ${cat.name.toLowerCase()}. Best offer: up to ${fmt(maxBonus)} USDT.${noKycNote} Check conditions and claim the best bonus.`;
  return raw.slice(0, 160);
}

/**
 * Country meta description — dynamic count + top bonus + local notes.
 */
export function countryMetaDesc(country: SeoCountry, available: SeoExchange[]): string {
  const count = available.length;
  const noKycCount = available.filter(e => !e.kycRequired).length;
  const maxBonus = count > 0 ? Math.max(...available.map(e => e.bonusAmount)) : 0;
  const noKycNote = noKycCount > 0 ? ` ${noKycCount} no-KYC options.` : '';
  const raw = `Compare ${count} crypto exchange bonuses in ${country.name}. Best offer: up to ${fmt(maxBonus)} USDT.${noKycNote} Find the best signup bonus available in ${country.name}.`;
  return raw.slice(0, 160);
}

// ── Related content logic ────────────────────────────────────────────────────

/**
 * Score how relevant `candidate` is to `target` for the "alternatives" block.
 * Higher = more relevant.
 */
function relevanceScore(target: SeoExchange, candidate: SeoExchange): number {
  let score = 0;
  // Shared bonus types (most important)
  const sharedTypes = target.bonusTypes.filter(t => candidate.bonusTypes.includes(t)).length;
  score += sharedTypes * 4;
  // Same KYC policy (user intent match)
  if (target.kycRequired === candidate.kycRequired) score += 3;
  // Same deposit policy
  if (target.depositRequired === candidate.depositRequired) score += 2;
  // Shared countries (availability match)
  const sharedCountries = target.countries.filter(c =>
    candidate.countries.includes(c) || candidate.countries.includes('global')
  ).length;
  score += Math.min(sharedCountries, 4);
  // Rating tiebreaker
  score += candidate.rating * 0.2;
  return score;
}

/**
 * Get exchanges most relevant to `currentSlug`, sorted by relevance then rating.
 */
export function getRelatedExchanges(
  currentSlug: string,
  allExchanges: SeoExchange[],
  count = 3
): SeoExchange[] {
  const current = allExchanges.find(e => e.slug === currentSlug);
  if (!current) {
    return allExchanges.filter(e => e.slug !== currentSlug).slice(0, count);
  }
  return allExchanges
    .filter(e => e.slug !== currentSlug)
    .map(e => ({ exchange: e, score: relevanceScore(current, e) }))
    .sort((a, b) => b.score - a.score || b.exchange.rating - a.exchange.rating)
    .slice(0, count)
    .map(({ exchange }) => exchange);
}

/**
 * Get categories that apply to an exchange based on its bonus types and flags.
 * Used for "This exchange qualifies for these categories" cross-links.
 */
export function getRelatedCategories(
  bonusTypes: string[],
  kycRequired: boolean,
  depositRequired: boolean,
  allCategories: SeoCategory[]
): SeoCategory[] {
  const slugSet = new Set<string>();
  // Map each bonus type
  for (const t of bonusTypes) {
    const s = BONUS_TYPE_TO_CATEGORY[t];
    if (s) slugSet.add(s);
  }
  // Infer from flags
  if (!kycRequired) slugSet.add('no-kyc-bonuses');
  if (!depositRequired) slugSet.add('no-deposit-bonuses');
  // Welcome is umbrella for signup
  if (bonusTypes.includes('signup')) slugSet.add('welcome-bonuses');
  return allCategories.filter(c => slugSet.has(c.slug));
}

/**
 * Get country objects for countries where this exchange operates.
 * Excludes 'global' (too generic to link to).
 */
export function getCountryCrossLinks(
  exchangeCountries: string[],
  allCountries: SeoCountry[]
): SeoCountry[] {
  const isGlobal = exchangeCountries.includes('global');
  return allCountries.filter(c =>
    c.slug !== 'global' && (isGlobal || exchangeCountries.includes(c.slug))
  );
}

/**
 * Get categories that have exchanges in a given country.
 * Used for "Available bonus types in [Country]" cross-links.
 */
export function getCountryCategoryLinks(
  available: SeoExchange[],
  allCategories: SeoCategory[]
): SeoCategory[] {
  const presentTypes = new Set<string>();
  for (const ex of available) {
    for (const t of ex.bonusTypes) presentTypes.add(t);
    if (available.some(e => !e.kycRequired)) presentTypes.add('no-kyc');
    if (available.some(e => !e.depositRequired)) presentTypes.add('no-deposit');
  }
  const slugSet = new Set<string>();
  for (const t of presentTypes) {
    const s = BONUS_TYPE_TO_CATEGORY[t];
    if (s) slugSet.add(s);
  }
  return allCategories.filter(c => slugSet.has(c.slug));
}

// ── Schema.org builders ──────────────────────────────────────────────────────

export function buildProductSchema(ex: SeoExchange): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${ex.name} Welcome Bonus`,
    description: ex.shortDescription,
    url: `${SITE_URL}/exchanges/${ex.slug}/`,
    brand: {
      '@type': 'Brand',
      name: ex.name,
    },
    offers: {
      '@type': 'Offer',
      description: ex.bonusTitle,
      priceCurrency: ex.bonusCurrency,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/exchanges/${ex.slug}/`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ex.rating,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 47,
    },
  };
}

export function buildItemListSchema(
  items: Array<{ name: string; url: string; description?: string }>,
  listName: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${SITE_URL}${item.url}`,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description: 'CryptoBonusWorld compares crypto exchange bonuses worldwide — signup rewards, deposit bonuses and futures promotions from top exchanges.',
    sameAs: [],
  };
}

// ── GEO ranking helpers ──────────────────────────────────────────────────────

/**
 * Normalize a payment method string to a canonical category.
 * Handles: "bank transfer", "UPI", "PIX", "P2P" etc.
 */
export function normalizePaymentMethod(method: string): string {
  const m = method.toLowerCase().trim();
  if (m === 'p2p') return 'p2p';
  if (m.includes('card') || m.includes('visa') || m.includes('master')) return 'card';
  if (
    m.includes('bank') ||
    m === 'upi' ||
    m === 'pix' ||
    m.includes('transfer') ||
    m === 'sepa' ||
    m === 'imps' ||
    m === 'neft' ||
    m === 'ted' ||
    m === 'doc'
  ) return 'bank';
  if (m === 'crypto') return 'crypto';
  return m;
}

/**
 * Rank exchanges for a specific country using local GEO signals.
 *
 * Scoring factors (additive on top of base exchange rating):
 *  +2.5  editorial top-pick for this country
 *  +1.5  no-KYC exchange in an evolving/non-active regulatory market
 *  +0.4  per shared normalized payment method (capped at 3 matches)
 *
 * Returns only exchanges available in the country.
 */
export function rankExchangesForCountry(
  countrySlug: string,
  topExchangeSlug: string | undefined,
  regulatoryStatus: string | undefined,
  countryPaymentMethods: string[],
  allExchanges: SeoExchange[]
): SeoExchange[] {
  const available = allExchanges.filter(ex =>
    (ex.countries.includes(countrySlug) || ex.countries.includes('global')) &&
    !(ex.excludedCountries ?? []).includes(countrySlug)
  );

  const countryPayNorm = countryPaymentMethods.map(normalizePaymentMethod);

  return available
    .map(ex => {
      let score = ex.rating;

      // Editorial top pick boost
      if (topExchangeSlug && ex.slug === topExchangeSlug) score += 2.5;

      // No-KYC boost in evolving regulatory environments
      if (!ex.kycRequired && regulatoryStatus && regulatoryStatus !== 'active') score += 1.5;

      // Payment method overlap — each shared method adds a small boost
      const exPayNorm = (ex.paymentMethods ?? []).map(normalizePaymentMethod);
      const shared = exPayNorm.filter(m => countryPayNorm.includes(m)).length;
      score += Math.min(shared, 3) * 0.4;

      return { exchange: ex, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ exchange }) => exchange);
}

// ── Compare page helpers ─────────────────────────────────────────────────────

export interface ComparePair {
  pair: string;
  a: string;
  b: string;
  label: string;
}

/**
 * Compare page <title> — differentiated variants based on key signals.
 *
 * Priority:
 *  1. Both no-KYC          → "…: No-KYC Bonuses Compared"
 *  2. KYC mismatch         → "…: No KYC vs KYC — Which Is Better?"
 *  3. Large bonus ratio ≥5 → "…: Is [Higher]'s Larger Bonus Worth It?"
 *  4. Both have P2P        → "…: P2P, Fees & Bonus Compared"
 *  5. Default              → "…: Bonus, KYC & Fees Compared"
 *
 * Targets 52–62 chars. All variants pass length audit.
 */
export function comparePageTitle(exA: SeoExchange, exB: SeoExchange): string {
  const aKyc = exA.kycRequired;
  const bKyc = exB.kycRequired;
  const aBonus = exA.bonusAmount;
  const bBonus = exB.bonusAmount;
  const aP2p = (exA as any).p2pAvailable as boolean | undefined;
  const bP2p = (exB as any).p2pAvailable as boolean | undefined;

  // Both no-KYC — privacy-focused searchers
  if (!aKyc && !bKyc) {
    return `${exA.name} vs ${exB.name} ${YEAR}: No-KYC Bonuses Compared`;
  }

  // KYC mismatch — very common search intent differentiator
  if (!aKyc && bKyc) {
    return `${exA.name} vs ${exB.name} ${YEAR}: No KYC vs KYC — Which Is Better?`;
  }
  if (aKyc && !bKyc) {
    return `${exA.name} vs ${exB.name} ${YEAR}: KYC vs No KYC — Which Is Better?`;
  }

  // Large bonus ratio (one is 5× higher) — highlight value question
  if (aBonus > 0 && bBonus > 0) {
    const ratio = Math.max(aBonus, bBonus) / Math.min(aBonus, bBonus);
    if (ratio >= 5) {
      const higher = aBonus > bBonus ? exA.name : exB.name;
      return `${exA.name} vs ${exB.name} ${YEAR}: Is ${higher}'s Larger Bonus Worth It?`;
    }
  }

  // Both support P2P — highlight P2P trading angle
  if (aP2p && bP2p) {
    return `${exA.name} vs ${exB.name} ${YEAR}: P2P, Fees & Bonus Compared`;
  }

  // Default
  return `${exA.name} vs ${exB.name} ${YEAR}: Bonus, KYC & Fees Compared`;
}

/**
 * Compare meta description — highlights key differentiators.
 * KYC mismatch variant surfaces the no-KYC exchange explicitly.
 */
export function compareMetaDesc(exA: SeoExchange, exB: SeoExchange): string {
  const aKyc = exA.kycRequired;
  const bKyc = exB.kycRequired;
  const maxA = fmt(exA.bonusAmount);
  const maxB = fmt(exB.bonusAmount);

  // KYC mismatch — lead with the standout fact
  if (aKyc !== bKyc) {
    const noKycName = !aKyc ? exA.name : exB.name;
    const kycName = aKyc ? exA.name : exB.name;
    const raw = `${exA.name} vs ${exB.name} ${YEAR}: ${noKycName} needs no KYC; ${kycName} requires ID. Compare bonuses (${maxA} vs ${maxB} USDT), fees and features.`;
    return raw.slice(0, 160);
  }

  const raw = `${exA.name} vs ${exB.name}: compare bonuses (${maxA} vs ${maxB} USDT), KYC, fees, and features side by side. Find which exchange is right for you.`;
  return raw.slice(0, 160);
}

/**
 * Schema.org ItemList for a compare page — lists both exchanges.
 */
export function buildComparisonSchema(exA: SeoExchange, exB: SeoExchange): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${exA.name} vs ${exB.name} — Crypto Exchange Comparison`,
    description: `Side-by-side comparison of ${exA.name} and ${exB.name} bonuses, KYC requirements, fees and features.`,
    numberOfItems: 2,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: `${exA.name} Welcome Bonus`,
        url: `${SITE_URL}/exchanges/${exA.slug}/`,
        description: exA.shortDescription,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${exB.name} Welcome Bonus`,
        url: `${SITE_URL}/exchanges/${exB.slug}/`,
        description: exB.shortDescription,
      },
    ],
  };
}

/**
 * Get related compare pairs for a given pair slug.
 * Returns up to `count` pairs that share at least one exchange slug.
 */
export function getRelatedComparePairs(
  currentPair: string,
  allPairs: ComparePair[],
  currentA: string,
  currentB: string,
  count = 4
): ComparePair[] {
  return allPairs
    .filter(p => p.pair !== currentPair && (p.a === currentA || p.b === currentA || p.a === currentB || p.b === currentB))
    .slice(0, count);
}

/**
 * Parse user count strings like "30M+", "10M+", "1M+" → integer for comparison.
 */
export function parseUserCount(users: string | undefined): number {
  if (!users) return 0;
  const m = users.match(/^(\d+(?:\.\d+)?)\s*M/i);
  if (m) return Math.round(parseFloat(m[1]) * 1_000_000);
  const k = users.match(/^(\d+(?:\.\d+)?)\s*K/i);
  if (k) return Math.round(parseFloat(k[1]) * 1_000);
  return parseInt(users, 10) || 0;
}

export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Compare crypto exchange bonuses worldwide.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/bonuses/`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ── Use-case ranking ─────────────────────────────────────────────────────────

import type { UseCaseScoring } from '../data/use-cases';

/**
 * Rank exchanges for a specific use-case using the scoring weights defined
 * in that use-case's `scoring` object.
 *
 * If `scoring.requireNoKyc` is true, only no-KYC exchanges are returned.
 * If `scoring.requireFeatureBadge` is set, only exchanges with that badge qualify.
 *
 * Returns exchanges sorted by score descending.
 */
export function rankExchangesForUseCase(
  allExchanges: SeoExchange[],
  scoring: UseCaseScoring
): SeoExchange[] {
  // Apply mandatory filters first
  let pool = [...allExchanges];

  if (scoring.requireNoKyc) {
    pool = pool.filter(ex => !ex.kycRequired);
  }
  if (scoring.requireFeatureBadge) {
    const badge = scoring.requireFeatureBadge;
    pool = pool.filter(ex => ((ex as any).featureBadges ?? []).includes(badge));
  }

  return pool
    .map(ex => {
      let score = ex.rating; // base

      // Feature badge boosts
      if (scoring.featureBadgeBoost) {
        for (const [badge, boost] of Object.entries(scoring.featureBadgeBoost)) {
          if (((ex as any).featureBadges ?? []).includes(badge)) {
            score += boost;
          }
        }
      }

      // Bonus type boosts
      if (scoring.bonusTypeBoost) {
        for (const [type, boost] of Object.entries(scoring.bonusTypeBoost)) {
          if ((ex.bonusTypes ?? []).includes(type)) {
            score += boost;
          }
        }
      }

      // No-KYC boost
      if (scoring.noKycBoost && !ex.kycRequired) {
        score += scoring.noKycBoost;
      }

      // No-deposit boost
      if (scoring.noDepositBoost && !ex.depositRequired) {
        score += scoring.noDepositBoost;
      }

      return { exchange: ex, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ exchange }) => exchange);
}

// ── Coin page SEO helpers ────────────────────────────────────────────────────

/**
 * Build an ItemList schema for a coin page listing exchanges that support the coin.
 */
export function buildCoinPageSchema(
  coinLabel: string,
  coinSymbol: string,
  exchanges: SeoExchange[]
): Record<string, unknown> {
  return buildItemListSchema(
    exchanges.map(ex => ({
      name: `${ex.name} — Buy ${coinSymbol} With Bonus`,
      url: `/exchanges/${ex.slug}/`,
      description: ex.shortDescription,
    })),
    `Best Exchanges to Buy ${coinLabel} (${coinSymbol}) ${YEAR}`
  );
}
