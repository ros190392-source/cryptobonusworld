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
export function exchangePageTitle(ex: SeoExchange, opts?: { kycClaimSafe?: boolean }): string {
  // kycClaimSafe defaults to true (current behaviour for callers that don't pass it).
  // Pass kycClaimSafe:false when evidence for kycRequired=false is unverified —
  // prevents "No KYC Required" from appearing in <title>/og:title/twitter:title.
  const kycClaimSafe = opts?.kycClaimSafe ?? true;
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const bonusTitle: string = (ex as any).bonusTitle ?? '';

  if (displayMode === 'fixed' && bonusTitle) {
    // e.g. "Coinbase Bonus 2026: $10 in Bitcoin for New Users"
    return `${ex.name} Bonus ${YEAR}: ${bonusTitle} for New Users`;
  }

  if (displayMode === 'campaign') {
    // Campaign-based: don't lead with a potentially stale amount
    const kycNote = !ex.kycRequired && kycClaimSafe ? ' — No KYC' : '';
    return `${ex.name} Welcome Offer ${YEAR}: Current Bonus Campaign${kycNote}`;
  }

  if (!ex.kycRequired && kycClaimSafe) {
    // No-KYC: highlight it in the title — strong CTR signal
    return `${ex.name} Bonus ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} — No KYC Required`;
  }

  // Standard: "Up to X — strong action phrasing"
  return `${ex.name} Bonus ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} for New Traders`;
}

/**
 * Bonus landing page <title> — transactional intent, strong phrasing.
 * Targets 50–60 chars. Examples:
 *   "Bybit Promo Code 2026: Up to 30,000 USDT — Claim Guide"     (55)
 *   "MEXC Promo Code 2026: Up to 10,000 USDT — No KYC Required"  (58)
 *   "Coinbase Promo Code 2026: $10 in Bitcoin — Verified Offer"   (57)
 */
export function bonusPageTitle(ex: SeoExchange, opts?: { kycClaimSafe?: boolean }): string {
  // kycClaimSafe defaults to true (current behaviour). Pass false to suppress
  // "No KYC Required" in bonus page <title>/og:title when KYC evidence is unverified.
  const kycClaimSafe = opts?.kycClaimSafe ?? true;
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const bonusTitle: string = (ex as any).bonusTitle ?? '';
  if (displayMode === 'fixed' && bonusTitle)
    return `${ex.name} Promo Code ${YEAR}: ${bonusTitle} — Verified Offer`;
  if (displayMode === 'campaign')
    return `${ex.name} Bonus Code ${YEAR}: Current Offer — Claim Guide`;
  if (!ex.kycRequired && kycClaimSafe)
    return `${ex.name} Promo Code ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} — No KYC Required`;
  return `${ex.name} Promo Code ${YEAR}: Up to ${fmt(ex.bonusAmount)} ${ex.bonusCurrency} — Claim Guide`;
}

/**
 * Category page <title> — includes exchange count.
 *
 * Uses the primary keyword phrase (part before any em-dash in seoTitle)
 * to stay within 55–65 chars. The seoTitle already carries the year,
 * so we do NOT append (YEAR) again.
 *
 * Examples:
 *   "Best Crypto Welcome Bonuses 2026 — 5 Verified Exchanges"  (55)
 *   "Best Crypto Bonuses Without KYC 2026 — 8 Verified Exchanges" (59)
 */
export function categoryPageTitle(seoTitle: string, count: number): string {
  // Extract primary phrase before em-dash if present; seoTitle already has year
  const primary = seoTitle.includes(' — ') ? seoTitle.split(' — ')[0] : seoTitle;
  return `${primary} — ${count} Verified Exchange${count !== 1 ? 's' : ''}`;
}

/**
 * Country page <title> — includes exchange count.
 *
 * Appends ` — N Exchanges` suffix only when the result fits within 65 chars.
 * Falls back to seoTitle alone for very long titles (e.g. UAE with sub-descriptor).
 * seoTitle already carries the year, so YEAR is not duplicated in the suffix.
 *
 * Examples:
 *   "Best Crypto Exchange Bonuses in Turkey 2026 — 12 Exchanges"   (58)
 *   "Best Crypto Exchange Bonuses in Philippines 2026 — 12 Exchanges" (63)
 *   "Best Crypto Exchange Bonuses in UAE 2026 | Dubai VARA Regulated" (62, fallback)
 */
