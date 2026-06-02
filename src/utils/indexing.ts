/**
 * indexing.ts — Build-time SEO indexing health utilities.
 *
 * Provides:
 *  - Orphan page detection (pages with no internal links pointing to them)
 *  - Internal-link scoring (link equity distribution)
 *  - Crawl depth audit (pages too deep from homepage)
 *  - Weak-page detection (thin content, low FAQ count, missing answerBox)
 *  - Duplicate-title detection (SEO title collisions across page types)
 *  - Thin-content thresholds by page type
 *
 * Usage: import into a build script or astro:build:done hook.
 * All functions are pure (no I/O) — pass data from your data files.
 */

// ── Page types ────────────────────────────────────────────────────────────────

export type PageType =
  | 'exchange'
  | 'bonus'
  | 'category'
  | 'country'
  | 'compare'
  | 'guide'
  | 'coin'
  | 'use-case'
  | 'bonus-code'
  | 'static';

export interface SitePage {
  url: string;          // absolute path, e.g. /exchanges/bybit/
  type: PageType;
  seoTitle: string;
  wordCount?: number;   // estimated body word count
  faqCount?: number;    // number of FAQ items
  hasAnswerBox?: boolean;
  inboundLinkCount?: number;  // computed by analyseInternalLinks()
  crawlDepth?: number;        // computed by computeCrawlDepth()
}

// ── Internal link map ─────────────────────────────────────────────────────────

/** Map of page URL → array of URLs it links to */
export type InternalLinkMap = Record<string, string[]>;

// ── Thin-content thresholds by page type ──────────────────────────────────────

export const THIN_CONTENT_THRESHOLDS: Record<PageType, number> = {
  exchange:    800,
  bonus:       600,
  category:    500,
  country:     400,
  compare:     700,
  guide:      1200,
  coin:        500,
  'use-case':  600,
  'bonus-code': 400,
  static:      200,
};

/** Minimum FAQ items per page type before flagging as weak */
export const MIN_FAQ_COUNT: Record<PageType, number> = {
  exchange:    3,
  bonus:       3,
  category:    2,
  country:     2,
  compare:     2,
  guide:       0,
  coin:        3,
  'use-case':  3,
  'bonus-code': 3,
  static:      0,
};

// ── Orphan detection ──────────────────────────────────────────────────────────

export interface OrphanResult {
  url: string;
  type: PageType;
  seoTitle: string;
}

/**
 * Detect pages with zero inbound internal links.
 * Excludes the homepage (/) and static utility pages.
 */
export function detectOrphanPages(
  pages: SitePage[],
  linkMap: InternalLinkMap,
): OrphanResult[] {
  const staticExcludes = new Set(['/', '/about/', '/contact/', '/methodology/',
    '/affiliate-disclosure/', '/disclaimer/', '/privacy-policy/']);

  // Build a set of all target URLs from the link map
  const allTargets = new Set<string>();
  for (const targets of Object.values(linkMap)) {
    for (const t of targets) allTargets.add(t);
  }

  return pages
    .filter(p => !staticExcludes.has(p.url) && !allTargets.has(p.url))
    .map(p => ({ url: p.url, type: p.type, seoTitle: p.seoTitle }));
}

// ── Internal link scoring ──────────────────────────────────────────────────────

export interface InternalLinkScore {
  url: string;
  type: PageType;
  seoTitle: string;
  inboundCount: number;
  outboundCount: number;
  linkScore: number;   // 0–100 normalised score
}

/**
 * Score pages by internal link equity.
 * Higher inbound link count = higher score.
 * Returns pages sorted by linkScore descending.
 */
export function scoreInternalLinks(
  pages: SitePage[],
  linkMap: InternalLinkMap,
): InternalLinkScore[] {
  // Count inbound links per page
  const inboundCounts: Record<string, number> = {};
  for (const [, targets] of Object.entries(linkMap)) {
    for (const target of targets) {
      inboundCounts[target] = (inboundCounts[target] ?? 0) + 1;
    }
  }

  const maxInbound = Math.max(1, ...Object.values(inboundCounts));

  const scores: InternalLinkScore[] = pages.map(page => {
    const inboundCount = inboundCounts[page.url] ?? 0;
    const outboundCount = (linkMap[page.url] ?? []).length;
    const linkScore = Math.round((inboundCount / maxInbound) * 100);
    return {
      url: page.url,
      type: page.type,
      seoTitle: page.seoTitle,
      inboundCount,
      outboundCount,
      linkScore,
    };
  });

  return scores.sort((a, b) => b.linkScore - a.linkScore);
}

