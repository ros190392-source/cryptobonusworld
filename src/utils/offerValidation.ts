/**
 * Offer Validation Pipeline — CryptoBonusWorld
 * ==============================================
 *
 * Central utility for validating bonus offer accuracy and freshness.
 *
 * Provides:
 *  1. Stale offer detection — is this data still within acceptable freshness?
 *  2. Overdue review flags — which exchanges need immediate attention?
 *  3. Content freshness scoring — 0–100 freshness signal per offer
 *  4. Display-mode helpers — format-safe bonus amount strings
 *  5. Trust level derivation — human-readable trust tier per exchange
 *
 * Design:
 *  - Pure functions, no side effects, no framework imports
 *  - Used at build-time for QA logging and optionally in CI
 *  - Architecture is ready for future live API/scraper integration
 *    (just replace the "lastChecked" source with live data)
 *
 * Usage:
 *   import { validateOffer, formatBonusDisplay } from '../utils/offerValidation';
 *   const result = validateOffer(exchange);
 *   if (result.isStale) console.warn(result.flags);
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerificationStatus = 'verified' | 'needs-review' | 'outdated' | 'unverified';
export type BonusDisplayMode   = 'up-to' | 'range' | 'fixed' | 'regional' | 'campaign';
export type TrustLevel         = 'high' | 'medium' | 'low' | 'unknown';

export interface BonusRange {
  min: number;
  max: number;
  typicalMin?: number;
  typicalMax?: number;
  currency: string;
  typicalNote?: string;
}

export interface OfferInput {
  slug: string;
  name: string;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTitle?: string;
  bonusDisplayMode?: BonusDisplayMode;
  bonusRange?: BonusRange;
  bonusNote?: string;
  verificationStatus?: VerificationStatus;
  offerLastChecked?: string | null;
  lastVerified?: string | null;
  updatedAt?: string | null;
  bonusExpiry?: { days: number; note?: string } | null;
  excludedCountries?: string[];
  termsUrl?: string;
  sources?: { url: string; type: string }[];
  // Summary-generation fields
  kycRequired?: boolean;
  depositRequired?: boolean;
  minDeposit?: { amount: number; currency: string } | null;
  bestFor?: string[];
  realisticUserExpectation?: string;
}

export interface OfferValidationFlag {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface OfferValidationResult {
  slug: string;
  /** 0–100 freshness score: 100 = just verified, 0 = very stale */
  freshnessScore: number;
  /** True if the offer is beyond acceptable staleness thresholds */
  isStale: boolean;
  /** True if the offer should be held from publishing without review */
  needsImmediateReview: boolean;
  /** Derived trust level for display */
  trustLevel: TrustLevel;
  /** Days since last check */
  daysSinceCheck: number;
  /** Human-readable "X days ago" / "today" label */
  lastCheckedLabel: string;
  /** Specific validation issues */
  flags: OfferValidationFlag[];
  /** Whether the display mode is "up-to" (most common) */
  isUpTo: boolean;
  /** Formatted display string for the bonus amount */
  displayAmount: string;
  /** Typical user range string, if available */
  typicalRange: string | null;
}

// ── Staleness thresholds (days) ───────────────────────────────────────────────

const STALE_THRESHOLDS = {
  bonusAmount:  30,   // Max 30 days — bonus amounts change frequently
  conditions:   60,   // Max 60 days — KYC/deposit rules more stable
  promoCodes:   14,   // Max 14 days — promo codes expire fast
  general:      45,   // General page inactivity threshold
} as const;

// ── Core helpers ──────────────────────────────────────────────────────────────

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  } catch { return 999; }
}

function lastCheckedLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7)  return `${days} days ago`;
  if (days < 14) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 60) return `~${Math.round(days / 30)} month ago`;
  return `${Math.round(days / 30)} months ago`;
}

// ── Freshness score ───────────────────────────────────────────────────────────

/**
 * Score 0–100 based on how recently the offer was verified.
 * 100 = verified today; 0 = 90+ days without verification.
 */
export function offerFreshnessScore(offerLastChecked: string | null | undefined): number {
  const days = daysSince(offerLastChecked);
  if (days === 0)  return 100;
  if (days <= 3)   return 95;
  if (days <= 7)   return 88;
  if (days <= 14)  return 78;
  if (days <= 21)  return 65;
  if (days <= 30)  return 50;
  if (days <= 45)  return 30;
  if (days <= 60)  return 15;
  if (days <= 90)  return 5;
  return 0;
}

// ── Trust level ───────────────────────────────────────────────────────────────

/**
 * Derive a trust level for display based on verification status and freshness.
 */
