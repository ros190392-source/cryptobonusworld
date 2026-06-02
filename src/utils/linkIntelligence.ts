/**
 * linkIntelligence.ts — Internal Link Graph Intelligence
 * ========================================================
 *
 * Advanced link-graph analysis layer on top of internalLinks.ts:
 *
 *   detectWeaklyLinkedPages()     — pages with insufficient inbound links by type
 *   detectOrphanCandidates()      — near-orphan pages (1–2 inbound links)
 *   detectOverLinkedAnchors()     — anchor texts used too many times (exact-match spam)
 *   scoreAnchorDiversity()        — anchor text diversity per source page
 *   suggestRelatedContent()       — contextual cross-link recommendations
 *   buildLinkHealthReport()       — unified link health report
 *
 * Designed to run at build time. All functions are pure.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type LinkPageType =
  | 'exchange' | 'bonus' | 'category' | 'country' | 'compare'
  | 'guide' | 'coin' | 'use-case' | 'bonus-code' | 'static';

export interface LinkPage {
  url: string;
  type: LinkPageType;
  seoTitle: string;
  slug?: string;
  /** Tags / feature badges for contextual matching */
  tags?: string[];
  /** Exchange slugs this page is relevant to */
  relatedExchanges?: string[];
  /** Coin slugs this page covers */
  relatedCoins?: string[];
}

export interface AnchoredLink {
  from: string;
  to: string;
  anchor: string;
}

/** Full internal link map: from URL → array of anchored links */
export type AnchoredLinkMap = Record<string, AnchoredLink[]>;

// ── Minimum inbound link targets by page type ─────────────────────────────────

export const MIN_INBOUND_LINKS: Record<LinkPageType, number> = {
  exchange:    5,   // high-value pages need strong link equity
  bonus:       4,
  category:    4,
  country:     3,
  compare:     2,
  guide:       3,
  coin:        3,
  'use-case':  3,
  'bonus-code': 2,
  static:      1,
};

// ── Max same-anchor uses before flagging ──────────────────────────────────────

export const MAX_SAME_ANCHOR_USES = 3;

// ── Weakly linked pages ───────────────────────────────────────────────────────

export interface WeakLinkResult {
  url: string;
  type: LinkPageType;
  seoTitle: string;
  inboundCount: number;
  targetCount: number;
  deficit: number;
  severity: 'warning' | 'critical';
  suggestion: string;
}

/**
 * Detect pages with fewer inbound internal links than their type requires.
 */
export function detectWeaklyLinkedPages(
  pages: LinkPage[],
  linkMap: Record<string, string[]>,
): WeakLinkResult[] {
  // Count inbound links
  const inbound: Record<string, number> = {};
  for (const targets of Object.values(linkMap)) {
    for (const t of targets) {
      inbound[t] = (inbound[t] ?? 0) + 1;
    }
  }

  const results: WeakLinkResult[] = [];

  for (const page of pages) {
    if (page.type === 'static') continue;
    const target = MIN_INBOUND_LINKS[page.type] ?? 2;
    const count  = inbound[page.url] ?? 0;
    if (count >= target) continue;

    const deficit = target - count;
    const severity: 'warning' | 'critical' = count === 0 ? 'critical' : 'warning';

    const suggestionMap: Record<LinkPageType, string> = {
      exchange:    'Link from related use-case pages, coin pages, and category pages',
      bonus:       'Link from the exchange page and at least 2 category pages',
      category:    'Link from homepage, hub pages and relevant exchange pages',
      country:     'Link from exchange pages that serve this country',
      compare:     'Link from both compared exchange pages',
      guide:       'Link from relevant use-case pages and the guides hub',
      coin:        'Link from exchange pages that list this coin and the coins hub',
      'use-case':  'Link from homepage, use-cases hub, and relevant exchange pages',
      'bonus-code':'Link from the exchange review page and bonus landing page',
      static:      'Link from footer or sitemap hub',
    };

    results.push({
      url: page.url,
      type: page.type,
      seoTitle: page.seoTitle,
      inboundCount: count,
      targetCount: target,
      deficit,
      severity,
      suggestion: suggestionMap[page.type] ?? 'Add more inbound links from related pages',
    });
  }

  return results.sort((a, b) => a.inboundCount - b.inboundCount);
}

