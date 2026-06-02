/**
 * recommendationEngine.ts — CryptoBonusWorld Smart Affiliate Routing
 *
 * Contextual recommendation logic for client-side personalisation.
 * All functions are pure — no side effects, no DOM access, no framework imports.
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 * Static site: server renders all exchanges in editorial order (by rating).
 * Client reads visitor context from window.cbw.meta and applies SOFT contextual
 * signals: which exchange to highlight as "Best for you", what CTA copy to show,
 * and which onboarding hint to surface.
 *
 * NO exchange is ever hidden. NO ranking is reversed by more than TRUST_CAP points.
 * Editorial score remains the dominant factor at all times.
 *
 * ── Trust-safe rules (HARD constraints) ──────────────────────────────────────
 * 1. Exchanges with rating < RATING_FLOOR cannot be featured #1 (editorial veto)
 * 2. Total commercial context boost is capped at TRUST_CAP (prevents gaming)
 * 3. Excluded countries always filtered before scoring
 * 4. `status !== 'active'` exchanges receive max 50% of context boost
 * 5. Featured exchange must still have the highest TOTAL score — no pure override
 *
 * ── Visitor context signals ───────────────────────────────────────────────────
 * geo:             2-letter code from IANA timezone (already in Analytics)
 * device:          'mobile' | 'tablet' | 'desktop' (already in Analytics)
 * intent:          inferred from current page type + referrer
 * noKycPreference: true for GEO markets with evolving regulations
 * isFirstVisit:    inferred from sessionStorage pagecount
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisitorIntent =
  | 'beginner'      // First visit, low engagement, wants simple onboarding
  | 'no-kyc'        // Privacy-sensitive, came from no-kyc category
  | 'futures'       // Active derivatives trader, came from futures category
  | 'high-value'    // Came from high-bonus exchange pages
  | 'experienced'   // Multiple sessions, visited compare pages
  | 'unknown';

export interface VisitorContext {
  geo:              string;   // 'tr' | 'in' | 'id' | 'ng' | 'br' | 'vn' | 'ph' | 'unknown'
  device:           string;   // 'mobile' | 'tablet' | 'desktop'
  intent:           VisitorIntent;
  noKycPreference:  boolean;  // true for evolving-regulation GEO markets
  isFirstVisit:     boolean;  // true on first session
}

// Minimal exchange shape the engine needs — matches exchanges.json runtime shape
export interface RecommendableExchange {
  slug:            string;
  name:            string;
  rating:          number;
  kycRequired:     boolean;
  depositRequired: boolean;
  bonusAmount:     number;
  bonusCurrency:   string;
  bonusTypes:      string[];
  paymentMethods:  string[];
  countries:       string[];
  excludedCountries: string[];
  topChoice?:      boolean;
  status?:         string;
  minDeposit?:     { amount: number; currency: string } | null;
}

export interface RecommendationResult {
  slug:            string;
  name:            string;
  editorialScore:  number;
  contextBoost:    number;
  totalScore:      number;
  ctaLabel:        string;
  ctaLabelShort:   string;
  isBestForContext: boolean;  // true for the top-ranked contextual pick
  contextReason:   string;    // human-readable reason (for UI label)
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum editorial rating to be eligible as the #1 featured exchange */
export const RATING_FLOOR = 8.5;

/** Maximum total contextual boost (trust-safe cap) */
export const TRUST_CAP = 2.0;

/**
 * GEO markets where no-KYC is strongly preferred due to regulatory uncertainty.
 * Users in these markets get a stronger no-KYC signal in recommendations.
 */
export const NOKYCPREF_GEOS = new Set(['tr', 'in', 'ng', 'vn', 'id']);

/**
 * GEO → primary payment method preference.
 * Used to boost exchanges that support the local preferred method.
 */
export const GEO_PAYMENT_PREF: Record<string, string[]> = {
  tr: ['p2p', 'bank transfer'],
  in: ['p2p', 'upi'],
  id: ['p2p', 'bank transfer'],
  ng: ['p2p', 'crypto'],
  br: ['pix', 'bank transfer', 'p2p'],
  vn: ['p2p', 'bank transfer'],
  ph: ['p2p', 'bank transfer', 'card'],
};

// ── Visitor context inference ─────────────────────────────────────────────────

/**
 * Infer whether the user has a strong no-KYC preference based on their GEO.
 * This is a factual signal, not a commercial one — evolving-regulation markets
 * genuinely benefit from no-KYC exchanges.
 */
export function inferNoKycPreference(geo: string): boolean {
  return NOKYCPREF_GEOS.has(geo);
}

