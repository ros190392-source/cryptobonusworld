/**
 * contentHealth.ts — Content Health Scoring System
 * ==================================================
 *
 * Unified page health infrastructure that tracks nine quality dimensions:
 *   1. Freshness         — how recently was the data verified?
 *   2. Internal links    — how many inbound internal links does the page have?
 *   3. Schema presence   — does the page emit valid JSON-LD schema?
 *   4. FAQ presence      — is there a FAQ section with sufficient items?
 *   5. Word count        — is the content long enough for the page type?
 *   6. Trust blocks      — does the page have E-E-A-T signals?
 *   7. Orphan risk       — is the page at risk of being an orphan?
 *   8. Crawl depth       — is the page reachable within 3 clicks from the homepage?
 *   9. Duplicate-title   — does the page have a unique SEO title?
 *
 * Top-level exports:
 *   scorePageHealth()        — score a single page across all dimensions
 *   scorePageBatch()         — score many pages and return sorted results
 *   buildHealthDashboard()   — aggregate site-wide health stats
 *   STALE_AFTER_DAYS         — per-type stale thresholds
 *   WORD_COUNT_TARGETS       — per-type minimum word counts
 */

// ── Page types ────────────────────────────────────────────────────────────────

export type HealthPageType =
  | 'exchange'
  | 'bonus'
  | 'category'
  | 'country'
  | 'compare'
  | 'guide'
  | 'coin'
  | 'use-case'
  | 'bonus-code'
  | 'reviewer'
  | 'static';

// ── Stale thresholds (days) ───────────────────────────────────────────────────

/** Number of days after which each page type is considered stale */
export const STALE_AFTER_DAYS: Record<HealthPageType, number> = {
  exchange:    30,   // bonus amounts change frequently
  bonus:       30,
  'bonus-code': 21,  // promo codes expire quickly
  category:    60,
  country:     60,
  compare:     45,
  guide:       90,
  coin:        60,
  'use-case':  60,
  reviewer:   180,
  static:     365,
};

// ── Word count targets ────────────────────────────────────────────────────────

/** Minimum word counts for a page to avoid a word-count penalty */
export const WORD_COUNT_TARGETS: Record<HealthPageType, number> = {
  exchange:    900,
  bonus:       650,
  'bonus-code': 450,
  category:    550,
  country:     450,
  compare:     800,
  guide:      1400,
  coin:        550,
  'use-case':  650,
  reviewer:    300,
  static:      200,
};

// ── FAQ targets ───────────────────────────────────────────────────────────────

export const FAQ_COUNT_TARGETS: Record<HealthPageType, number> = {
  exchange:    4,
  bonus:       3,
  'bonus-code': 3,
  category:    3,
  country:     3,
  compare:     3,
  guide:       2,
  coin:        4,
  'use-case':  4,
  reviewer:    0,
  static:      0,
};

// ── SEO health levels ─────────────────────────────────────────────────────────

export type SeoHealthLevel =
  | 'excellent'   // 90–100
  | 'good'        // 75–89
  | 'fair'        // 55–74
  | 'poor'        // 35–54
  | 'critical';   // 0–34

export function scoreToSeoHealth(score: number): SeoHealthLevel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 55) return 'fair';
  if (score >= 35) return 'poor';
  return 'critical';
}

// ── Health issue severity ─────────────────────────────────────────────────────

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface HealthIssue {
  dimension: string;
  severity: IssueSeverity;
  message: string;
  recommendation?: string;
}

// ── Page health input ─────────────────────────────────────────────────────────

export interface PageHealthInput {
  /** Absolute path, e.g. /exchanges/bybit/ */
  url: string;
  type: HealthPageType;
  seoTitle: string;
  metaDescription?: string;

  // Freshness
  lastVerified?: string;       // ISO date string
  updatedAt?: string;