// ── Orphan candidates ─────────────────────────────────────────────────────────

export interface OrphanCandidate {
  url: string;
  type: LinkPageType;
  seoTitle: string;
  inboundCount: number;
  riskLevel: 'orphan' | 'near-orphan';
  urgency: 'immediate' | 'soon';
}

/**
 * Find orphan pages (0 inbound links) and near-orphan pages (1–2 inbound links).
 * Excludes the homepage and static utility pages.
 */
export function detectOrphanCandidates(
  pages: LinkPage[],
  linkMap: Record<string, string[]>,
): OrphanCandidate[] {
  const excluded = new Set([
    '/', '/about/', '/contact/', '/methodology/',
    '/affiliate-disclosure/', '/disclaimer/', '/privacy-policy/',
    '/editorial-policy/', '/update-policy/',
  ]);

  const inbound: Record<string, number> = {};
  for (const targets of Object.values(linkMap)) {
    for (const t of targets) {
      inbound[t] = (inbound[t] ?? 0) + 1;
    }
  }

  return pages
    .filter(p => !excluded.has(p.url))
    .map(p => {
      const count = inbound[p.url] ?? 0;
      return { page: p, count };
    })
    .filter(({ count }) => count <= 2)
    .map(({ page, count }) => ({
      url: page.url,
      type: page.type,
      seoTitle: page.seoTitle,
      inboundCount: count,
      riskLevel: count === 0 ? 'orphan' : 'near-orphan',
      urgency: count === 0 ? 'immediate' : 'soon',
    }))
    .sort((a, b) => a.inboundCount - b.inboundCount);
}

// ── Over-linked anchors ───────────────────────────────────────────────────────

export interface OverLinkedAnchor {
  anchor: string;
  uses: number;
  pages: string[];    // source pages using this anchor
  recommendation: string;
}

/**
 * Find anchor texts used too many times across the site (exact-match spam signal).
 * Uses the anchored link map for richer analysis.
 */
export function detectOverLinkedAnchors(
  anchoredLinks: AnchoredLink[],
  maxUses = MAX_SAME_ANCHOR_USES,
): OverLinkedAnchor[] {
  const anchorMap: Record<string, Set<string>> = {};

  for (const link of anchoredLinks) {
    const key = link.anchor.toLowerCase().trim();
    if (!anchorMap[key]) anchorMap[key] = new Set();
    anchorMap[key].add(link.from);
  }

  return Object.entries(anchorMap)
    .filter(([, pages]) => pages.size > maxUses)
    .map(([anchor, pages]) => ({
      anchor,
      uses: pages.size,
      pages: [...pages],
      recommendation: `Rotate "${anchor}" with semantic variants: brand name, bonus amount, feature description`,
    }))
    .sort((a, b) => b.uses - a.uses);
}

// ── Anchor diversity scoring ──────────────────────────────────────────────────

export interface AnchorDiversityScore {
  url: string;
  uniqueAnchors: number;
  totalLinks: number;
  diversityRatio: number;  // uniqueAnchors / totalLinks — higher = more diverse
  score: number;           // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
}

/**
 * Score the anchor text diversity for each page's outbound links.
 * Low diversity = potential exact-match spam signal.
 */