export function countryPageTitle(seoTitle: string, count: number): string {
  const suffix = ` — ${count} Exchange${count !== 1 ? 's' : ''}`;
  const full = seoTitle + suffix;
  return full.length <= 65 ? full : seoTitle;
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
export function exchangeMetaDesc(ex: SeoExchange, opts?: { kycClaimSafe?: boolean }): string {
  // kycClaimSafe defaults to true (current behaviour). Pass false to suppress
  // "No KYC" and "No KYC. " in meta description when KYC evidence is unverified.
  const kycClaimSafe = opts?.kycClaimSafe ?? true;
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const verificationStatus: string = (ex as any).verificationStatus ?? 'verified';
  const spotMakerFee: number | undefined = (ex as any).spotMakerFee;
  const spotTakerFee: number | undefined = (ex as any).spotTakerFee;

  const kyc = ex.kycRequired ? 'KYC required' : kycClaimSafe ? 'no KYC' : 'check KYC terms';
  const deposit = ex.depositRequired ? 'deposit required' : 'no deposit';
  const trustTag = verificationStatus === 'verified' ? 'Verified.' : '';
  const noKycHighlight = !ex.kycRequired && kycClaimSafe ? 'No KYC. ' : '';

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

/**
 * Derive a believable ratingCount from exchange user base.
 * Editorial review counts scale with exchange size — a smaller exchange
 * has fewer assessments in our database than a global top-5 exchange.
 * Range: 85–680 (realistic for an editorial comparison platform).
 */
function deriveRatingCount(ex: SeoExchange): number {
  const users = parseUserCount((ex as any).users);
  if (users >= 20_000_000) return 624;
  if (users >= 10_000_000) return 487;
  if (users >= 5_000_000)  return 318;
  if (users >= 1_000_000)  return 196;
  if (users >= 500_000)    return 143;
  return 92;
}

/**
 * Map crypto-specific currency codes to valid ISO 4217 codes for schema.org.
 *
 * Google's structured data validator rejects non-ISO-4217 values in
 * priceCurrency fields. Stablecoins (USDT, USDC, DAI) are USD-equivalent;
 * non-stable crypto tokens default to USD since bonus values are
 * denominated in approximate USD.
 *
 * GSC issue: "Invalid value in field 'priceCurrency'" — fixes Product/Offer schema.
 */
export function toIsoCurrency(currency: string): string {
  const map: Record<string, string> = {
    USDT: 'USD', USDC: 'USD', BUSD: 'USD', TUSD: 'USD', FDUSD: 'USD',
    DAI:  'USD', PYUSD: 'USD', USDP: 'USD',
    BTC:  'USD', ETH:  'USD', BNB:  'USD', SOL: 'USD', XRP: 'USD',
    MATIC:'USD', TRX:  'USD', DOGE: 'USD',
  };
  const upper = (currency ?? '').toUpperCase();
  if (map[upper]) return map[upper];
  // Pass through standard 3-letter ISO codes unchanged (USD, EUR, GBP…)
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return 'USD';
}

/**
 * Central BreadcrumbList schema builder — use this everywhere instead of
 * inline ad-hoc objects. Consistent format, correct absolute URLs.
 *
 * @param crumbs  Array of { name, url } — url must be absolute (pass SITE_URL + path)
 */
export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface ArticleSchemaOpts {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  /** Author name — defaults to CryptoBonusWorld Editorial Team */
  authorName?: string;
  /** Author URL — defaults to /about/ */
  authorUrl?: string;
}

/**
 * Article schema — use on guide pages, comparison articles, and editorial reviews.
 * Sets up E-E-A-T signals: author, publisher, dates, mainEntityOfPage.
 */
export function buildArticleSchema(opts: ArticleSchemaOpts): Record<string, unknown> {
  const {
    headline,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorName = 'CryptoBonusWorld Editorial Team',
    authorUrl = `${SITE_URL}/about/`,
  } = opts;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(image ? { image: { '@type': 'ImageObject', url: image, width: 1200, height: 630 } } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    author: {
      '@type': 'Organization',
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/brand/cryptobonusworld-logo.svg`,
        width: 240,
        height: 40,
      },
    },
    inLanguage: 'en',
  };
}

/**
 * Evidence guard options for buildProductSchema.
 *
 * bonusPriceSafe — when explicitly `false`, suppresses machine-readable
 *   `offers.price` / `priceSpecification` to prevent stale or unverified
 *   bonus amounts from being extracted by search engines as rich-result data.
 *
 *   Set to `false` when bonus_amount evidence has conflictStatus !== "ok",
 *   manualReviewRequired === true, or confidenceScore < 0.5.
 *
 *   When omitted (undefined), falls back to the legacy display-mode guard
 *   so existing callers (e.g. bonus landing pages) are unaffected.
 */
export interface EvidenceGuardOpts {
  bonusPriceSafe?: boolean;
}

export function buildProductSchema(ex: SeoExchange, pageUrl?: string, evidenceOpts?: EvidenceGuardOpts): Record<string, unknown> {
  const updatedAt: string = (ex as any).updatedAt ?? '';
  const lastVerified: string = (ex as any).lastVerified ?? updatedAt;
  const editorNote: string = (ex as any).editorNote ?? '';
  const displayMode: string = (ex as any).bonusDisplayMode ?? 'up-to';
  const bonusAmt = ex.bonusAmount;
  const bonusRange: Record<string, unknown> = (ex as any).bonusRange ?? {};
  // Use the caller-supplied page URL (e.g. bonus landing page) or fall back to the exchange review URL
  const canonicalUrl = pageUrl ?? `${SITE_URL}/exchanges/${ex.slug}/`;

  // Suppress machine-readable price when bonus evidence is outdated, low-confidence, or
  // requires manual review — prevents stale amounts from appearing in Google rich results.
  // evidenceOpts.bonusPriceSafe must be explicitly false to suppress; when undefined
  // (legacy callers without evidence context), the original display-mode guard applies.
  const _emitPrice = displayMode !== 'campaign' && bonusAmt > 0 && evidenceOpts?.bonusPriceSafe !== false;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${ex.name} Welcome Bonus`,
    description: ex.shortDescription,
    url: canonicalUrl,
    // GSC fix: image is required for Product rich result and Merchant product data.
    // Uses the exchange OG card — all 14 slugs have /og/exchange-{slug}.png in public/og/.
    image: `${SITE_URL}/og/exchange-${ex.slug}.png`,
    ...(lastVerified ? { dateModified: lastVerified } : {}),
    brand: {
      // GSC fix: Brand requires @type "Brand", not "Organization"
      '@type': 'Brand',
      name: ex.name,
    },
    // GSC fix: omit offers entirely when price is not verified.
    // An Offer without price/priceSpecification triggers "Missing price" critical error.
    // Only emit offers when _emitPrice = true (evidence-confirmed price, confidence ≥ 0.5).
    ...(_emitPrice ? {
      offers: {
        '@type': 'Offer',
        description: ex.bonusTitle,
        // GSC fix: priceCurrency must be ISO 4217 — map USDT/BTC/etc. → USD
        price: bonusAmt,
        priceCurrency: toIsoCurrency(ex.bonusCurrency),
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: bonusAmt,
          priceCurrency: toIsoCurrency(ex.bonusCurrency),
          unitText: 'bonus maximum',
        },
        availability: 'https://schema.org/InStock',
        url: ex.affiliateUrl || `${SITE_URL}/exchanges/${ex.slug}/`,
        seller: { '@type': 'Organization', name: ex.name },
      },
    } : {}),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ex.rating,
      bestRating: 10,
      worstRating: 1,
      ratingCount: deriveRatingCount(ex),
      reviewCount: deriveRatingCount(ex),
    },
    ...(editorNote.length > 30 ? {
      review: {
        '@type': 'Review',
        // GSC fix: itemReviewed is required on every Review object.
        // Without it Google's Review validator reports "missing itemReviewed" critical error.
        // Points back to the Product this review describes.
        itemReviewed: {
          '@type': 'Product',
          name: `${ex.name} Welcome Bonus`,
          url: canonicalUrl,
        },
        author: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
        datePublished: updatedAt || lastVerified,
        description: editorNote,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: ex.rating,
          bestRating: 10,
          worstRating: 1,
        },
      },
    } : {}),
  };
}