export function deriveTrustLevel(
  verificationStatus: VerificationStatus | undefined,
  freshnessScore: number,
  hasSources: boolean,
): TrustLevel {
  if (verificationStatus === 'verified' && freshnessScore >= 70 && hasSources) return 'high';
  if (verificationStatus === 'verified' && freshnessScore >= 40) return 'medium';
  if (verificationStatus === 'needs-review' && freshnessScore >= 60) return 'medium';
  if (verificationStatus === 'outdated' || freshnessScore < 20) return 'low';
  if (verificationStatus === 'unverified') return 'unknown';
  return 'medium';
}

// ── Display formatting ────────────────────────────────────────────────────────

/**
 * Format the bonus amount for honest, non-overclaiming display.
 *
 * Examples:
 *   formatBonusDisplay(30000, 'USDT', 'up-to')  → "Up to 30,000 USDT"
 *   formatBonusDisplay(10, 'USD', 'fixed')        → "10 USD"
 *   formatBonusDisplay(500, 'USDT', 'range', {min:10, max:500}) → "10–500 USDT"
 */
export function formatBonusDisplay(
  amount: number,
  currency: string,
  mode: BonusDisplayMode = 'up-to',
  range?: BonusRange,
): string {
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);

  switch (mode) {
    case 'fixed':
      return `${fmt(amount)} ${currency}`;
    case 'range':
      if (range) return `${fmt(range.min)}–${fmt(range.max)} ${currency}`;
      return `Up to ${fmt(amount)} ${currency}`;
    case 'regional':
      return `Regional offer — up to ${fmt(amount)} ${currency}`;
    case 'campaign':
      return `Up to ${fmt(amount)} ${currency}`;
    case 'up-to':
    default:
      return `Up to ${fmt(amount)} ${currency}`;
  }
}

/**
 * Format the typical range string for user-facing "most users earn X–Y" display.
 */
export function formatTypicalRange(range: BonusRange | undefined): string | null {
  if (!range?.typicalMin || !range?.typicalMax) return null;
  if (range.typicalNote) return range.typicalNote;
  return `Most users earn ${range.typicalMin.toLocaleString()}–${range.typicalMax.toLocaleString()} ${range.currency}`;
}

// ── AiSummaryBlock item generation ────────────────────────────────────────────

/**
 * Derive a short descriptor phrase from an exchange's bestFor array.
 * Keeps copy honest — only states what the data says.
 */
function deriveSummaryDesc(offer: OfferInput): string {
  if (offer.bestFor && offer.bestFor.length >= 2) {
    const [a, b] = offer.bestFor;
    return `${a} & ${b}`;
  }
  if (offer.bestFor && offer.bestFor.length === 1) {
    return `Best for ${offer.bestFor[0]}`;
  }
  if (!offer.kycRequired && !offer.depositRequired) return 'No KYC, no deposit required';
  if (!offer.kycRequired) return 'No KYC required';
  return offer.bonusTitle ?? 'Welcome bonus';
}

/**
 * Build the note line shown under each AiSummaryBlock item.
 * Format: "KYC required · Min deposit $100 · Verified 2026-05-26"
 */
export function getBonusSummaryNote(offer: OfferInput): string {
  const parts: string[] = [];

  if (offer.kycRequired === false) {
    parts.push('No KYC required');
  } else if (offer.kycRequired === true) {
    parts.push('KYC required');
  }

  if (offer.depositRequired === false) {
    parts.push('No min deposit');
  } else if (offer.minDeposit && offer.minDeposit.amount > 0) {
    parts.push(`Min deposit $${offer.minDeposit.amount}`);
  }

  // Campaign-mode disclaimer
  if (offer.bonusDisplayMode === 'campaign') {
    parts.push('Promotional offer — verify current terms');
  }

  return parts.join(' · ');
}

/**
 * Build a complete AiSummaryBlock item from exchange data.
 * This is the single function all listing pages should use — eliminates drift.
 *
 * Returns: { label, slug, value, note }
 * where value = "Up to 30,000 USDT — Futures traders & Copy trading beginners"
 */