// ── Crawl depth audit ─────────────────────────────────────────────────────────

/** Max acceptable crawl depth before flagging as too deep */
export const MAX_CRAWL_DEPTH = 3;

export interface CrawlDepthResult {
  url: string;
  type: PageType;
  depth: number;
  tooDeep: boolean;
}

/**
 * Compute BFS crawl depth from homepage for all pages in the link map.
 * Pages unreachable from / are given depth = Infinity.
 */
export function computeCrawlDepth(
  pages: SitePage[],
  linkMap: InternalLinkMap,
): CrawlDepthResult[] {
  const depths: Record<string, number> = { '/': 0 };
  const queue: string[] = ['/'];
  const visited = new Set<string>(['/']);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths[current]!;
    for (const target of (linkMap[current] ?? [])) {
      if (!visited.has(target)) {
        visited.add(target);
        depths[target] = currentDepth + 1;
        queue.push(target);
      }
    }
  }

  const pageSet = new Map(pages.map(p => [p.url, p]));

  return pages.map(page => {
    const depth = depths[page.url] ?? Infinity;
    return {
      url: page.url,
      type: page.type,
      depth,
      tooDeep: depth > MAX_CRAWL_DEPTH,
    };
  });
}

// ── Weak-page detection ───────────────────────────────────────────────────────

export interface WeakPageFlag {
  url: string;
  type: PageType;
  seoTitle: string;
  issues: string[];
}

/**
 * Flag pages with thin content, missing FAQ, or no answerBox.
 */
export function detectWeakPages(pages: SitePage[]): WeakPageFlag[] {
  const flagged: WeakPageFlag[] = [];

  for (const page of pages) {
    const issues: string[] = [];
    const threshold = THIN_CONTENT_THRESHOLDS[page.type] ?? 400;
    const minFaq = MIN_FAQ_COUNT[page.type] ?? 0;

    if (page.wordCount !== undefined && page.wordCount < threshold) {
      issues.push(`Thin content: ${page.wordCount} words (min ${threshold})`);
    }
    if (minFaq > 0 && page.faqCount !== undefined && page.faqCount < minFaq) {
      issues.push(`Low FAQ count: ${page.faqCount} items (min ${minFaq})`);
    }
    if (page.type !== 'static' && page.type !== 'guide' && page.hasAnswerBox === false) {
      issues.push('Missing answerBox / AI summary block');
    }

    if (issues.length > 0) {
      flagged.push({ url: page.url, type: page.type, seoTitle: page.seoTitle, issues });
    }
  }

  return flagged;
}

// ── Duplicate title detection ─────────────────────────────────────────────────

export interface DuplicateTitleGroup {
  title: string;
  pages: Array<{ url: string; type: PageType }>;
}

/**
 * Find SEO title collisions across all pages.
 * Returns groups with 2+ pages sharing the same seoTitle (case-insensitive).
 */
export function detectDuplicateTitles(pages: SitePage[]): DuplicateTitleGroup[] {
  const titleMap: Record<string, Array<{ url: string; type: PageType }>> = {};

  for (const page of pages) {
    const key = page.seoTitle.toLowerCase().trim();
    if (!titleMap[key]) titleMap[key] = [];
    titleMap[key].push({ url: page.url, type: page.type });
  }

  return Object.entries(titleMap)
    .filter(([, v]) => v.length > 1)
    .map(([title, pages]) => ({ title, pages }));
}

// ── Comprehensive indexing audit ──────────────────────────────────────────────

export interface IndexingAuditReport {
  totalPages: number;
  orphanPages: OrphanResult[];
  weakPages: WeakPageFlag[];
  duplicateTitles: DuplicateTitleGroup[];
  deepPages: CrawlDepthResult[];
  lowLinkEquityPages: InternalLinkScore[];
  summary: {
    orphanCount: number;
    weakCount: number;
    duplicateTitleCount: number;
    deepPageCount: number;
    lowEquityCount: number;
    overallHealth: 'good' | 'fair' | 'poor';
  };
}

/**
 * Run a full indexing health audit.
 * @param pages      All site pages with metadata
 * @param linkMap    Internal link adjacency map
 */
