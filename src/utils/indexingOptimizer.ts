/**
 * indexingOptimizer.ts — Advanced Indexing & Crawl Efficiency System
 * ====================================================================
 *
 * Extends indexing.ts with higher-level crawl optimization:
 *
 *   balanceSitemapPriorities()    — assign data-driven priority scores per URL
 *   detectStaleUrls()             — URLs not updated past their threshold
 *   detectThinContentUrls()       — pages likely to be thin based on type + age
 *   detectDuplicateMeta()         — duplicate title or description across page sets
 *   detectWeakHubs()              — hub pages with too few outbound links
 *   detectCanonicalIssues()       — duplicate URL variants that may compete
 *   buildIndexingOptReport()      — full optimization report
 *
 * Designed to run at build time — pure functions, no I/O.
 * Import indexing.ts types for compatibility.
 */

import type { PageType, SitePage } from './indexing.ts';

// ── Priority scoring ──────────────────────────────────────────────────────────

/** Sitemap priority baseline by page type */
export const PRIORITY_BASELINE: Record<PageType, number> = {
  exchange:     0.85,
  bonus:        0.82,
  'bonus-code': 0.80,
  category:     0.78,
  compare:      0.78,
  'use-case':   0.80,
  coin:         0.78,
  country:      0.72,
  guide:        0.75,
  static:       0.50,
};

/** Change frequency by page type */
export const CHANGE_FREQ: Record<PageType, string> = {
  exchange:     'weekly',
  bonus:        'weekly',
  'bonus-code': 'weekly',
  category:     'weekly',
  compare:      'weekly',
  'use-case':   'weekly',
  coin:         'weekly',
  country:      'monthly',
  guide:        'monthly',
  static:       'monthly',
};

export interface PrioritisedUrl {
  url: string;
  type: PageType;
  priority: string;     // "0.80" format
  changefreq: string;
  boostReason?: string; // Why priority was raised above baseline
  penaltyReason?: string;
}

/**
 * Assign data-driven sitemap priority scores to pages.
 *
 * Boosts:  high inbound link count, exchange/bonus type, verified data
 * Penalties: thin content, stale data, orphan pages
 */
export function balanceSitemapPriorities(
  pages: SitePage[],
  linkMap: Record<string, string[]>,
  options: {
    freshSlugs?: Set<string>;   // Recently updated — boost these
    staleSlugs?: Set<string>;   // Not updated — penalise these
    thinSlugs?: Set<string>;    // Thin content — penalise these
    inboundCounts?: Record<string, number>;
  } = {}
): PrioritisedUrl[] {
  const { freshSlugs, staleSlugs, thinSlugs, inboundCounts } = options;

  // Compute inbound counts if not provided
  const counts: Record<string, number> = inboundCounts ?? {};
  if (!inboundCounts) {
    for (const targets of Object.values(linkMap)) {
      for (const t of targets) counts[t] = (counts[t] ?? 0) + 1;
    }
  }

  return pages.map(page => {
    let priority = PRIORITY_BASELINE[page.type] ?? 0.60;
    let boostReason: string | undefined;
    let penaltyReason: string | undefined;

    // Boost: freshly updated data
    if (freshSlugs?.has(page.url)) {
      priority = Math.min(0.99, priority + 0.05);
      boostReason = 'Recently updated data';
    }

    // Boost: high inbound links (well-linked = more authoritative)
    const inbound = counts[page.url] ?? 0;
    if (inbound >= 8) {
      priority = Math.min(0.99, priority + 0.04);
      boostReason = (boostReason ? boostReason + ', ' : '') + `High link equity (${inbound} inbound)`;
    } else if (inbound >= 5) {
      priority = Math.min(0.99, priority + 0.02);
    }

    // Penalty: stale data
    if (staleSlugs?.has(page.url)) {
      priority = Math.max(0.10, priority - 0.10);
      penaltyReason = 'Stale data — not updated in 90+ days';
    }

    // Penalty: thin content
    if (thinSlugs?.has(page.url)) {
      priority = Math.max(0.10, priority - 0.08);
      penaltyReason = (penaltyReason ? penaltyReason + ', ' : '') + 'Thin content';
    }

    // Penalty: orphan (0 inbound links)
    if (inbound === 0 && page.type !== 'static') {
      priority = Math.max(0.10, priority - 0.15);
      penaltyReason = (penaltyReason ? penaltyReason + ', ' : '') + 'Orphan page (0 inbound links)';
    }

    return {
      url: page.url,
      type: page.type,
      priority: priority.toFixed(2),
      changefreq: CHANGE_FREQ[page.type] ?? 'monthly',
      boostReason,
      penaltyReason,
    };
  });
}