  // Content signals
  wordCount?: number;
  faqCount?: number;
  hasAnswerBox?: boolean;      // AI-readable summary block present?
  hasSchema?: boolean;         // JSON-LD present?
  hasTrustBlock?: boolean;     // ReviewerBlock / TrustVerification present?
  hasEditorNote?: boolean;     // Editor's note / editorial voice present?
  hasAffiliateDisclosure?: boolean;

  // Link signals
  inboundLinkCount?: number;   // from link map analysis
  crawlDepth?: number;         // from BFS crawl depth
  outboundLinkCount?: number;

  // Duplicate / uniqueness
  titleIsUnique?: boolean;     // computed externally
  descriptionIsUnique?: boolean;

  // Exchange-specific
  verificationStatus?: 'verified' | 'needs-review' | 'unverified';
}

// ── Page health result ────────────────────────────────────────────────────────

export interface PageHealthResult {
  url: string;
  type: HealthPageType;
  seoTitle: string;

  /** Composite score 0–100 */
  contentScore: number;
  /** Human-readable health level */
  seoHealth: SeoHealthLevel;
  /** Should this page be queued for review? */
  needsUpdate: boolean;
  /** Days until this page type becomes stale */
  staleAfterDays: number;
  /** Days since last verified (or 999 if unknown) */
  daysSinceVerified: number;
  /** True if page data is currently stale */
  isStale: boolean;

  /** Per-dimension scores (each 0–10) */
  dimensions: {
    freshness: number;
    internalLinks: number;
    schemaPresence: number;
    faqPresence: number;
    wordCount: number;
    trustBlocks: number;
    orphanRisk: number;
    crawlDepth: number;
    titleUniqueness: number;
  };

  issues: HealthIssue[];
  /** Top action to take for improvement */
  topRecommendation: string | null;
}

// ── Days since helper ─────────────────────────────────────────────────────────

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 999;
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
  } catch {
    return 999;
  }
}

// ── Dimension scorers (each returns 0–10) ────────────────────────────────────

function scoreFreshness(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const days = daysSince(input.lastVerified ?? input.updatedAt);
  const threshold = STALE_AFTER_DAYS[input.type] ?? 60;

  if (days <= 7)               return { score: 10, issue: null };
  if (days <= 14)              return { score: 9,  issue: null };
  if (days <= threshold * 0.5) return { score: 7,  issue: null };
  if (days <= threshold)       return { score: 5,  issue: {
    dimension: 'freshness', severity: 'warning',
    message: `Content is ${days} days old (threshold: ${threshold} days).`,
    recommendation: `Re-verify ${input.type} data and update lastVerified date.`,
  }};
  if (days <= threshold * 2)   return { score: 2,  issue: {
    dimension: 'freshness', severity: 'critical',
    message: `Content is stale: ${days} days since last verification (threshold: ${threshold} days).`,
    recommendation: `Urgent re-verification required for ${input.url}.`,
  }};
  return { score: 0, issue: {
    dimension: 'freshness', severity: 'critical',
    message: `Content is severely stale: ${days} days without update.`,
    recommendation: `Immediate review required — this page may contain outdated bonus data.`,
  }};
}

function scoreInternalLinks(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const count = input.inboundLinkCount ?? 0;
  if (count >= 8)  return { score: 10, issue: null };
  if (count >= 5)  return { score: 8,  issue: null };
  if (count >= 3)  return { score: 6,  issue: null };
  if (count >= 1)  return { score: 4,  issue: {
    dimension: 'internalLinks', severity: 'warning',
    message: `Only ${count} inbound internal link(s). Target 3+ for healthy link equity.`,
    recommendation: 'Add contextual links from related category, use-case, or coin pages.',
  }};
  return { score: 0, issue: {
    dimension: 'internalLinks', severity: 'critical',
    message: 'Zero inbound internal links — this page may be orphaned.',
    recommendation: 'Link to this page from at least 3 related pages immediately.',
  }};
}