/**
 * Infer visitor intent from page type and navigation context.
 * Intent is used to weight recommendation scoring.
 *
 * Called client-side with values from window.cbw.meta + current page.
 */
export function inferVisitorIntent(
  pageType: string,
  categorySlug?: string | null,
  referrerPath?: string | null,
): VisitorIntent {
  // Explicit no-kyc intent: came from the no-kyc category
  if (categorySlug === 'no-kyc' || referrerPath?.includes('/categories/no-kyc')) {
    return 'no-kyc';
  }
  // Futures intent: came from futures category or exchange pages with futures focus
  if (categorySlug === 'futures-bonuses' || referrerPath?.includes('/categories/futures')) {
    return 'futures';
  }
  // High-value intent: compare pages, multiple exchange visits
  if (pageType === 'compare' || referrerPath?.includes('/compare/')) {
    return 'experienced';
  }
  // Beginner: homepage or bonuses listing, no deep navigation
  if (pageType === 'homepage' || pageType === 'bonuses') {
    return 'beginner';
  }
  return 'unknown';
}

/**
 * Build a complete VisitorContext from the data available in Analytics.astro's
 * window.cbw.meta. Called client-side — safe to call before DOM ready.
 */
export function buildVisitorContext(meta: {
  geoCode: string;
  deviceType: string;
  pageType?: string;
  categorySlug?: string | null;
  sessionPageCount?: number;
}): VisitorContext {
  const geo    = meta.geoCode   ?? 'unknown';
  const device = meta.deviceType ?? 'desktop';

  return {
    geo,
    device,
    intent:          inferVisitorIntent(meta.pageType ?? 'unknown', meta.categorySlug),
    noKycPreference: inferNoKycPreference(geo),
    isFirstVisit:    (meta.sessionPageCount ?? 1) <= 1,
  };
}

// ── Editorial base score (mirrors affiliateUtils.editorialScore) ──────────────

/**
 * Base editorial score — identical logic to affiliateUtils.ts editorialScore().
 * Kept in sync manually — see affiliateUtils.ts for the authoritative definition.
 */
function editorialBaseScore(ex: RecommendableExchange): number {
  let score = ex.rating * 2.0;
  if (!ex.kycRequired)    score += 1.5;
  if (!ex.depositRequired) score += 1.0;
  if (ex.topChoice)        score += 2.5;
  score += Math.log10(ex.bonusAmount + 1) * 0.5;
  return score;
}

// ── Context boost ─────────────────────────────────────────────────────────────

/**
 * Calculate the contextual boost for an exchange given the current visitor context.
 * Returns a value in [0, TRUST_CAP].
 *
 * Boost components:
 *   geoBoost    — exchange fit for user's market (0 – 1.2)
 *   deviceBoost — exchange UX fit for user's device (0 – 0.4)
 *   intentBoost — exchange fit for inferred user intent (0 – 0.8)
 */