// ── Stale URL detection ───────────────────────────────────────────────────────

/** Days after which each page type is stale for indexing purposes */
export const INDEXING_STALE_DAYS: Record<PageType, number> = {
  exchange:     45,
  bonus:        45,
  'bonus-code': 30,
  category:     90,
  compare:      60,
  'use-case':   90,
  coin:         90,
  country:      120,
  guide:        180,
  static:       365,
};

export interface StaleUrl {
  url: string;
  type: PageType;
  seoTitle: string;
  lastModified: string | undefined;
  daysSinceUpdate: number;
  thresholdDays: number;
  urgency: 'critical' | 'warning';
  action: string;
}

/**
 * Detect URLs that have not been updated past their staleness threshold.
 */
export function detectStaleUrls(
  pages: Array<SitePage & { lastModified?: string }>,
): StaleUrl[] {
  const now = new Date();

  return pages
    .filter(p => p.type !== 'static')
    .map(page => {
      const lastMod = page.lastModified;
      let days = 999;

      if (lastMod) {
        try {
          const d = new Date(lastMod);
          days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        } catch {
          days = 999;
        }
      }

      const threshold = INDEXING_STALE_DAYS[page.type] ?? 90;
      if (days <= threshold) return null;

      return {
        url: page.url,
        type: page.type,
        seoTitle: page.seoTitle,
        lastModified: lastMod,
        daysSinceUpdate: days,
        thresholdDays: threshold,
        urgency: days > threshold * 2 ? 'critical' : 'warning',
        action: `Re-verify ${page.type} data and update lastModified`,
      };
    })
    .filter((r): r is StaleUrl => r !== null)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

// ── Thin content detection ─────────────────────────────────────────────────────

export interface ThinContentUrl {
  url: string;
  type: PageType;
  seoTitle: string;
  wordCount: number | undefined;
  threshold: number;
  deficit: number | undefined;
  severity: 'critical' | 'warning';
  recommendation: string;
}

/** Min word counts at which a page is considered indexing-safe */
export const INDEXING_MIN_WORDS: Record<PageType, number> = {
  exchange:     500,
  bonus:        400,
  'bonus-code': 250,
  category:     350,
  compare:      500,
  'use-case':   400,
  coin:         350,
  country:      300,
  guide:        800,
  static:       100,
};

/**
 * Detect pages likely to be penalised for thin content.
 */
export function detectThinContentUrls(
  pages: SitePage[],
): ThinContentUrl[] {
  return pages
    .filter(p => p.wordCount !== undefined)
    .map(page => {
      const threshold = INDEXING_MIN_WORDS[page.type] ?? 300;
      const wordCount = page.wordCount!;
      if (wordCount >= threshold) return null;

      const deficit = threshold - wordCount;
      const severity: 'critical' | 'warning' = wordCount < threshold * 0.5 ? 'critical' : 'warning';

      return {
        url: page.url,
        type: page.type,
        seoTitle: page.seoTitle,
        wordCount,
        threshold,
        deficit,
        severity,
        recommendation: `Add ~${deficit} words of unique content: more data, editor notes, FAQ, or comparison tables.`,
      };
    })
    .filter((r): r is ThinContentUrl => r !== null)
    .sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0));
}

// ── Duplicate meta detection ──────────────────────────────────────────────────

export interface MetaPage {
  url: string;
  type: PageType;
  seoTitle: string;
  metaDescription?: string;
}

export interface DuplicateMetaGroup {
  field: 'title' | 'description';
  value: string;
  pages: Array<{ url: string; type: PageType }>;
  severity: 'critical' | 'warning';
  recommendation: string;
}

/**
 * Detect duplicate title tags and meta descriptions across all pages.
 */
export function detectDuplicateMeta(pages: MetaPage[]): DuplicateMetaGroup[] {
  const titleMap: Record<string, Array<{ url: string; type: PageType }>> = {};
  const descMap:  Record<string, Array<{ url: string; type: PageType }>> = {};

  for (const page of pages) {
    const titleKey = page.seoTitle.toLowerCase().trim();
    if (!titleMap[titleKey]) titleMap[titleKey] = [];
    titleMap[titleKey].push({ url: page.url, type: page.type });

    if (page.metaDescription) {
      const descKey = page.metaDescription.toLowerCase().trim();
      if (!descMap[descKey]) descMap[descKey] = [];
      descMap[descKey].push({ url: page.url, type: page.type });
    }
  }

  const results: DuplicateMetaGroup[] = [];

  for (const [title, dupePages] of Object.entries(titleMap)) {
    if (dupePages.length < 2) continue;
    results.push({
      field: 'title',
      value: title,
      pages: dupePages,
      severity: 'critical',
      recommendation: 'Each page must have a unique title tag. Differentiate using exchange name, year, coin, or unique modifier.',
    });
  }

  for (const [desc, dupePages] of Object.entries(descMap)) {
    if (dupePages.length < 2) continue;
    results.push({
      field: 'description',
      value: desc.slice(0, 80) + '...',
      pages: dupePages,
      severity: 'warning',
      recommendation: 'Unique meta descriptions improve CTR. Add page-specific signals: bonus amount, exchange name, key feature.',
    });
  }

  return results.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.pages.length - a.pages.length;
  });
}