function scoreSchemaPresence(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  if (input.type === 'static') return { score: 10, issue: null }; // static pages exempt
  if (input.hasSchema === true) return { score: 10, issue: null };
  if (input.hasSchema === undefined) return { score: 7, issue: {
    dimension: 'schemaPresence', severity: 'info',
    message: 'Schema presence not tracked. Verify JSON-LD output.',
    recommendation: 'Add hasSchema tracking to page health inputs.',
  }};
  return { score: 0, issue: {
    dimension: 'schemaPresence', severity: 'critical',
    message: 'No JSON-LD schema detected. Required for rich results eligibility.',
    recommendation: 'Add appropriate schema.org markup (Product, FAQPage, ItemList).',
  }};
}

function scoreFaqPresence(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const target = FAQ_COUNT_TARGETS[input.type] ?? 0;
  if (target === 0) return { score: 10, issue: null }; // page type doesn't need FAQ
  const count = input.faqCount ?? 0;
  if (count >= target + 1) return { score: 10, issue: null };
  if (count >= target)     return { score: 8,  issue: null };
  if (count >= 2)          return { score: 5,  issue: {
    dimension: 'faqPresence', severity: 'warning',
    message: `${count} FAQ items (target: ${target}+). More FAQ items improve AI Overview eligibility.`,
    recommendation: `Add ${target - count} more FAQ items addressing user intent.`,
  }};
  if (count === 1)         return { score: 3,  issue: {
    dimension: 'faqPresence', severity: 'warning',
    message: 'Only 1 FAQ item. FAQ section adds little value at this length.',
    recommendation: `Expand to at least ${target} FAQ items covering key user questions.`,
  }};
  return { score: 0, issue: {
    dimension: 'faqPresence', severity: 'critical',
    message: `No FAQ section found (target: ${target} items). FAQ schema is a key AI Overview signal.`,
    recommendation: 'Add a FAQBlock component with 4+ well-researched questions.',
  }};
}

function scoreWordCount(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const target = WORD_COUNT_TARGETS[input.type] ?? 300;
  const wc = input.wordCount;
  if (wc === undefined) return { score: 7, issue: {
    dimension: 'wordCount', severity: 'info',
    message: 'Word count not tracked. Add wordCount to page health inputs.',
    recommendation: 'Implement word count estimation at build time.',
  }};
  if (wc >= target * 1.5) return { score: 10, issue: null };
  if (wc >= target)       return { score: 8,  issue: null };
  if (wc >= target * 0.7) return { score: 5,  issue: {
    dimension: 'wordCount', severity: 'warning',
    message: `Word count (${wc}) is below target (${target}) for ${input.type} pages.`,
    recommendation: 'Expand the content with more specific data, comparisons, or editorial analysis.',
  }};
  return { score: 2, issue: {
    dimension: 'wordCount', severity: 'critical',
    message: `Thin content: ${wc} words (minimum ${target} for ${input.type} pages).`,
    recommendation: 'This page is at risk of thin-content penalties. Add substantial unique content.',
  }};
}

function scoreTrustBlocks(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  if (input.type === 'static' || input.type === 'reviewer') return { score: 10, issue: null };
  let trust = 0;
  if (input.hasTrustBlock)          trust += 3;
  if (input.hasEditorNote)          trust += 3;
  if (input.hasAnswerBox)           trust += 2;
  if (input.hasAffiliateDisclosure) trust += 2;

  if (trust >= 9) return { score: 10, issue: null };
  if (trust >= 7) return { score: 8,  issue: null };
  if (trust >= 5) return { score: 6,  issue: {
    dimension: 'trustBlocks', severity: 'warning',
    message: 'Some trust signals present but incomplete. Missing: ' +
      [!input.hasTrustBlock && 'TrustBlock', !input.hasEditorNote && 'EditorNote',
       !input.hasAnswerBox && 'AnswerBox', !input.hasAffiliateDisclosure && 'AffiliateDisclosure']
      .filter(Boolean).join(', '),
    recommendation: 'Add all E-E-A-T trust signals for maximum authority.',
  }};
  if (trust >= 2) return { score: 3,  issue: {
    dimension: 'trustBlocks', severity: 'warning',
    message: 'Minimal trust signals. E-E-A-T improvement required.',
    recommendation: 'Add ReviewerBlock, EditorNote, AffiliateDisclosure and AnswerBox.',
  }};
  return { score: 0, issue: {
    dimension: 'trustBlocks', severity: 'critical',
    message: 'No E-E-A-T trust signals detected. This page will underperform in trustworthiness signals.',
    recommendation: 'Add at minimum: AffiliateDisclosure and one editorial voice component.',
  }};
}