export function scoreAnchorDiversity(
  anchoredLinks: AnchoredLink[],
): AnchorDiversityScore[] {
  // Group by source page
  const byPage: Record<string, AnchoredLink[]> = {};
  for (const link of anchoredLinks) {
    if (!byPage[link.from]) byPage[link.from] = [];
    byPage[link.from].push(link);
  }

  return Object.entries(byPage).map(([url, links]) => {
    const totalLinks = links.length;
    const uniqueAnchors = new Set(links.map(l => l.anchor.toLowerCase().trim())).size;
    const diversityRatio = totalLinks > 0 ? uniqueAnchors / totalLinks : 1;

    // Count any single anchor used 3+ times
    const anchorCounts: Record<string, number> = {};
    for (const l of links) {
      const k = l.anchor.toLowerCase().trim();
      anchorCounts[k] = (anchorCounts[k] ?? 0) + 1;
    }
    const overusedAnchors = Object.entries(anchorCounts)
      .filter(([, c]) => c >= MAX_SAME_ANCHOR_USES)
      .map(([anchor]) => anchor);

    const issues: string[] = [];
    if (diversityRatio < 0.5) issues.push('More than half of outbound links share the same anchor text');
    if (overusedAnchors.length > 0) {
      issues.push(`Overused anchors: "${overusedAnchors.slice(0, 3).join('", "')}"`);
    }
    if (totalLinks > 20) issues.push('High outbound link count — consider reducing');

    // Score: ratio-based + penalty for over-used anchors
    const rawScore = diversityRatio * 80 + (overusedAnchors.length === 0 ? 20 : 0);
    const score = Math.min(100, Math.round(rawScore));
    const grade: AnchorDiversityScore['grade'] =
      score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

    return { url, uniqueAnchors, totalLinks, diversityRatio, score, grade, issues };
  });
}

// ── Auto related-content suggestions ─────────────────────────────────────────

export interface RelatedContentSuggestion {
  fromUrl: string;
  fromTitle: string;
  toUrl: string;
  toTitle: string;
  reason: string;
  anchorSuggestion: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Suggest contextual internal links based on page type, tags, and related entities.
 * Does NOT generate links that already exist in the current link map.
 */
export function suggestRelatedContent(
  pages: LinkPage[],
  existingLinkMap: Record<string, string[]>,
  options: {
    maxSuggestionsPerPage?: number;
    onlyOrphanTargets?: boolean;
  } = {}
): RelatedContentSuggestion[] {
  const { maxSuggestionsPerPage = 5, onlyOrphanTargets = false } = options;

  // Build inbound count for orphan filter
  const inbound: Record<string, number> = {};
  for (const targets of Object.values(existingLinkMap)) {
    for (const t of targets) inbound[t] = (inbound[t] ?? 0) + 1;
  }

  const pageMap = new Map(pages.map(p => [p.url, p]));
  const suggestions: RelatedContentSuggestion[] = [];

  for (const source of pages) {
    if (source.type === 'static') continue;
    const existing = new Set(existingLinkMap[source.url] ?? []);
    let pageCount = 0;

    for (const target of pages) {
      if (pageCount >= maxSuggestionsPerPage) break;
      if (target.url === source.url) continue;
      if (existing.has(target.url)) continue;
      if (onlyOrphanTargets && (inbound[target.url] ?? 0) > 2) continue;

      const { match, reason, anchor, confidence } = computeLinkRelevance(source, target);
      if (!match) continue;

      suggestions.push({
        fromUrl: source.url,
        fromTitle: source.seoTitle,
        toUrl: target.url,
        toTitle: target.seoTitle,
        reason,
        anchorSuggestion: anchor,
        confidence,
      });
      pageCount++;
    }
  }

  // Sort by confidence
  const confOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence]);
}

/**
 * Compute link relevance between two pages.
 * Returns whether a link should exist, the reason, and suggested anchor text.
 */