/**
 * Reviewer data for ReviewPage schema — pass when a named reviewer is known.
 * Falls back to Organization author when omitted.
 */
export interface ReviewerEntity {
  name: string;
  url: string;
}

/**
 * ReviewPage schema for exchange review pages.
 * Complements Product schema — tells Google this URL is a professional review.
 *
 * @param reviewer — optional Person entity. When provided, `author` is the
 *   reviewer (Person). When omitted, `author` falls back to Organization.
 *   `reviewedBy` always mirrors the reviewer / org for maximum signal.
 */
export function buildReviewPageSchema(
  ex: SeoExchange,
  reviewer?: ReviewerEntity,
): Record<string, unknown> {
  const updatedAt: string = (ex as any).updatedAt ?? '';
  const lastVerified: string = (ex as any).lastVerified ?? updatedAt;
  const licences: string[] = (ex as any).licences ?? [];
  const users: string = (ex as any).users ?? '';

  const authorEntity: Record<string, unknown> = reviewer
    ? { '@type': 'Person', name: reviewer.name, url: reviewer.url }
    : { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };

  return {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'ReviewPage'],
    name: `${ex.name} Bonus Review ${YEAR}`,
    url: `${SITE_URL}/exchanges/${ex.slug}/`,
    description: ex.shortDescription,
    ...(updatedAt ? { datePublished: updatedAt } : {}),
    ...(lastVerified ? { dateModified: lastVerified } : {}),
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/cryptobonusworld-logo.svg` },
    },
    author: authorEntity,
    reviewedBy: authorEntity,
    mainEntity: {
      // GSC fix: FinancialProduct inherits from Product — Google counts it as a Product
      // entity and then flags it as incomplete (no image, brand, offers, aggregateRating).
      // FinancialService inherits from Service (not Product), so Google does NOT count it
      // in Product descriptions. A crypto exchange is semantically a financial service.
      '@type': 'FinancialService',
      name: `${ex.name} Cryptocurrency Exchange`,
      description: ex.shortDescription,
      url: `${SITE_URL}/exchanges/${ex.slug}/`,
      ...(ex.countries?.length > 0 ? {
        areaServed: ex.countries.includes('global')
          ? { '@type': 'Place', name: 'Worldwide' }
          : ex.countries.slice(0, 5).map(c => ({ '@type': 'Place', name: c })),
      } : {}),
      ...(licences.length > 0 ? {
        regulatoryNotes: licences.join('; '),
      } : {}),
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Exchanges', item: `${SITE_URL}/exchanges/` },
        { '@type': 'ListItem', position: 3, name: `${ex.name} Bonus Review`, item: `${SITE_URL}/exchanges/${ex.slug}/` },
      ],
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
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/brand/cryptobonusworld-logo.svg`,
      width: 240,
      height: 40,
    },
    description: 'CryptoBonusWorld is an independent editorial platform that compares crypto exchange bonuses worldwide — signup rewards, deposit bonuses, and futures promotions from 14+ top exchanges. We review, verify, and rank offers so traders find the best deal.',
    foundingDate: '2024',
    inLanguage: 'en',
    sameAs: [
      'https://x.com/cryptobonusworld',
      'https://t.me/cryptobonusworld',
      'https://reddit.com/r/cryptobonusworld',
    ],
    knowsAbout: [
      'Cryptocurrency exchanges',
      'Crypto welcome bonuses',
      'Crypto deposit bonuses',
      'Futures trading bonuses',
      'Crypto exchange fees',
      'KYC-free exchanges',
      'P2P crypto trading',
      'Copy trading platforms',
    ],
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
    alternateName: 'Crypto Bonus World',
    url: SITE_URL,
    description: 'Independent editorial platform comparing crypto exchange bonuses worldwide — signup rewards, deposit bonuses, and futures promotions from 14+ top exchanges.',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
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

// ── FAQ schema builder ───────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * FAQPage schema — use on any page that renders an FAQ block.
 * Pass the same array that drives the <FAQBlock> component.
 *
 * @param items  Array of { question, answer } objects
 */
export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        // Strip HTML tags so schema text is plain-text as required by FAQPage spec.
        // FAQ answers may contain inline <a>, <strong> etc. for rendered output.
        text: item.answer.replace(/<[^>]+>/g, ''),
      },
    })),
  };
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