function scoreOrphanRisk(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const count = input.inboundLinkCount ?? 0;
  // Score is inverse of internalLinks score — orphan risk decreases as inbound links increase
  if (count >= 5)  return { score: 10, issue: null };
  if (count >= 3)  return { score: 8,  issue: null };
  if (count >= 2)  return { score: 6,  issue: null };
  if (count === 1) return { score: 3,  issue: {
    dimension: 'orphanRisk', severity: 'warning',
    message: 'Only 1 inbound link — page is at risk of becoming orphaned if that link is removed.',
    recommendation: 'Add at least 2 more inbound links from different page types.',
  }};
  return { score: 0, issue: {
    dimension: 'orphanRisk', severity: 'critical',
    message: 'Zero inbound links — this page is an orphan and may not be crawled or indexed.',
    recommendation: 'Immediately link to this page from at least 3 relevant pages.',
  }};
}

function scoreCrawlDepth(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  const depth = input.crawlDepth;
  if (depth === undefined) return { score: 7, issue: {
    dimension: 'crawlDepth', severity: 'info',
    message: 'Crawl depth not tracked.',
    recommendation: 'Run computeCrawlDepth() from indexing.ts and pass result to contentHealth.',
  }};
  if (depth <= 1) return { score: 10, issue: null };
  if (depth <= 2) return { score: 9,  issue: null };
  if (depth <= 3) return { score: 7,  issue: null };
  if (depth <= 4) return { score: 4,  issue: {
    dimension: 'crawlDepth', severity: 'warning',
    message: `Page is ${depth} clicks from homepage. Target: ≤3 clicks.`,
    recommendation: 'Add a shortcut link from a hub page or top-level navigation.',
  }};
  return { score: 0, issue: {
    dimension: 'crawlDepth', severity: 'critical',
    message: `Page is ${depth} clicks deep. Crawlers may not reach it reliably.`,
    recommendation: 'Create direct links from homepage, sitemap, or hub pages.',
  }};
}

function scoreTitleUniqueness(input: PageHealthInput): { score: number; issue: HealthIssue | null } {
  if (input.titleIsUnique === false) return { score: 0, issue: {
    dimension: 'titleUniqueness', severity: 'critical',
    message: `Duplicate SEO title: "${input.seoTitle}" — title collision with another page.`,
    recommendation: 'Differentiate this page title with unique year, coin, or feature modifiers.',
  }};
  if (input.titleIsUnique === undefined) return { score: 8, issue: {
    dimension: 'titleUniqueness', severity: 'info',
    message: 'Title uniqueness not verified against full page set.',
    recommendation: 'Run detectDuplicateTitles() from indexing.ts.',
  }};
  return { score: 10, issue: null };
}

// ── Main scorer ───────────────────────────────────────────────────────────────

/**
 * Score a single page across all 9 health dimensions.
 * Returns a typed PageHealthResult with content score, seo health level,
 * needsUpdate flag, stale threshold, and per-dimension breakdown.
 */