// ── Weak hub detection ────────────────────────────────────────────────────────

export interface HubPage {
  url: string;
  label: string;
  targetMinLinks: number;    // min outbound links expected
}

export const SITE_HUBS: HubPage[] = [
  { url: '/',              label: 'Homepage',          targetMinLinks: 20 },
  { url: '/exchanges/',    label: 'Exchanges Hub',     targetMinLinks: 10 },
  { url: '/bonuses/',      label: 'Bonuses Hub',       targetMinLinks: 10 },
  { url: '/categories/',   label: 'Categories Hub',    targetMinLinks: 8 },
  { url: '/compare/',      label: 'Compare Hub',       targetMinLinks: 8 },
  { url: '/use-cases/',    label: 'Use-Cases Hub',     targetMinLinks: 8 },
  { url: '/coins/',        label: 'Coins Hub',         targetMinLinks: 8 },
  { url: '/guides/',       label: 'Guides Hub',        targetMinLinks: 5 },
  { url: '/bonus-codes/',  label: 'Bonus Codes Hub',   targetMinLinks: 5 },
  { url: '/countries/',    label: 'Countries Hub',     targetMinLinks: 5 },
];

export interface WeakHubResult {
  url: string;
  label: string;
  outboundCount: number;
  targetMinLinks: number;
  deficit: number;
  severity: 'critical' | 'warning';
  recommendation: string;
}

/**
 * Detect hub pages with too few outbound links.
 * Weak hubs distribute less link equity to spoke pages.
 */
export function detectWeakHubs(
  linkMap: Record<string, string[]>,
  customHubs: HubPage[] = SITE_HUBS,
): WeakHubResult[] {
  const results: WeakHubResult[] = [];

  for (const hub of customHubs) {
    const outboundLinks = linkMap[hub.url] ?? [];
    const outboundCount = outboundLinks.length;

    if (outboundCount >= hub.targetMinLinks) continue;

    const deficit = hub.targetMinLinks - outboundCount;
    const severity: 'critical' | 'warning' = outboundCount < hub.targetMinLinks / 2 ? 'critical' : 'warning';

    results.push({
      url: hub.url,
      label: hub.label,
      outboundCount,
      targetMinLinks: hub.targetMinLinks,
      deficit,
      severity,
      recommendation: `Add ${deficit} more internal links from ${hub.label}. ` +
        `Hub pages must link to all major spoke pages to distribute link equity effectively.`,
    });
  }

  return results.sort((a, b) => a.outboundCount - b.outboundCount);
}

// ── Canonical issues ──────────────────────────────────────────────────────────

export interface CanonicalIssue {
  type: 'trailing-slash' | 'case-variant' | 'duplicate-path' | 'pagination';
  urlA: string;
  urlB: string;
  recommendation: string;
}

/**
 * Detect common canonical URL issues that cause indexing confusion.
 * Checks for:
 *  - Trailing slash variants (/page vs /page/)
 *  - Case variants (/Exchanges/ vs /exchanges/)
 *  - Duplicate paths (/bonuses/bybit vs /bonuses/bybit-bonus)
 */
export function detectCanonicalIssues(urls: string[]): CanonicalIssue[] {
  const issues: CanonicalIssue[] = [];
  const seen = new Map<string, string>();

  for (const url of urls) {
    // Normalise: lowercase + ensure trailing slash
    const normalised = url.toLowerCase().replace(/\/?$/, '/');
    if (seen.has(normalised) && seen.get(normalised) !== url) {
      issues.push({
        type: url.toLowerCase() !== url ? 'case-variant' : 'trailing-slash',
        urlA: seen.get(normalised)!,
        urlB: url,
        recommendation: `Ensure consistent URL format. Preferred: "${normalised}". Add 301 redirect from non-canonical variant.`,
      });
    }
    seen.set(normalised, url);
  }

  // Check for duplicate semantic paths (e.g., /bonuses/bybit/ and /bonuses/bybit-bonus/)
  const bonusPages = urls.filter(u => u.startsWith('/bonuses/'));
  for (const url of bonusPages) {
    const slug = url.replace('/bonuses/', '').replace(/\/$/, '');
    const withoutSuffix = slug.replace(/-bonus$/, '');
    const canonical = `/bonuses/${withoutSuffix}-bonus/`;
    const bare = `/bonuses/${withoutSuffix}/`;
    if (urls.includes(canonical) && urls.includes(bare)) {
      issues.push({
        type: 'duplicate-path',
        urlA: canonical,
        urlB: bare,
        recommendation: `Choose one canonical URL for this bonus page. Add rel="canonical" pointing to "${canonical}".`,
      });
    }
  }

  return issues;
}