export function calculateContextBoost(
  ex: RecommendableExchange,
  ctx: VisitorContext,
): number {
  // Status penalty: paused/review exchanges get max 50% boost
  const statusMultiplier = (ex.status && ex.status !== 'active') ? 0.5 : 1.0;

  let boost = 0;

  // ── GEO boost ─────────────────────────────────────────────────────────────
  let geoBoost = 0;

  if (ctx.geo !== 'unknown') {
    // Exchange available in this GEO?
    const availableInGeo =
      ex.countries.includes('global') ||
      ex.countries.includes(GEO_TO_COUNTRY_SLUG[ctx.geo] ?? '') ||
      ex.countries.includes(ctx.geo);

    // Excluded from this GEO? → full veto
    const countrySlug = GEO_TO_COUNTRY_SLUG[ctx.geo] ?? ctx.geo;
    if ((ex.excludedCountries ?? []).includes(countrySlug) ||
        (ex.excludedCountries ?? []).includes(ctx.geo)) {
      return -999; // Excluded — filtered out before ranking
    }

    if (availableInGeo) {
      // No-KYC boost in high-preference GEO markets
      if (ctx.noKycPreference && !ex.kycRequired) {
        geoBoost += ctx.geo === 'ng' ? 1.2 : 0.8;
      }

      // Payment method overlap boost
      const prefMethods = GEO_PAYMENT_PREF[ctx.geo] ?? [];
      const exMethods   = (ex.paymentMethods ?? []).map(m => m.toLowerCase());
      const overlap = prefMethods.filter(p => exMethods.some(m => m.includes(p))).length;
      geoBoost += Math.min(overlap * 0.3, 0.6);
    }
  }

  // ── Device boost ─────────────────────────────────────────────────────────
  let deviceBoost = 0;

  if (ctx.device === 'mobile') {
    // Mobile users prefer simpler onboarding: no-kyc, no-deposit
    if (!ex.kycRequired)    deviceBoost += 0.2;
    if (!ex.depositRequired) deviceBoost += 0.2;
  } else if (ctx.device === 'desktop') {
    // Desktop users are more likely advanced — slight boost for futures
    if (ex.bonusTypes.includes('futures') && ex.bonusAmount >= 5000) {
      deviceBoost += 0.2;
    }
  }

  // ── Intent boost ──────────────────────────────────────────────────────────
  let intentBoost = 0;

  switch (ctx.intent) {
    case 'beginner':
      // Beginners want low friction
      if (!ex.kycRequired)     intentBoost += 0.4;
      if (!ex.depositRequired) intentBoost += 0.3;
      if (ex.minDeposit && ex.minDeposit.amount <= 50) intentBoost += 0.1;
      break;

    case 'no-kyc':
      // Strong no-kyc intent signal
      if (!ex.kycRequired)     intentBoost += 0.7;
      if (!ex.depositRequired) intentBoost += 0.3;
      break;

    case 'futures':
      // Futures traders want high bonus + derivatives platform
      if (ex.bonusTypes.includes('futures'))  intentBoost += 0.4;
      if (ex.bonusAmount >= 5000)             intentBoost += 0.3;
      break;

    case 'high-value':
    case 'experienced':
      // Experienced traders value platform quality + bonus ceiling
      if (ex.bonusAmount >= 5000)  intentBoost += 0.4;
      if (ex.rating >= 9.5)        intentBoost += 0.3;
      break;
  }

  boost = geoBoost + deviceBoost + intentBoost;

  // Apply status multiplier and hard cap
  return Math.min(boost * statusMultiplier, TRUST_CAP);
}

/** Maps 2-letter geo code to country slug in countries.json */
export const GEO_TO_COUNTRY_SLUG: Record<string, string> = {
  tr: 'turkey',
  in: 'india',
  id: 'indonesia',
  ng: 'nigeria',
  br: 'brazil',
  vn: 'vietnam',
  ph: 'philippines',
};

// ── Full scoring ──────────────────────────────────────────────────────────────

/**
 * Score a single exchange for the given visitor context.
 * Returns -Infinity for excluded exchanges.
 */