export function scorePageHealth(input: PageHealthInput): PageHealthResult {
  const f  = scoreFreshness(input);
  const il = scoreInternalLinks(input);
  const sp = scoreSchemaPresence(input);
  const fq = scoreFaqPresence(input);
  const wc = scoreWordCount(input);
  const tb = scoreTrustBlocks(input);
  const or = scoreOrphanRisk(input);
  const cd = scoreCrawlDepth(input);
  const tu = scoreTitleUniqueness(input);

  // Weighted composite:
  // Freshness 15%, InternalLinks 10%, Schema 12%, FAQ 12%, WordCount 13%,
  // TrustBlocks 12%, OrphanRisk 8%, CrawlDepth 10%, TitleUniqueness 8%
  const WEIGHTS = {
    freshness:      0.15,
    internalLinks:  0.10,
    schemaPresence: 0.12,
    faqPresence:    0.12,
    wordCount:      0.13,
    trustBlocks:    0.12,
    orphanRisk:     0.08,
    crawlDepth:     0.10,
    titleUniqueness: 0.08,
  };

  const raw =
    f.score  * WEIGHTS.freshness      +
    il.score * WEIGHTS.internalLinks  +
    sp.score * WEIGHTS.schemaPresence +
    fq.score * WEIGHTS.faqPresence    +
    wc.score * WEIGHTS.wordCount      +
    tb.score * WEIGHTS.trustBlocks    +
    or.score * WEIGHTS.orphanRisk     +
    cd.score * WEIGHTS.crawlDepth     +
    tu.score * WEIGHTS.titleUniqueness;

  const contentScore = Math.round(raw * 10); // scale from 0–10 → 0–100

  const issues: HealthIssue[] = [
    f.issue, il.issue, sp.issue, fq.issue, wc.issue,
    tb.issue, or.issue, cd.issue, tu.issue,
  ].filter((i): i is HealthIssue => i !== null);

  const days = daysSince(input.lastVerified ?? input.updatedAt);
  const threshold = STALE_AFTER_DAYS[input.type] ?? 60;
  const isStale = days > threshold;
  const hasCritical = issues.some(i => i.severity === 'critical');
  const needsUpdate = isStale || hasCritical || contentScore < 55;

  // Top recommendation = first critical issue, else first warning
  const topIssue =
    issues.find(i => i.severity === 'critical') ??
    issues.find(i => i.severity === 'warning') ??
    null;

  return {
    url: input.url,
    type: input.type,
    seoTitle: input.seoTitle,
    contentScore,
    seoHealth: scoreToSeoHealth(contentScore),
    needsUpdate,
    staleAfterDays: threshold,
    daysSinceVerified: days,
    isStale,
    dimensions: {
      freshness:       f.score,
      internalLinks:   il.score,
      schemaPresence:  sp.score,
      faqPresence:     fq.score,
      wordCount:       wc.score,
      trustBlocks:     tb.score,
      orphanRisk:      or.score,
      crawlDepth:      cd.score,
      titleUniqueness: tu.score,
    },
    issues,
    topRecommendation: topIssue?.recommendation ?? null,
  };
}

// ── Batch scorer ──────────────────────────────────────────────────────────────

export interface BatchHealthOptions {
  /** Sort results by contentScore ascending (worst first = default) */
  sortByWorstFirst?: boolean;
  /** Filter to only pages that needsUpdate */
  filterNeedsUpdate?: boolean;
  /** Filter to specific seoHealth levels */
  filterHealthLevels?: SeoHealthLevel[];
}

/**
 * Score many pages at once and return sorted/filtered results.
 */
export function scorePageBatch(
  pages: PageHealthInput[],
  options: BatchHealthOptions = {}
): PageHealthResult[] {
  const { sortByWorstFirst = true, filterNeedsUpdate, filterHealthLevels } = options;

  let results = pages.map(scorePageHealth);

  if (filterNeedsUpdate) {
    results = results.filter(r => r.needsUpdate);
  }
  if (filterHealthLevels?.length) {
    results = results.filter(r => filterHealthLevels.includes(r.seoHealth));
  }

  results.sort((a, b) =>
    sortByWorstFirst
      ? a.contentScore - b.contentScore
      : b.contentScore - a.contentScore
  );

  return results;
}