function computeLinkRelevance(
  source: LinkPage,
  target: LinkPage,
): { match: boolean; reason: string; anchor: string; confidence: 'high' | 'medium' | 'low' } {

  // Exchange → its compare pages
  if (source.type === 'exchange' && target.type === 'compare') {
    const slug = source.slug ?? source.url.replace(/^\/exchanges\/|\/$/g, '');
    if (target.url.includes(slug)) {
      return { match: true, reason: 'Exchange featured in compare pair', anchor: target.seoTitle, confidence: 'high' };
    }
  }

  // Exchange → its bonus-code page
  if (source.type === 'exchange' && target.type === 'bonus-code') {
    const slug = source.slug ?? source.url.replace(/^\/exchanges\/|\/$/g, '');
    if (target.url.includes(slug)) {
      return { match: true, reason: 'Bonus code page for this exchange', anchor: `${source.seoTitle} bonus code`, confidence: 'high' };
    }
  }

  // Coin page → exchanges that support it
  if (source.type === 'coin' && target.type === 'exchange') {
    const targetSlug = target.slug ?? target.url.replace(/^\/exchanges\/|\/$/g, '');
    if ((source.relatedExchanges ?? []).includes(targetSlug)) {
      return { match: true, reason: 'Exchange supports this coin', anchor: `buy ${source.seoTitle.split(' ')[1] ?? 'coin'} on ${target.seoTitle}`, confidence: 'high' };
    }
  }

  // Use-case → related exchanges (by tags)
  if (source.type === 'use-case' && target.type === 'exchange') {
    const sourceTags = source.tags ?? [];
    const targetTags = target.tags ?? [];
    const overlap = sourceTags.filter(t => targetTags.includes(t));
    if (overlap.length >= 2) {
      return { match: true, reason: `Shared tags: ${overlap.join(', ')}`, anchor: `${target.seoTitle} for ${sourceTags[0] ?? 'this use case'}`, confidence: 'high' };
    }
    if (overlap.length === 1) {
      return { match: true, reason: `Tag match: ${overlap[0]}`, anchor: target.seoTitle, confidence: 'medium' };
    }
  }

  // Guide → relevant use-case
  if (source.type === 'guide' && target.type === 'use-case') {
    const sourceTags = source.tags ?? [];
    const targetTags = target.tags ?? [];
    if (sourceTags.some(t => targetTags.includes(t))) {
      return { match: true, reason: 'Topically related use-case', anchor: target.seoTitle, confidence: 'medium' };
    }
  }

  // Category → coin pages (spot exchanges)
  if (source.type === 'category' && target.type === 'coin') {
    const catSlug = source.slug ?? source.url.replace(/^\/categories\/|\/$/g, '');
    if (catSlug.includes('spot') || catSlug.includes('signup') || catSlug.includes('no-kyc')) {
      return { match: true, reason: 'Category relevant to coin trading', anchor: `buy ${target.seoTitle}`, confidence: 'low' };
    }
  }

  // Compare → related exchanges
  if (source.type === 'compare' && target.type === 'exchange') {
    const targetSlug = target.slug ?? target.url.replace(/^\/exchanges\/|\/$/g, '');
    if (source.relatedExchanges?.includes(targetSlug)) {
      return { match: true, reason: 'Exchange is part of this comparison', anchor: target.seoTitle, confidence: 'high' };
    }
  }

  return { match: false, reason: '', anchor: '', confidence: 'low' };
}

// ── Contextual cross-link engine ──────────────────────────────────────────────

export interface CrossLinkOpportunity {
  cluster: string;
  pages: string[];      // URLs in this cluster
  missingLinks: Array<{ from: string; to: string; anchor: string }>;
  linkDensity: number;  // actual links / max possible links (0–1)
  completeness: 'complete' | 'partial' | 'sparse';
}

/**
 * Detect topical clusters and find missing cross-links within each cluster.
 *
 * A cluster is defined as all pages sharing a common tag or category.
 */