export function scoreExchangeForContext(
  ex: RecommendableExchange,
  ctx: VisitorContext,
): number {
  const boost = calculateContextBoost(ex, ctx);
  if (boost === -999) return -Infinity; // Excluded in this market

  return editorialBaseScore(ex) + boost;
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/**
 * Rank exchanges for a given visitor context.
 * Returns a sorted array with recommendation metadata.
 *
 * Trust-safe guarantees:
 *  - Excluded exchanges have totalScore = -Infinity (filtered by caller if needed)
 *  - Featured (#1) must have rating >= RATING_FLOOR
 *  - If top-scored exchange fails RATING_FLOOR, the next qualifying one is featured
 */
export function rankForContext(
  exchanges: RecommendableExchange[],
  ctx: VisitorContext,
): RecommendationResult[] {
  const scored = exchanges.map(ex => {
    const editorialScore = editorialBaseScore(ex);
    const contextBoost   = calculateContextBoost(ex, ctx);
    const totalScore     = contextBoost === -999
      ? -Infinity
      : editorialScore + Math.min(contextBoost, TRUST_CAP);

    return {
      slug:          ex.slug,
      name:          ex.name,
      editorialScore,
      contextBoost:  contextBoost === -999 ? 0 : contextBoost,
      totalScore,
      ctaLabel:      getAdaptiveCTA(ex, ctx),
      ctaLabelShort: getAdaptiveCTAShort(ex, ctx),
      isBestForContext: false,
      contextReason: getContextReason(ex, ctx),
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Mark the #1 featured — must meet RATING_FLOOR (trust-safe rule)
  const featuredIdx = scored.findIndex(
    r => r.totalScore > -Infinity && (exchanges.find(e => e.slug === r.slug)?.rating ?? 0) >= RATING_FLOOR
  );
  if (featuredIdx >= 0) {
    scored[featuredIdx].isBestForContext = true;
  }

  return scored;
}

/**
 * Get just the featured (best for context) exchange slug.
 * Returns null if no exchange passes the trust-safe floor.
 */
export function getFeaturedSlug(
  exchanges: RecommendableExchange[],
  ctx: VisitorContext,
): string | null {
  const ranked = rankForContext(exchanges, ctx);
  return ranked.find(r => r.isBestForContext)?.slug ?? null;
}

// ── Adaptive CTA copy ─────────────────────────────────────────────────────────

/**
 * Generate context-aware CTA copy for an exchange.
 * Extends affiliateUtils.getCtaLabel() with geo and intent signals.
 *
 * Priority:
 *  1. GEO-specific framing (strongest cultural relevance)
 *  2. Intent-based framing
 *  3. Exchange property-based (from affiliateUtils, baseline)
 */
export function getAdaptiveCTA(ex: RecommendableExchange, ctx: VisitorContext): string {
  const name = ex.name;

  // GEO-specific framing
  if (ctx.geo !== 'unknown' && ctx.noKycPreference && !ex.kycRequired) {
    const GEO_LABELS: Record<string, string> = {
      ng: `Get ${name} Bonus — No KYC, P2P Available`,
      tr: `Claim ${name} — No KYC Required`,
      in: `Claim ${name} Bonus — No KYC`,
      vn: `Claim ${name} — No KYC, P2P Deposit`,
      id: `Claim ${name} — No KYC`,
    };
    if (GEO_LABELS[ctx.geo]) return GEO_LABELS[ctx.geo];
  }

  // Intent-based framing
  switch (ctx.intent) {
    case 'beginner':
      if (!ex.kycRequired && !ex.depositRequired)
        return `Start Free — ${name} No KYC Bonus`;
      if (!ex.kycRequired)
        return `Get Started — ${name} No KYC`;
      break;

    case 'no-kyc':
      if (!ex.kycRequired)
        return `Claim ${name} — No Identity Check`;
      break;

    case 'futures':
      if (ex.bonusTypes.includes('futures'))
        return `Claim ${name} Futures Bonus`;
      break;

    case 'experienced':
    case 'high-value':
      if (ex.bonusAmount >= 10000)
        return `Claim Up to ${(ex.bonusAmount / 1000).toFixed(0)}K USDT — ${name}`;
      break;
  }

  // Mobile: shorter copy fits better
  if (ctx.device === 'mobile') {
    if (!ex.kycRequired && !ex.depositRequired) return `No KYC · No Deposit →`;
    if (!ex.kycRequired) return `Claim — No KYC →`;
    return `Claim Bonus →`;
  }

  // Baseline exchange-property CTA (same as affiliateUtils.getCtaLabel)
  if (!ex.kycRequired && !ex.depositRequired) return `Get ${name} Bonus — No KYC or Deposit`;
  if (!ex.kycRequired) return `Claim ${name} Bonus — No KYC`;
  if (!ex.depositRequired) return `Claim ${name} — No Deposit Needed`;
  if (ex.bonusTypes.includes('futures') && ex.bonusAmount >= 5000) return `Claim ${name} Futures Bonus`;
  return `Claim ${name} Bonus`;
}

/** Short version for table/card row CTAs (≤28 chars) */
export function getAdaptiveCTAShort(ex: RecommendableExchange, ctx: VisitorContext): string {
  if (ctx.noKycPreference && !ex.kycRequired && !ex.depositRequired) return 'No KYC · No Deposit →';
  if (ctx.noKycPreference && !ex.kycRequired) return 'Claim — No KYC →';
  if (!ex.kycRequired && !ex.depositRequired) return 'No KYC · No Deposit →';
  if (!ex.kycRequired) return 'Claim — No KYC →';
  if (!ex.depositRequired) return 'No Deposit →';
  return 'Claim Bonus →';
}

// ── Context reason labels ─────────────────────────────────────────────────────

/**
 * Human-readable reason why this exchange is recommended for the context.
 * Shown as a badge label: "Best for your region" / "No KYC required" / etc.
 * Kept factual and non-deceptive.
 */
export function getContextReason(
  ex: RecommendableExchange,
  ctx: VisitorContext,
): string {
  const countrySlug = GEO_TO_COUNTRY_SLUG[ctx.geo];

  if (ctx.geo !== 'unknown' && countrySlug && ctx.noKycPreference && !ex.kycRequired) {
    const GEO_NAMES: Record<string, string> = {
      tr: 'Turkey', in: 'India', id: 'Indonesia',
      ng: 'Nigeria', br: 'Brazil', vn: 'Vietnam', ph: 'Philippines',
    };
    return `Best for ${GEO_NAMES[ctx.geo] ?? 'your region'}`;
  }

  switch (ctx.intent) {
    case 'beginner':
      if (!ex.kycRequired && !ex.depositRequired) return 'Easiest to start';
      if (!ex.kycRequired) return 'No ID required';
      break;
    case 'no-kyc':
      if (!ex.kycRequired) return 'No KYC required';
      break;
    case 'futures':
      if (ex.bonusTypes.includes('futures')) return 'Best futures bonus';
      break;
    case 'experienced':
      if (ex.bonusAmount >= 10000) return 'Highest bonus ceiling';
      break;
  }

  if (ex.topChoice) return 'Top editorial pick';
  if (!ex.kycRequired) return 'No KYC required';
  return 'Top rated';
}

// ── Onboarding hints ──────────────────────────────────────────────────────────

export interface OnboardingHint {
  type: 'tip' | 'info' | 'warning';
  body: string;
}

/**
 * Returns a contextual onboarding hint to show first-time visitors.
 * Returns null for returning visitors or unknown context.
 * These are factual tips, not marketing copy.
 */
export function getOnboardingHint(ctx: VisitorContext): OnboardingHint | null {
  if (!ctx.isFirstVisit && ctx.intent === 'unknown') return null;

  // GEO-specific market tips
  const GEO_HINTS: Record<string, OnboardingHint> = {
    ng: { type: 'tip',  body: 'Most Nigerian users fund via P2P trading (NGN → USDT) — no bank required. Filter by No KYC for the fastest start.' },
    tr: { type: 'tip',  body: 'P2P with TRY is the most popular on-ramp in Turkey. Look for exchanges with strong P2P desks.' },
    in: { type: 'info', body: 'Note: OKX does not accept Indian users. MEXC, Bybit and Bitget are all available in India.' },
    vn: { type: 'tip',  body: 'P2P trading with VND is the standard method for Vietnamese users. Bybit and MEXC have the deepest VND liquidity.' },
    id: { type: 'tip',  body: 'Indonesian users can fund via P2P with IDR through major local banks (BCA, Mandiri, BRI).' },
    br: { type: 'tip',  body: 'Brazilian users can use PIX for fast BRL deposits via P2P counterparties on most major exchanges.' },
    ph: { type: 'tip',  body: 'P2P trading with PHP is the main funding method for Filipino users. GCash and major banks are widely supported.' },
  };

  if (ctx.geo !== 'unknown' && GEO_HINTS[ctx.geo]) return GEO_HINTS[ctx.geo];

  // Intent-specific tips
  if (ctx.intent === 'beginner' && ctx.isFirstVisit) {
    return {
      type: 'tip',
      body: 'New to crypto bonuses? Filter by "No KYC" to find exchanges where you can start without submitting identity documents.',
    };
  }

  if (ctx.intent === 'no-kyc') {
    return {
      type: 'info',
      body: 'No-KYC accounts typically have lower daily withdrawal limits. Full KYC unlocks higher limits if you need them later.',
    };
  }

  return null;
}

// ── Compare recommendations ───────────────────────────────────────────────────

export interface ComparePairDef {
  pair: string;
  a: string;
  b: string;
}

/**
 * Returns contextually relevant compare pair slugs for a given exchange and context.
 * Used to personalise the "Compare with..." suggestions on exchange pages.
 *
 * Priority:
 *  1. Pairs involving the current exchange
 *  2. Among those, prefer pairs where the other exchange matches user intent
 *     (e.g., no-kyc intent → compare current exchange with no-kyc alternatives)
 */
export function getCompareRecommendations(
  currentSlug: string,
  allPairs: ComparePairDef[],
  allExchanges: RecommendableExchange[],
  ctx: VisitorContext,
  limit = 3,
): ComparePairDef[] {
  const exMap = new Map(allExchanges.map(e => [e.slug, e]));

  // Filter to pairs involving this exchange
  const myPairs = allPairs.filter(p => p.a === currentSlug || p.b === currentSlug);
  if (myPairs.length === 0) return [];

  // Score each pair based on the other exchange's context fit
  const scored = myPairs.map(pair => {
    const otherSlug = pair.a === currentSlug ? pair.b : pair.a;
    const other = exMap.get(otherSlug);
    if (!other) return { pair, score: 0 };

    let score = other.rating; // Base: always prefer higher-rated comparisons

    // Boost based on intent
    switch (ctx.intent) {
      case 'no-kyc':
        if (!other.kycRequired) score += 2;
        break;
      case 'futures':
        if (other.bonusTypes.includes('futures')) score += 1.5;
        if (other.bonusAmount >= 5000) score += 0.5;
        break;
      case 'beginner':
        if (!other.kycRequired && !other.depositRequired) score += 1.5;
        break;
    }

    return { pair, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.pair);
}