// ── Health dashboard ──────────────────────────────────────────────────────────

export interface HealthDashboard {
  totalPages: number;
  byHealthLevel: Record<SeoHealthLevel, number>;
  byType: Record<string, { count: number; avgScore: number; needsUpdateCount: number }>;
  stalePages: number;
  orphanRiskPages: number;
  thinContentPages: number;
  missingSchemaPages: number;
  averageScore: number;
  overallSiteHealth: SeoHealthLevel;
  topIssues: Array<{ dimension: string; count: number; severity: IssueSeverity }>;
  urgentPages: PageHealthResult[];  // critical issues, sorted by score ascending
}

/**
 * Build a site-wide content health dashboard from batch results.
 */
export function buildHealthDashboard(results: PageHealthResult[]): HealthDashboard {
  if (results.length === 0) {
    return {
      totalPages: 0,
      byHealthLevel: { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 },
      byType: {},
      stalePages: 0, orphanRiskPages: 0, thinContentPages: 0, missingSchemaPages: 0,
      averageScore: 0, overallSiteHealth: 'critical',
      topIssues: [], urgentPages: [],
    };
  }

  const byHealthLevel: Record<SeoHealthLevel, number> = {
    excellent: 0, good: 0, fair: 0, poor: 0, critical: 0,
  };
  const byType: Record<string, { count: number; totalScore: number; needsUpdateCount: number }> = {};
  const issueCounts: Record<string, { count: number; severity: IssueSeverity }> = {};

  let stalePages = 0;
  let orphanRiskPages = 0;
  let thinContentPages = 0;
  let missingSchemaPages = 0;
  let totalScore = 0;

  for (const r of results) {
    byHealthLevel[r.seoHealth]++;
    totalScore += r.contentScore;

    if (!byType[r.type]) byType[r.type] = { count: 0, totalScore: 0, needsUpdateCount: 0 };
    byType[r.type].count++;
    byType[r.type].totalScore += r.contentScore;
    if (r.needsUpdate) byType[r.type].needsUpdateCount++;

    if (r.isStale)                           stalePages++;
    if (r.dimensions.orphanRisk <= 3)        orphanRiskPages++;
    if (r.dimensions.wordCount <= 2)         thinContentPages++;
    if (r.dimensions.schemaPresence === 0)   missingSchemaPages++;

    for (const issue of r.issues) {
      if (!issueCounts[issue.dimension]) {
        issueCounts[issue.dimension] = { count: 0, severity: issue.severity };
      }
      issueCounts[issue.dimension].count++;
      // Escalate severity if critical found
      if (issue.severity === 'critical') {
        issueCounts[issue.dimension].severity = 'critical';
      }
    }
  }

  const averageScore = Math.round(totalScore / results.length);
  const overallSiteHealth = scoreToSeoHealth(averageScore);

  const topIssues = Object.entries(issueCounts)
    .map(([dimension, { count, severity }]) => ({ dimension, count, severity }))
    .sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      return sevOrder[a.severity] - sevOrder[b.severity] || b.count - a.count;
    })
    .slice(0, 10);

  const urgentPages = results
    .filter(r => r.issues.some(i => i.severity === 'critical'))
    .sort((a, b) => a.contentScore - b.contentScore)
    .slice(0, 20);

  const formattedByType = Object.fromEntries(
    Object.entries(byType).map(([type, data]) => [
      type,
      {
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        needsUpdateCount: data.needsUpdateCount,
      },
    ])
  );

  return {
    totalPages: results.length,
    byHealthLevel,
    byType: formattedByType,
    stalePages,
    orphanRiskPages,
    thinContentPages,
    missingSchemaPages,
    averageScore,
    overallSiteHealth,
    topIssues,
    urgentPages,
  };
}

