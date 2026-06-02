/**
 * Quality Utilities — CryptoBonusWorld Content QA System
 * ========================================================
 *
 * Provides:
 *  1. Content quality scoring (0–100) per page type
 *  2. Thin-content detection with specific flags
 *  3. Freshness scoring (based on last-verified date)
 *  4. Duplicate-risk detection (title/description similarity)
 *  5. Semantic completeness checks
 *
 * Design:
 *  - Pure functions — no side effects, no framework imports
 *  - All functions return typed results with specific flag reasons
 *  - Used at build-time for logging/validation and optionally in CI
 *
 * Usage:
 *   import { scoreExchange, flagThinContent } from '../utils/qualityUtils';
 *   const result = scoreExchange(ex);
 *   if (result.score < 60) console.warn(result.flags);
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface QualityFlag {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface QualityScore {
  score: number;      // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  flags: QualityFlag[];
  /** Score breakdown by dimension */
  breakdown: Record<string, number>;
  /** Whether this page should be held from publishing */
  shouldHold: boolean;
}

// ── Grade helper ──────────────────────────────────────────────────────────────

function scoreToGrade(score: number): QualityScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ── Date freshness ────────────────────────────────────────────────────────────

/** Returns days since a given ISO date. Negative if date is in the future. */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  try {
    const d = new Date(iso);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/** Freshness score (0–20): full points for <14 days, degrading to 0 at >90 days */
export function freshnessScore(lastVerified: string | null | undefined): number {
  const days = daysSince(lastVerified);
  if (days < 0) return 20; // future date = newly created
  if (days <= 14) return 20;
  if (days <= 30) return 16;
  if (days <= 60) return 10;
  if (days <= 90) return 5;
  return 0;
}

/** Returns human-readable freshness status */
export function freshnessLabel(lastVerified: string | null | undefined): {
  label: string;
  level: 'fresh' | 'acceptable' | 'stale' | 'critical';
} {
  const days = daysSince(lastVerified);
  if (days <= 14) return { label: 'Fresh', level: 'fresh' };
  if (days <= 30) return { label: 'Acceptable', level: 'acceptable' };
  if (days <= 60) return { label: 'Aging', level: 'stale' };
  return { label: 'Stale — needs review', level: 'critical' };
}

// ── Exchange page quality ─────────────────────────────────────────────────────

export interface ExchangeQualityInput {
  slug: string;
  name: string;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTiers?: unknown[];
  kycRequired: boolean;
  depositRequired: boolean;
  countries: string[];
  excludedCountries: string[];
  paymentMethods: string[];
  shortDescription?: string;
  longDescription?: string;
  editorNote?: string;
  bestFor?: string[];
  pros?: string[];
  cons?: string[];
  verificationStatus?: string;
  lastVerified?: string;
  updatedAt?: string;
  sources?: unknown[];
  faqOverrides?: unknown[];
}

/**
 * Score an exchange page for content quality.
 * Returns 0–100 with specific flags for each deficiency.
 */
export function scoreExchange(ex: ExchangeQualityInput): QualityScore {
  const flags: QualityFlag[] = [];
  const breakdown: Record<string, number> = {};

  // ── Data completeness (40 pts) ──────────────────────────────────────────────
  let dataScore = 0;

  // Bonus tiers (10 pts)
  const tierCount = (ex.bonusTiers ?? []).length;
  if (tierCount >= 3) { dataScore += 10; }
  else if (tierCount >= 1) { dataScore += 6; }
  else {
    dataScore += 0;
    flags.push({ code: 'MISSING_TIERS', severity: 'warning', message: 'No bonus tiers defined. Use structured bonusTiers for richer content.', field: 'bonusTiers' });
  }

  // Countries (8 pts)
  const countryCount = ex.countries.length;
  if (countryCount >= 5 || ex.countries.includes('global')) { dataScore += 8; }
  else if (countryCount >= 2) { dataScore += 4; }
  else {
    flags.push({ code: 'FEW_COUNTRIES', severity: 'warning', message: 'Only 1 country listed. Consider adding global or more specific countries.', field: 'countries' });
  }

  // Payment methods (6 pts)
  if (ex.paymentMethods.length >= 3) { dataScore += 6; }
  else if (ex.paymentMethods.length >= 1) { dataScore += 3; }
  else {
    flags.push({ code: 'NO_PAYMENT_METHODS', severity: 'warning', message: 'No payment methods listed.', field: 'paymentMethods' });
  }

  // Sources (8 pts)
  const sourceCount = (ex.sources ?? []).length;
  if (sourceCount >= 1) { dataScore += 8; }
  else {
    flags.push({ code: 'NO_SOURCES', severity: 'error', message: 'No verification sources listed. Bonus data cannot be confirmed.', field: 'sources' });
  }

  // Pros/cons (8 pts)
  const prosCount = (ex.pros ?? []).length;
  const consCount = (ex.cons ?? []).length;
  if (prosCount >= 3 && consCount >= 2) { dataScore += 8; }
  else if (prosCount >= 1 || consCount >= 1) { dataScore += 4; }
  else {
    flags.push({ code: 'NO_PROS_CONS', severity: 'warning', message: 'No pros/cons defined. Add at least 3 pros and 2 cons.', field: 'pros' });
  }

  breakdown.dataCompleteness = dataScore;

  // ── Content richness (30 pts) ───────────────────────────────────────────────
  let contentScore = 0;

  // Short description (8 pts)
  const shortDescLen = (ex.shortDescription ?? '').length;
  if (shortDescLen >= 100) { contentScore += 8; }
  else if (shortDescLen >= 50) { contentScore += 4; }
  else {
    flags.push({ code: 'SHORT_DESCRIPTION_THIN', severity: 'warning', message: `shortDescription is only ${shortDescLen} chars. Target 100+ for richer snippets.`, field: 'shortDescription' });
  }

  // Long description (10 pts)
  const longDescLen = (ex.longDescription ?? '').length;
  if (longDescLen >= 400) { contentScore += 10; }
  else if (longDescLen >= 150) { contentScore += 5; }
  else {
    flags.push({ code: 'LONG_DESCRIPTION_THIN', severity: 'warning', message: `longDescription is only ${longDescLen} chars. Target 400+ for content richness.`, field: 'longDescription' });
  }

  // Editor note (8 pts) — human voice, key E-E-A-T signal
  const editorNoteLen = (ex.editorNote ?? '').length;
  if (editorNoteLen >= 80) { contentScore += 8; }
  else if (editorNoteLen >= 30) { contentScore += 4; }
  else {
    flags.push({ code: 'MISSING_EDITOR_NOTE', severity: 'warning', message: 'No editor note or note is too short. Add a genuine 80+ character editorial observation.', field: 'editorNote' });
  }

  // Best for (4 pts)
  if ((ex.bestFor ?? []).length >= 2) { contentScore += 4; }
  else {
    flags.push({ code: 'FEW_BEST_FOR', severity: 'info', message: 'Add 2+ "bestFor" tags to improve recommendation targeting.', field: 'bestFor' });
  }

  breakdown.contentRichness = contentScore;

  // ── Freshness (20 pts) ──────────────────────────────────────────────────────
  const fresh = freshnessScore(ex.lastVerified ?? ex.updatedAt);
  breakdown.freshness = fresh;

  if (fresh === 0) {
    flags.push({ code: 'STALE_DATA', severity: 'error', message: `Data not verified in 90+ days. Last verified: ${ex.lastVerified ?? ex.updatedAt ?? 'unknown'}. Immediate review required.`, field: 'lastVerified' });
  } else if (fresh <= 5) {
    flags.push({ code: 'AGING_DATA', severity: 'warning', message: `Data is aging (60–90 days old). Schedule re-verification.`, field: 'lastVerified' });
  }

  // ── Verification status (10 pts) ───────────────────────────────────────────
  let verScore = 0;
  if (ex.verificationStatus === 'verified') { verScore = 10; }
  else if (ex.verificationStatus === 'needs-review') {
    verScore = 5;
    flags.push({ code: 'NEEDS_REVIEW', severity: 'warning', message: 'Exchange marked as needs-review. Re-verify before publishing.', field: 'verificationStatus' });
  } else {
    verScore = 3;
    flags.push({ code: 'UNVERIFIED', severity: 'error', message: 'Exchange has no verificationStatus. Must be verified before publishing.', field: 'verificationStatus' });
  }
  breakdown.verification = verScore;

  const total = dataScore + contentScore + fresh + verScore;
  const shouldHold = flags.some(f => f.severity === 'error');

  return {
    score: Math.min(100, total),
    grade: scoreToGrade(total),
    flags,
    breakdown,
    shouldHold,
  };
}

// ── Thin content detection ────────────────────────────────────────────────────

export interface ThinContentCheck {
  isThin: boolean;
  reasons: string[];
  severity: 'none' | 'warning' | 'critical';
}

/**
 * Detect thin content patterns that could trigger quality issues in search.
 */
export function detectThinContent(opts: {
  pageType: string;
  exchangeCount?: number;
  wordCount?: number;
  faqCount?: number;
  hasUniqueIntro?: boolean;
  hasStructuredData?: boolean;
  hasVerifiedData?: boolean;
}): ThinContentCheck {
  const reasons: string[] = [];

  // Exchange count for listing pages
  if (opts.exchangeCount !== undefined) {
    if (opts.exchangeCount === 0) {
      reasons.push('No exchanges listed — page has no content');
    } else if (opts.exchangeCount === 1 && opts.pageType === 'category') {
      reasons.push('Only 1 exchange listed — category page may be too narrow');
    }
  }

  // Word count
  if (opts.wordCount !== undefined) {
    const minWords: Record<string, number> = {
      exchange: 500,
      category: 300,
      country: 300,
      guide: 800,
      'use-case': 300,
      coin: 300,
      'bonus-code': 200,
    };
    const min = minWords[opts.pageType] ?? 200;
    if (opts.wordCount < min) {
      reasons.push(`Word count (${opts.wordCount}) below minimum for ${opts.pageType} pages (${min})`);
    }
  }

  // FAQ count
  if (opts.faqCount !== undefined && opts.faqCount < 2) {
    reasons.push('Less than 2 FAQ items — adds minimal informational depth');
  }

  // Unique intro
  if (opts.hasUniqueIntro === false) {
    reasons.push('Intro paragraph appears to be boilerplate — add page-specific content');
  }

  // Structured data
  if (opts.hasStructuredData === false) {
    reasons.push('No structured data — JSON-LD required for all content pages');
  }

  // Verified data
  if (opts.hasVerifiedData === false) {
    reasons.push('Bonus data not verified — unverified data is a trust and accuracy risk');
  }

  const isThin = reasons.length > 0;
  const severity: ThinContentCheck['severity'] =
    reasons.length >= 3 ? 'critical' :
    reasons.length >= 1 ? 'warning' : 'none';

  return { isThin, reasons, severity };
}

// ── Title/meta duplicate risk ─────────────────────────────────────────────────

/**
 * Calculate similarity between two strings (simple Jaccard similarity on words).
 * Returns 0–1 where 1 = identical.
 */
export function stringSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

/**
 * Check if a title or description is too similar to a given list of existing titles.
 * Returns the most similar match if threshold exceeded.
 */
export function checkDuplicateRisk(
  candidate: string,
  existingStrings: string[],
  threshold = 0.8
): { isDuplicate: boolean; closestMatch?: string; similarity?: number } {
  let maxSim = 0;
  let closest = '';

  for (const existing of existingStrings) {
    const sim = stringSimilarity(candidate, existing);
    if (sim > maxSim) {
      maxSim = sim;
      closest = existing;
    }
  }

  return {
    isDuplicate: maxSim >= threshold,
    closestMatch: maxSim >= threshold ? closest : undefined,
    similarity: maxSim,
  };
}

// ── Semantic completeness ─────────────────────────────────────────────────────

/**
 * Check if content mentions expected semantic entities for a given topic.
 * Used to detect generic/scraped content that lacks specific references.
 */
export function checkSemanticCompleteness(
  content: string,
  requiredEntities: string[]
): { complete: boolean; missing: string[] } {
  const lower = content.toLowerCase();
  const missing = requiredEntities.filter(e => !lower.includes(e.toLowerCase()));
  return {
    complete: missing.length === 0,
    missing,
  };
}

// ── Overall page health ───────────────────────────────────────────────────────

export interface PageHealthReport {
  url: string;
  pageType: string;
  qualityScore?: number;
  qualityGrade?: QualityScore['grade'];
  freshnessLabel?: string;
  freshnessLevel?: string;
  thinContent?: ThinContentCheck;
  flags?: QualityFlag[];
  shouldHold: boolean;
  summary: string;
}

/**
 * Generate a unified health report for any page.
 * Suitable for logging during build or CI checks.
 */
export function generatePageHealthReport(opts: {
  url: string;
  pageType: string;
  qualityResult?: QualityScore;
  thinCheck?: ThinContentCheck;
  lastVerified?: string;
}): PageHealthReport {
  const { url, pageType, qualityResult, thinCheck, lastVerified } = opts;
  const freshness = freshnessLabel(lastVerified);
  const shouldHold =
    (qualityResult?.shouldHold ?? false) ||
    (thinCheck?.severity === 'critical');

  const issues: string[] = [];
  if (qualityResult && qualityResult.score < 60) issues.push(`Quality score: ${qualityResult.score}/100`);
  if (thinCheck?.isThin) issues.push(`Thin content: ${thinCheck.reasons[0]}`);
  if (freshness.level === 'critical') issues.push('Data is stale');

  const summary = shouldHold
    ? `⛔ HOLD — ${issues.join('; ')}`
    : issues.length > 0
    ? `⚠️ REVIEW — ${issues.join('; ')}`
    : `✅ OK`;

  return {
    url,
    pageType,
    qualityScore: qualityResult?.score,
    qualityGrade: qualityResult?.grade,
    freshnessLabel: freshness.label,
    freshnessLevel: freshness.level,
    thinContent: thinCheck,
    flags: qualityResult?.flags,
    shouldHold,
    summary,
  };
}