export function runIndexingAudit(
  pages: SitePage[],
  linkMap: InternalLinkMap,
): IndexingAuditReport {
  const orphanPages = detectOrphanPages(pages, linkMap);
  const weakPages = detectWeakPages(pages);
  const duplicateTitles = detectDuplicateTitles(pages);
  const crawlDepths = computeCrawlDepth(pages, linkMap);
  const deepPages = crawlDepths.filter(p => p.tooDeep);
  const linkScores = scoreInternalLinks(pages, linkMap);
  const lowLinkEquityPages = linkScores.filter(p => p.linkScore < 20 && p.inboundCount < 2);

  const totalIssues = orphanPages.length + weakPages.length + duplicateTitles.length + deepPages.length;
  const overallHealth: 'good' | 'fair' | 'poor' =
    totalIssues === 0 ? 'good' :
    totalIssues <= 5 ? 'fair' : 'poor';

  return {
    totalPages: pages.length,
    orphanPages,
    weakPages,
    duplicateTitles,
    deepPages,
    lowLinkEquityPages,
    summary: {
      orphanCount: orphanPages.length,
      weakCount: weakPages.length,
      duplicateTitleCount: duplicateTitles.length,
      deepPageCount: deepPages.length,
      lowEquityCount: lowLinkEquityPages.length,
      overallHealth,
    },
  };
}

// ── Programmatic internal link map builder ─────────────────────────────────────

/**
 * Build a simplified internal link map from CryptoBonusWorld data structures.
 *
 * This models the link graph that exists in templates:
 *  - Homepage → exchange pages, category pages, coin pages, use-case pages, bonus-code pages
 *  - Exchange pages → compare pages, bonus page, category pages
 *  - Bonus pages → exchange page, category pages
 *  - Category pages → exchange pages
 *  - Use-case pages → related use-cases, related categories
 *  - Coin pages → related categories
 *  - Bonus-code pages → exchange page
 *  - Compare pages → both exchange pages
 */
export function buildSiteInternalLinkMap(params: {
  exchangeSlugs: string[];
  categorySlugs: string[];
  coinSlugs: string[];
  useCaseSlugs: string[];
  bonusCodeSlugs: string[];
  comparePairs: string[];
  guideSlugs: string[];
  countrySlugs: string[];
}): InternalLinkMap {
  const {
    exchangeSlugs, categorySlugs, coinSlugs, useCaseSlugs,
    bonusCodeSlugs, comparePairs, guideSlugs, countrySlugs,
  } = params;

  const map: InternalLinkMap = {};

  const add = (from: string, ...targets: string[]) => {
    if (!map[from]) map[from] = [];
    for (const t of targets) {
      if (!map[from].includes(t)) map[from].push(t);
    }
  };

  // Homepage links out to all major hubs
  add('/',
    '/exchanges/', '/bonuses/', '/categories/', '/compare/',
    '/use-cases/', '/coins/', '/bonus-codes/', '/guides/', '/countries/',
    ...exchangeSlugs.slice(0, 6).map(s => `/exchanges/${s}/`),
    ...categorySlugs.slice(0, 4).map(s => `/categories/${s}/`),
  );

  // Exchange hub → individual exchanges
  for (const slug of exchangeSlugs) {
    add('/exchanges/', `/exchanges/${slug}/`);
  }

  // Bonuses hub → bonus landing pages
  for (const slug of exchangeSlugs) {
    add('/bonuses/', `/bonuses/${slug}-bonus/`);
  }

  // Each exchange page → its bonus page, compare pairs, categories
  for (const slug of exchangeSlugs) {
    const exUrl = `/exchanges/${slug}/`;
    add(exUrl, `/bonuses/${slug}-bonus/`);
    // Link to compares involving this exchange
    for (const pair of comparePairs) {
      if (pair.includes(slug)) add(exUrl, `/compare/${pair}/`);
    }
    // Link to a few top categories
    for (const cat of categorySlugs.slice(0, 3)) {
      add(exUrl, `/categories/${cat}/`);
    }
  }

  // Each bonus page → exchange page
  for (const slug of exchangeSlugs) {
    add(`/bonuses/${slug}-bonus/`, `/exchanges/${slug}/`);
  }

  // Category pages → exchange pages
  for (const cat of categorySlugs) {
    const catUrl = `/categories/${cat}/`;
    add('/categories/', catUrl);
    for (const ex of exchangeSlugs) {
      add(catUrl, `/exchanges/${ex}/`);
    }
  }

  // Compare pages → both exchange pages
  for (const pair of comparePairs) {
    const pairUrl = `/compare/${pair}/`;
    add('/compare/', pairUrl);
    const [a, , b] = pair.split('-vs-');
    if (a) add(pairUrl, `/exchanges/${a}/`);
    if (b) add(pairUrl, `/exchanges/${b}/`);
  }

  // Coin pages → related categories
  for (const coin of coinSlugs) {
    const coinUrl = `/coins/${coin}/`;
    add('/coins/', coinUrl);
    add(coinUrl, '/categories/no-kyc-bonuses/', '/categories/signup-bonuses/');
  }

  // Use-case pages → related use-cases, categories
  for (const uc of useCaseSlugs) {
    const ucUrl = `/use-cases/${uc}/`;
    add('/use-cases/', ucUrl);
    add(ucUrl, '/methodology/');
    for (const cat of categorySlugs.slice(0, 2)) {
      add(ucUrl, `/categories/${cat}/`);
    }
  }

  // Bonus-code pages → exchange pages
  for (const exc of bonusCodeSlugs) {
    const bcUrl = `/bonus-codes/${exc}/`;
    add('/bonus-codes/', bcUrl);
    add(bcUrl, `/exchanges/${exc}/`, `/bonuses/${exc}-bonus/`);
  }

  // Guide pages
  for (const guide of guideSlugs) {
    add('/guides/', `/guides/${guide}/`);
  }

  // Country pages
  for (const country of countrySlugs) {
    add('/countries/', `/countries/${country}/`);
  }

  return map;
}