export function getBonusSummaryItem(offer: OfferInput): {
  label: string;
  slug: string;
  value: string;
  note: string;
} {
  const mode = (offer.bonusDisplayMode ?? 'up-to') as BonusDisplayMode;
  // Use full locale-formatted number (e.g. "30,000") — not K-notation — for readability in summaries
  const fmtFull = (n: number) => n.toLocaleString('en-US');
  let amount: string;
  if (mode === 'fixed') {
    amount = offer.bonusTitle ?? `${fmtFull(offer.bonusAmount)} ${offer.bonusCurrency}`;
  } else if (mode === 'range' && offer.bonusRange) {
    amount = `${fmtFull(offer.bonusRange.min)}–${fmtFull(offer.bonusRange.max)} ${offer.bonusCurrency}`;
  } else {
    amount = `Up to ${fmtFull(offer.bonusAmount)} ${offer.bonusCurrency}`;
  }
  const desc = deriveSummaryDesc(offer);
  return {
    label: offer.name,
    slug:  offer.slug,
    value: `${amount} — ${desc}`,
    note:  getBonusSummaryNote(offer),
  };
}

/**
 * Build AiSummaryBlock items for a curated list of exchange slugs.
 * Pass the full exchanges array + the ordered slug list you want to show.
 * Silently skips any slug not found in the array.
 */
export function getBonusSummaryItems(
  allExchanges: OfferInput[],
  orderedSlugs: string[],
): ReturnType<typeof getBonusSummaryItem>[] {
  const map = Object.fromEntries(allExchanges.map(e => [e.slug, e]));
  return orderedSlugs
    .filter(s => map[s])
    .map(s => getBonusSummaryItem(map[s]));
}

// ── Risky-wording checker ─────────────────────────────────────────────────────

const RISKY_PATTERNS: Array<{ pattern: RegExp; risk: string }> = [
  { pattern: /guaranteed\s+(earn|reward|bonus|profit)/i,  risk: 'Guaranteed earnings claim' },
  { pattern: /100%\s+(bonus|guaranteed|profit)/i,         risk: '100% guarantee claim' },
  { pattern: /definitely\s+(earn|get|receive)/i,          risk: 'Certainty language (definitely)' },
  { pattern: /you will\s+(earn|get|receive|make)/i,       risk: 'Future-certain claim' },
  { pattern: /instant\s+(withdrawal|cash|payout)/i,       risk: 'Instant payout claim' },
  { pattern: /risk.?free/i,                               risk: 'Risk-free claim' },
  { pattern: /no\s+risk/i,                                risk: 'No-risk claim' },
];

export interface WordingIssue {
  slug: string;
  field: string;
  text: string;
  risk: string;
}

/**
 * Scan text fields across exchanges for risky/misleading wording.
 * Run at build time or in the validation script.
 */
export function auditBonusWording(
  exchanges: Array<OfferInput & { shortDescription?: string; bonusNote?: string; editorNote?: string }>,
): WordingIssue[] {
  const issues: WordingIssue[] = [];
  for (const ex of exchanges) {
    const fields: Record<string, string | undefined> = {
      bonusTitle:             ex.bonusTitle,
      bonusNote:              ex.bonusNote,
      shortDescription:       (ex as any).shortDescription,
      editorNote:             (ex as any).editorNote,
      realisticUserExpectation: ex.realisticUserExpectation,
    };
    for (const [field, text] of Object.entries(fields)) {
      if (!text) continue;
      for (const { pattern, risk } of RISKY_PATTERNS) {
        if (pattern.test(text)) {
          issues.push({ slug: ex.slug, field, text: text.slice(0, 120), risk });
        }
      }
    }
  }
  return issues;
}

// ── Main validator ────────────────────────────────────────────────────────────

/**
 * Validate a single offer and return a structured result.
 * Call at build time to detect data quality issues before publishing.
 */