// ── Full optimization report ──────────────────────────────────────────────────

export interface IndexingOptReport {
  totalUrls: number;
  prioritisedUrls: PrioritisedUrl[];
  staleUrls: StaleUrl[];
  thinContentUrls: ThinContentUrl[];
  duplicateMetaGroups: DuplicateMetaGroup[];
  weakHubs: WeakHubResult[];
  canonicalIssues: CanonicalIssue[];
  summary: {
    staleCount: number;
    thinCount: number;
    duplicateTitleCount: number;
    weakHubCount: number;
    canonicalIssueCount: number;
    averagePriority: number;
    crawlHealthScore: number;   // 0–100
    topAction: string;
  };
}

/**
 * Build a comprehensive indexing optimization report.
 */
export function buildIndexingOptReport(
  pages: Array<SitePage & { lastModified?: string; metaDescription?: string }>,
  linkMap: Record<string, string[]>,
): IndexingOptReport {
  const prioritisedUrls  = balanceSitemapPriorities(pages, linkMap);
  const staleUrls        = detectStaleUrls(pages);
  const thinContentUrls  = detectThinContentUrls(pages);
  const duplicateMetaGroups = detectDuplicateMeta(pages as MetaPage[]);
  const weakHubs         = detectWeakHubs(linkMap);
  const canonicalIssues  = detectCanonicalIssues(pages.map(p => p.url));

  const avgPriority = prioritisedUrls.length > 0
    ? prioritisedUrls.reduce((s, u) => s + parseFloat(u.priority), 0) / prioritisedUrls.length
    : 0;

  // Crawl health: starts at 100, deduct per issue category
  let crawlHealthScore = 100;
  crawlHealthScore -= Math.min(30, staleUrls.filter(u => u.urgency === 'critical').length * 3);
  crawlHealthScore -= Math.min(20, thinContentUrls.filter(u => u.severity === 'critical').length * 4);
  crawlHealthScore -= Math.min(20, duplicateMetaGroups.filter(u => u.severity === 'critical').length * 5);
  crawlHealthScore -= Math.min(15, weakHubs.filter(h => h.severity === 'critical').length * 5);
  crawlHealthScore -= Math.min(10, canonicalIssues.length * 2);
  crawlHealthScore = Math.max(0, crawlHealthScore);

  // Top action to take
  let topAction = 'Crawl health is strong — maintain regular data re-verification';
  if (staleUrls.filter(u => u.urgency === 'critical').length > 0) {
    topAction = `Re-verify ${staleUrls.filter(u => u.urgency === 'critical').length} critically stale pages (exchange/bonus data)`;
  } else if (duplicateMetaGroups.filter(u => u.severity === 'critical').length > 0) {
    topAction = `Fix ${duplicateMetaGroups.filter(u => u.severity === 'critical').length} duplicate title tags to prevent page cannibalisation`;
  } else if (weakHubs.filter(h => h.severity === 'critical').length > 0) {
    topAction = `Strengthen weak hub pages (${weakHubs.map(h => h.label).join(', ')}) with more outbound links`;
  } else if (thinContentUrls.length > 0) {
    topAction = `Expand thin content on ${thinContentUrls.length} pages to avoid quality penalties`;
  }

  return {
    totalUrls: pages.length,
    prioritisedUrls,
    staleUrls,
    thinContentUrls,
    duplicateMetaGroups,
    weakHubs,
    canonicalIssues,
    summary: {
      staleCount: staleUrls.length,
      thinCount: thinContentUrls.length,
      duplicateTitleCount: duplicateMetaGroups.filter(g => g.field === 'title').length,
      weakHubCount: weakHubs.length,
      canonicalIssueCount: canonicalIssues.length,
      averagePriority: Math.round(avgPriority * 100) / 100,
      crawlHealthScore,
      topAction,
    },
  };
}