// ── Sitemap segment builder ────────────────────────────────────────────────────

export interface SitemapSegment {
  name: string;
  filename: string;   // e.g. sitemap-exchanges.xml
  urls: string[];
  priority: string;
  changefreq: string;
}

/**
 * Segment all site URLs into logical sitemap groups.
 * Use this to build a sitemap index pointing to per-type sitemaps.
 */
export function buildSitemapSegments(params: {
  exchangeSlugs: string[];
  bonusSlugs: string[];       // exchange slugs (bonus pages)
  categorySlugs: string[];
  countrySlugs: string[];
  comparePairs: string[];
  guideSlugs: string[];
  coinSlugs: string[];
  useCaseSlugs: string[];
  bonusCodeSlugs: string[];
  staticUrls: string[];
}): SitemapSegment[] {
  const {
    exchangeSlugs, bonusSlugs, categorySlugs, countrySlugs,
    comparePairs, guideSlugs, coinSlugs, useCaseSlugs, bonusCodeSlugs, staticUrls,
  } = params;

  return [
    {
      name: 'Exchanges',
      filename: 'sitemap-exchanges.xml',
      urls: exchangeSlugs.map(s => `/exchanges/${s}/`),
      priority: '0.85',
      changefreq: 'weekly',
    },
    {
      name: 'Bonus Pages',
      filename: 'sitemap-bonuses.xml',
      urls: [...bonusSlugs.map(s => `/bonuses/${s}-bonus/`),
             ...bonusCodeSlugs.map(s => `/bonus-codes/${s}/`)],
      priority: '0.82',
      changefreq: 'weekly',
    },
    {
      name: 'Content Pages',
      filename: 'sitemap-content.xml',
      urls: [
        ...categorySlugs.map(s => `/categories/${s}/`),
        ...countrySlugs.map(s => `/countries/${s}/`),
        ...comparePairs.map(p => `/compare/${p}/`),
        ...guideSlugs.map(s => `/guides/${s}/`),
      ],
      priority: '0.78',
      changefreq: 'weekly',
    },
    {
      name: 'Programmatic SEO',
      filename: 'sitemap-programmatic.xml',
      urls: [
        ...coinSlugs.map(s => `/coins/${s}/`),
        ...useCaseSlugs.map(s => `/use-cases/${s}/`),
      ],
      priority: '0.80',
      changefreq: 'weekly',
    },
    {
      name: 'Static Pages',
      filename: 'sitemap-static.xml',
      urls: staticUrls,
      priority: '0.50',
      changefreq: 'monthly',
    },
  ];
}