export function validateOffer(offer: OfferInput): OfferValidationResult {
  const flags: OfferValidationFlag[] = [];
  const checkDate = offer.offerLastChecked ?? offer.lastVerified ?? offer.updatedAt;
  const days = daysSince(checkDate);
  const freshness = offerFreshnessScore(checkDate);
  const hasSources = (offer.sources ?? []).length > 0;
  const trustLevel = deriveTrustLevel(offer.verificationStatus, freshness, hasSources);
  const mode = offer.bonusDisplayMode ?? 'up-to';

  // Staleness checks
  if (days > STALE_THRESHOLDS.bonusAmount) {
    flags.push({
      code: 'OFFER_STALE',
      severity: days > 60 ? 'error' : 'warning',
      message: `Bonus amount not verified in ${days} days (max: ${STALE_THRESHOLDS.bonusAmount}). Re-verify against ${offer.termsUrl ?? 'official source'}.`,
    });
  }

  // Missing sources
  if (!hasSources) {
    flags.push({
      code: 'NO_SOURCES',
      severity: 'error',
      message: 'No verification source URLs. Add official promo page URL to sources[].',
    });
  }

  // Verification status
  if (!offer.verificationStatus || offer.verificationStatus === 'unverified') {
    flags.push({
      code: 'UNVERIFIED',
      severity: 'error',
      message: 'Exchange has no verificationStatus. Must be verified before publishing.',
    });
  } else if (offer.verificationStatus === 'needs-review') {
    flags.push({
      code: 'NEEDS_REVIEW',
      severity: 'warning',
      message: 'Exchange is marked needs-review. Verify bonus amount before next publish.',
    });
  } else if (offer.verificationStatus === 'outdated') {
    flags.push({
      code: 'OUTDATED',
      severity: 'error',
      message: 'Exchange marked outdated. Immediate re-verification required.',
    });
  }

  // Missing bonus range
  if (!offer.bonusRange) {
    flags.push({
      code: 'NO_BONUS_RANGE',
      severity: 'info',
      message: 'No bonusRange defined. Add min/max/typical for accurate user expectations.',
    });
  }

  // Missing terms URL
  if (!offer.termsUrl) {
    flags.push({
      code: 'NO_TERMS_URL',
      severity: 'warning',
      message: 'No termsUrl set. Users cannot verify bonus terms independently.',
    });
  }

  const isStale = days > STALE_THRESHOLDS.bonusAmount;
  const needsImmediateReview =
    offer.verificationStatus === 'outdated' ||
    flags.some(f => f.severity === 'error');

  return {
    slug: offer.slug,
    freshnessScore: freshness,
    isStale,
    needsImmediateReview,
    trustLevel,
    daysSinceCheck: days,
    lastCheckedLabel: lastCheckedLabel(days),
    flags,
    isUpTo: mode === 'up-to' || mode === 'regional',
    displayAmount: formatBonusDisplay(offer.bonusAmount, offer.bonusCurrency, mode, offer.bonusRange),
    typicalRange: formatTypicalRange(offer.bonusRange),
  };
}

// ── Batch validation ──────────────────────────────────────────────────────────

export interface BatchValidationReport {
  generatedAt: string;
  total: number;
  verified: number;
  needsReview: number;
  stale: number;
  critical: number;
  avgFreshness: number;
  results: OfferValidationResult[];
  summary: string;
}

/**
 * Validate all offers and return a batch report.
 * Sorted by urgency (critical first, then stale, then needs-review).
 */
export function validateAllOffers(offers: OfferInput[]): BatchValidationReport {
  const results = offers.map(validateOffer).sort((a, b) => {
    // Critical first
    if (a.needsImmediateReview && !b.needsImmediateReview) return -1;
    if (!a.needsImmediateReview && b.needsImmediateReview) return 1;
    // Then stale
    if (a.isStale && !b.isStale) return -1;
    if (!a.isStale && b.isStale) return 1;
    // Then by freshness desc
    return b.freshnessScore - a.freshnessScore;
  });

  const verified     = results.filter(r => r.trustLevel === 'high' || r.trustLevel === 'medium').length;
  const needsReview  = results.filter(r => r.flags.some(f => f.code === 'NEEDS_REVIEW')).length;
  const stale        = results.filter(r => r.isStale).length;
  const critical     = results.filter(r => r.needsImmediateReview).length;
  const avgFreshness = results.length
    ? Math.round(results.reduce((s, r) => s + r.freshnessScore, 0) / results.length)
    : 0;

  const summary = critical > 0
    ? `⛔ ${critical} offer(s) need immediate review`
    : stale > 0
    ? `⚠️  ${stale} offer(s) are stale — re-verify soon`
    : `✅ All ${results.length} offers within freshness thresholds`;

  return {
    generatedAt: new Date().toISOString().split('T')[0],
    total: results.length,
    verified,
    needsReview,
    stale,
    critical,
    avgFreshness,
    results,
    summary,
  };
}

// ── Future API hook (stub) ────────────────────────────────────────────────────

/**
 * Stub for future live-offer verification via scraper/API.
 * When implemented, replaces static offerLastChecked with real-time data.
 *
 * Usage (future):
 *   const liveData = await fetchLiveOffer('bybit');
 *   const result = validateOffer({ ...exchange, ...liveData });
 */
export interface LiveOfferData {
  bonusAmount: number;
  bonusCurrency: string;
  fetchedAt: string;
  sourceUrl: string;
  confidence: 'high' | 'medium' | 'low';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchLiveOffer(_slug: string): Promise<LiveOfferData | null> {
  // TODO: Implement scraper/API integration
  // Options:
  //   1. Puppeteer/Playwright scraper hitting official promo pages
  //   2. Partner API (Bybit, OKX etc. have affiliate APIs)
  //   3. Manual verification webhook (editor clicks "verify" in CMS)
  return null;
}