// ── Prioritized update queue ──────────────────────────────────────────────────

export interface UpdateQueueItem {
  url: string;
  type: HealthPageType;
  seoTitle: string;
  contentScore: number;
  seoHealth: SeoHealthLevel;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  reason: string;
  action: string;
}

/**
 * Build a prioritized update queue from health results.
 *
 * Priority levels:
 *   P0 — Stale data on revenue-generating pages (exchange/bonus) + critical issues
 *   P1 — Missing schema or orphan risk on any page
 *   P2 — Thin content, low FAQ, weak trust signals
 *   P3 — Minor improvements (word count just below target, etc.)
 */
export function buildUpdateQueue(results: PageHealthResult[]): UpdateQueueItem[] {
  const queue: UpdateQueueItem[] = [];

  for (const r of results) {
    if (!r.needsUpdate && r.contentScore >= 75) continue;

    let priority: UpdateQueueItem['priority'] = 'P3';
    let reason = '';
    let action = '';

    const criticalIssues = r.issues.filter(i => i.severity === 'critical');
    const isRevenuePage = r.type === 'exchange' || r.type === 'bonus' || r.type === 'bonus-code';

    if (isRevenuePage && r.isStale) {
      priority = 'P0';
      reason = `Stale revenue page — ${r.daysSinceVerified} days since last verification`;
      action = `Re-verify ${r.type} data, update lastVerified date, republish`;
    } else if (criticalIssues.some(i => i.dimension === 'orphanRisk' || i.dimension === 'internalLinks')) {
      priority = 'P0';
      reason = 'Orphaned page — no inbound internal links';
      action = 'Add contextual links from 3+ related pages immediately';
    } else if (criticalIssues.some(i => i.dimension === 'schemaPresence')) {
      priority = 'P1';
      reason = 'Missing JSON-LD schema — not eligible for rich results';
      action = 'Implement appropriate schema.org markup';
    } else if (r.isStale) {
      priority = 'P1';
      reason = `Stale content — ${r.daysSinceVerified} days old (threshold: ${r.staleAfterDays})`;
      action = `Update and re-verify ${r.type} content`;
    } else if (criticalIssues.some(i => i.dimension === 'wordCount')) {
      priority = 'P2';
      reason = `Thin content: ${r.dimensions.wordCount <= 2 ? 'critically thin' : 'below target'}`;
      action = 'Expand content with unique data, comparisons, or editorial analysis';
    } else if (criticalIssues.some(i => i.dimension === 'faqPresence')) {
      priority = 'P2';
      reason = 'Missing or insufficient FAQ section';
      action = 'Add 4+ FAQ items targeting high-intent user questions';
    } else if (r.dimensions.trustBlocks <= 3) {
      priority = 'P2';
      reason = 'Weak E-E-A-T signals';
      action = 'Add ReviewerBlock, EditorNote, AffiliateDisclosure';
    } else {
      priority = 'P3';
      reason = r.issues[0]?.message ?? 'Minor quality issues';
      action = r.topRecommendation ?? 'Review and improve content quality';
    }

    queue.push({
      url: r.url,
      type: r.type,
      seoTitle: r.seoTitle,
      contentScore: r.contentScore,
      seoHealth: r.seoHealth,
      priority,
      reason,
      action,
    });
  }

  // Sort: P0 first, then by score ascending within priority
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return queue.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    a.contentScore - b.contentScore
  );
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export function isHealthPageType(value: string): value is HealthPageType {
  const valid: HealthPageType[] = [
    'exchange', 'bonus', 'category', 'country', 'compare',
    'guide', 'coin', 'use-case', 'bonus-code', 'reviewer', 'static',
  ];
  return valid.includes(value as HealthPageType);
}