export function detectCrossLinkOpportunities(
  pages: LinkPage[],
  existingLinkMap: Record<string, string[]>,
  clusterTag: string,
): CrossLinkOpportunity {
  const clusterPages = pages.filter(p => (p.tags ?? []).includes(clusterTag));
  const clusterUrls = clusterPages.map(p => p.url);

  if (clusterPages.length === 0) {
    return { cluster: clusterTag, pages: [], missingLinks: [], linkDensity: 0, completeness: 'sparse' };
  }

  const maxLinks = clusterUrls.length * (clusterUrls.length - 1);
  const missingLinks: Array<{ from: string; to: string; anchor: string }> = [];
  let existingCount = 0;

  for (const source of clusterPages) {
    const existing = new Set(existingLinkMap[source.url] ?? []);
    for (const target of clusterPages) {
      if (target.url === source.url) continue;
      if (existing.has(target.url)) {
        existingCount++;
      } else if (source.type !== target.type || clusterPages.length <= 3) {
        // Only suggest cross-links between different types, or for small clusters
        missingLinks.push({
          from: source.url,
          to: target.url,
          anchor: target.seoTitle,
        });
      }
    }
  }

  const linkDensity = maxLinks > 0 ? existingCount / maxLinks : 1;
  const completeness: CrossLinkOpportunity['completeness'] =
    linkDensity >= 0.7 ? 'complete' : linkDensity >= 0.3 ? 'partial' : 'sparse';

  return {
    cluster: clusterTag,
    pages: clusterUrls,
    missingLinks: missingLinks.slice(0, 30), // cap output
    linkDensity: Math.round(linkDensity * 100) / 100,
    completeness,
  };
}

// ── Unified link health report ────────────────────────────────────────────────

export interface LinkHealthReport {
  totalPages: number;
  totalLinks: number;
  weaklyLinkedPages: WeakLinkResult[];
  orphanCandidates: OrphanCandidate[];
  overLinkedAnchors: OverLinkedAnchor[];
  anchorDiversityScores: AnchorDiversityScore[];
  linkSuggestions: RelatedContentSuggestion[];
  summary: {
    weakPageCount: number;
    orphanCount: number;
    nearOrphanCount: number;
    overLinkedAnchorCount: number;
    avgAnchorDiversityScore: number;
    suggestionsCount: number;
    overallLinkHealth: 'strong' | 'moderate' | 'weak';
  };
}

/**
 * Build a full internal link health report.
 */
export function buildLinkHealthReport(
  pages: LinkPage[],
  linkMap: Record<string, string[]>,
  anchoredLinks: AnchoredLink[] = [],
): LinkHealthReport {
  const totalLinks = Object.values(linkMap).reduce((sum, targets) => sum + targets.length, 0);

  const weaklyLinkedPages = detectWeaklyLinkedPages(pages, linkMap);
  const orphanCandidates  = detectOrphanCandidates(pages, linkMap);
  const overLinkedAnchors = anchoredLinks.length > 0
    ? detectOverLinkedAnchors(anchoredLinks)
    : [];
  const anchorDiversityScores = anchoredLinks.length > 0
    ? scoreAnchorDiversity(anchoredLinks)
    : [];
  const linkSuggestions = suggestRelatedContent(pages, linkMap, { maxSuggestionsPerPage: 3 });

  const avgAnchorDiversityScore = anchorDiversityScores.length > 0
    ? Math.round(anchorDiversityScores.reduce((s, r) => s + r.score, 0) / anchorDiversityScores.length)
    : 100;

  const orphanCount     = orphanCandidates.filter(o => o.riskLevel === 'orphan').length;
  const nearOrphanCount = orphanCandidates.filter(o => o.riskLevel === 'near-orphan').length;

  const issues = weaklyLinkedPages.length + orphanCount + overLinkedAnchors.length;
  const overallLinkHealth: 'strong' | 'moderate' | 'weak' =
    issues === 0 ? 'strong' : issues <= 5 ? 'moderate' : 'weak';

  return {
    totalPages: pages.length,
    totalLinks,
    weaklyLinkedPages,
    orphanCandidates,
    overLinkedAnchors,
    anchorDiversityScores,
    linkSuggestions,
    summary: {
      weakPageCount: weaklyLinkedPages.length,
      orphanCount,
      nearOrphanCount,
      overLinkedAnchorCount: overLinkedAnchors.length,
      avgAnchorDiversityScore,
      suggestionsCount: linkSuggestions.length,
      overallLinkHealth,
    },
  };
}
