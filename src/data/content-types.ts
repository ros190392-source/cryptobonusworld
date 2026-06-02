/**
 * Content Type Architecture — CryptoBonusWorld SEO Expansion
 * ===========================================================
 *
 * Defines the data contracts and routing conventions for all future
 * content types beyond the current exchange/category/country pages.
 *
 * Content types covered:
 *  1. NewsArticle    — time-sensitive exchange news, promotions, market events
 *  2. ExchangeReview — long-form editorial review (separate from /exchanges/ listing page)
 *  3. Tutorial       — how-to guides with numbered steps
 *  4. Comparison     — extended multi-exchange comparison articles
 *  5. Explainer      — "What is X" market education content
 *
 * Design principles:
 *  - Architecture only — no content is generated here
 *  - Each type maps to a URL pattern and a page template
 *  - All types share a common ContentBase for editorial workflow
 *  - Structured data (schema.org) type is declared per content type
 *  - Each type has minimum content thresholds for CONTENT_RULES.md compliance
 *
 * Usage:
 *   import { CONTENT_TYPE_CONFIGS, type NewsArticle } from '../data/content-types';
 *
 * When ready to generate content:
 *   1. Create src/data/[type]/[slug].ts or add to a JSON array
 *   2. Create src/pages/[url-pattern]/[slug].astro using the type's template spec
 *   3. Import and validate using the type's schema
 */

// ── Shared base ───────────────────────────────────────────────────────────────

/**
 * Fields shared across all content types.
 * Every content item must have these fields.
 */
export interface ContentBase {
  slug: string;
  /** SEO page title (50–60 chars) */
  seoTitle: string;
  /** Meta description (140–155 chars) */
  metaDesc: string;
  /** H1 heading (different from seoTitle — can be longer) */
  heading: string;
  /** 1–2 sentence intro for AI search answer boxes */
  answerBox?: string;
  /** Author/contributor — links to editorial-team registry */
  author?: string;
  /** ISO date first published */
  publishedAt: string;
  /** ISO date last updated */
  updatedAt: string;
  /** Editorial status — integrates with ContentRecord lifecycle */
  status: 'draft' | 'review' | 'published' | 'archived';
  /** Content priority for crawl scheduling */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Tags for related content linking */
  tags?: string[];
  /** Exchange slugs this content is about */
  relatedExchanges?: string[];
  /** FAQ items rendered as FAQPage schema */
  faq?: { question: string; answer: string }[];
  /** Canonical URL — only set if this page has a canonical that differs from the default */
  canonicalOverride?: string;
}

// ── 1. News Article ───────────────────────────────────────────────────────────

/**
 * URL pattern: /news/[slug]/
 * Template: src/pages/news/[slug].astro  (not yet created)
 * Schema: schema.org/NewsArticle
 *
 * Use for:
 *  - Exchange promotion announcements ("Bybit raises bonus cap to 50,000 USDT")
 *  - Regulatory news affecting exchanges ("OKX obtains UAE license")
 *  - Promo code updates ("New MEXC code for May 2026")
 *  - Market events relevant to bonuses ("Bitcoin halving: which bonuses are best now")
 *
 * Minimum content thresholds (from CONTENT_RULES.md):
 *  - Word count: 200+ words
 *  - At least 1 exchange reference
 *  - Must have publishedAt within 90 days of current date to be indexed
 */
export interface NewsArticle extends ContentBase {
  contentType: 'news';
  /** News category — used for internal linking */
  newsCategory: 'promotion' | 'regulatory' | 'promo-code' | 'market' | 'platform-update';
  /** Brief summary for listing pages (1–2 sentences) */
  summary: string;
  /** Main article content in markdown */
  body: string;
  /** Optional: exchange this news is primarily about */
  primaryExchangeSlug?: string;
  /** Is this breaking/time-sensitive (affects crawl priority) */
  isBreaking?: boolean;
  /** Date after which this article is considered stale for display */
  expiresAt?: string;
}

// ── 2. Extended Exchange Review ───────────────────────────────────────────────

/**
 * URL pattern: /reviews/[exchange-slug]/
 * Template: src/pages/reviews/[slug].astro  (not yet created)
 * Schema: schema.org/Review
 *
 * Use for:
 *  - Long-form editorial reviews (1500–3000 words) of individual exchanges
 *  - More detailed than the /exchanges/[slug]/ listing page
 *  - Targets "[exchange name] review" queries
 *  - Complements rather than cannibalises the /exchanges/ page
 *
 * Minimum content thresholds:
 *  - Word count: 1000+ words
 *  - Must have editorRating (1–10 with one decimal place)
 *  - Must have at least 3 pros and 2 cons
 *  - Must have editorNote (80+ words, genuine editorial voice)
 *  - Must have at least 4 FAQ items
 *  - lastVerified must be within 60 days
 */
export interface ExchangeReview extends ContentBase {
  contentType: 'review';
  exchangeSlug: string;
  exchangeName: string;
  /** Editorial rating 1–10 (one decimal place) */
  editorRating: number;
  /** Verdict paragraph — 2–3 sentences summarising the review */
  verdict: string;
  /** Main body content sections */
  sections: ReviewSection[];
  pros: string[];
  cons: string[];
  /** Detailed editorial note (80+ words) */
  editorNote: string;
  /** ISO date content was last verified */
  lastVerified: string;
  /** External source URL for data verification */
  sourceUrl?: string;
  /** Whether this review is a featured "Editor's Choice" */
  editorChoice?: boolean;
}

export interface ReviewSection {
  heading: string;
  body: string;
  /** Optional sub-sections */
  subsections?: { heading: string; body: string }[];
}

// ── 3. Tutorial / How-To Guide ────────────────────────────────────────────────

/**
 * URL pattern: /learn/[slug]/  (or /guides/[slug]/ — existing pattern)
 * Template: src/pages/learn/[slug].astro  (not yet created)
 * Note: /guides/ already handles some tutorials — /learn/ would be for
 *       more procedural step-by-step how-to content.
 * Schema: schema.org/HowTo
 *
 * Use for:
 *  - "How to claim the Bybit bonus step by step"
 *  - "How to trade futures on MEXC for the first time"
 *  - "How to use a referral code on Binance"
 *  - "How to pass KYC on OKX in 5 minutes"
 *
 * Minimum content thresholds:
 *  - At least 3 steps (each step needs a name, description, image optional)
 *  - Word count: 400+ words
 *  - Must have a difficulty level
 *  - Estimated time to complete (for HowTo schema)
 */
export interface Tutorial extends ContentBase {
  contentType: 'tutorial';
  /** "Beginner" | "Intermediate" | "Advanced" */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Estimated minutes to complete the tutorial */
  estimatedMinutes: number;
  /** What the user will have at the end */
  outcome: string;
  /** Numbered tutorial steps */
  steps: TutorialStep[];
  /** Prerequisites the user needs before starting */
  prerequisites?: string[];
  /** Tools / accounts needed */
  tools?: string[];
  /** Key takeaway / summary paragraph */
  summary: string;
}

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Optional tip or warning for this step */
  tip?: string;
  warning?: string;
}

// ── 4. Comparison Article ─────────────────────────────────────────────────────

/**
 * URL pattern: /compare/[exchange-a]-vs-[exchange-b]/  (existing pattern)
 * OR extended: /articles/[exchange-a]-vs-[exchange-b]-[year]/
 * Template: existing compare/[pair].astro handles data-driven comparisons.
 *           This type is for longer editorial comparison articles (1000+ words)
 *           that go beyond the structured data table format.
 * Schema: schema.org/Article + ComparisonTable
 *
 * Use for:
 *  - Extended "Bybit vs Binance 2026: Which Is Better?" articles
 *  - "Best 5 exchanges for beginners compared"
 *  - Multi-exchange feature comparisons ("Futures trading: Bybit vs OKX vs MEXC")
 */
export interface ComparisonArticle extends ContentBase {
  contentType: 'comparison';
  /** Exchange slugs being compared (2+) */
  exchangeSlugs: string[];
  /** Verdict — which exchange "wins" and for whom */
  verdict: string;
  /** Editorial verdict for each exchange */
  verdictByExchange: Record<string, string>;
  /** Comparison criteria used */
  criteria: ComparisonCriterion[];
  /** Main body sections */
  sections: ReviewSection[];
  /** Bottom-line recommendation */
  recommendation: string;
}

export interface ComparisonCriterion {
  label: string;
  /** Winner exchange slug, or 'tie' */
  winner: string | 'tie';
  notes: string;
}

// ── 5. Market Explainer ───────────────────────────────────────────────────────

/**
 * URL pattern: /learn/what-is-[slug]/  or  /learn/[slug]/
 * Template: src/pages/learn/[slug].astro  (shared with Tutorial)
 * Schema: schema.org/Article
 *
 * Use for:
 *  - "What is a crypto welcome bonus?"
 *  - "What is KYC in crypto exchanges?"
 *  - "What is a futures trading bonus?"
 *  - "What is P2P trading?"
 *
 * Minimum content thresholds:
 *  - Word count: 500+ words
 *  - Must define the concept clearly in the first paragraph
 *  - Must have at least 3 FAQ items
 *  - Should link to ≥2 relevant exchange or category pages
 */
export interface Explainer extends ContentBase {
  contentType: 'explainer';
  /** The concept being explained */
  concept: string;
  /** One-sentence definition (for schema.org/DefinedTerm) */
  definition: string;
  /** Main body sections */
  sections: ReviewSection[];
  /** Key takeaways (bullet points) */
  keyTakeaways: string[];
  /** Related terms */
  relatedTerms?: { term: string; slug: string }[];
}

// ── Content type union ────────────────────────────────────────────────────────

export type AnyContent =
  | NewsArticle
  | ExchangeReview
  | Tutorial
  | ComparisonArticle
  | Explainer;

// ── Content type configuration ────────────────────────────────────────────────

export interface ContentTypeConfig {
  /** Internal type key */
  type: AnyContent['contentType'];
  /** Display name */
  label: string;
  /** URL prefix for this content type */
  urlPrefix: string;
  /** Astro page template path (relative to src/pages/) */
  templatePath: string;
  /** schema.org @type for structured data */
  schemaType: string;
  /** Minimum word count for content gate */
  minWordCount: number;
  /** Minimum FAQ count */
  minFaqCount: number;
  /** Maximum staleness in days before needs-review flag */
  maxStaleDays: number;
  /** Whether sitemap should include this type */
  includeInSitemap: boolean;
  /** Default sitemap priority */
  sitemapPriority: number;
  /** Whether these pages should be in main nav or discovery-only */
  discoveryOnly: boolean;
}

/**
 * Configuration registry for all content types.
 * Used by build tooling, sitemap generation, and quality checks.
 */
export const CONTENT_TYPE_CONFIGS: ContentTypeConfig[] = [
  {
    type: 'news',
    label: 'News Article',
    urlPrefix: '/news/',
    templatePath: 'news/[slug].astro',
    schemaType: 'NewsArticle',
    minWordCount: 200,
    minFaqCount: 0,
    maxStaleDays: 90,
    includeInSitemap: true,
    sitemapPriority: 0.6,
    discoveryOnly: false,
  },
  {
    type: 'review',
    label: 'Exchange Review',
    urlPrefix: '/reviews/',
    templatePath: 'reviews/[slug].astro',
    schemaType: 'Review',
    minWordCount: 1000,
    minFaqCount: 4,
    maxStaleDays: 60,
    includeInSitemap: true,
    sitemapPriority: 0.85,
    discoveryOnly: false,
  },
  {
    type: 'tutorial',
    label: 'Tutorial / How-To',
    urlPrefix: '/learn/',
    templatePath: 'learn/[slug].astro',
    schemaType: 'HowTo',
    minWordCount: 400,
    minFaqCount: 2,
    maxStaleDays: 90,
    includeInSitemap: true,
    sitemapPriority: 0.75,
    discoveryOnly: false,
  },
  {
    type: 'comparison',
    label: 'Comparison Article',
    urlPrefix: '/compare/',
    templatePath: 'compare/[pair].astro',
    schemaType: 'Article',
    minWordCount: 800,
    minFaqCount: 3,
    maxStaleDays: 60,
    includeInSitemap: true,
    sitemapPriority: 0.8,
    discoveryOnly: false,
  },
  {
    type: 'explainer',
    label: 'Market Explainer',
    urlPrefix: '/learn/',
    templatePath: 'learn/[slug].astro',
    schemaType: 'Article',
    minWordCount: 500,
    minFaqCount: 3,
    maxStaleDays: 120,
    includeInSitemap: true,
    sitemapPriority: 0.7,
    discoveryOnly: false,
  },
];

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Get the content type config for a given type key.
 */
export function getContentTypeConfig(type: AnyContent['contentType']): ContentTypeConfig | null {
  return CONTENT_TYPE_CONFIGS.find(c => c.type === type) ?? null;
}

/**
 * Build the canonical URL for any content item.
 */
export function buildContentUrl(content: ContentBase & { contentType: string }): string {
  const config = getContentTypeConfig(content.contentType as AnyContent['contentType']);
  if (!config) return `/${content.slug}/`;
  return `${config.urlPrefix}${content.slug}/`;
}

/**
 * Check if a content item meets minimum quality thresholds.
 * Returns true if content is gate-ready for publishing.
 */
export function meetsMinimumThresholds(
  content: AnyContent,
  wordCount: number,
  faqCount: number,
): { passes: boolean; failures: string[] } {
  const config = getContentTypeConfig(content.contentType);
  if (!config) return { passes: false, failures: ['Unknown content type'] };

  const failures: string[] = [];

  if (wordCount < config.minWordCount) {
    failures.push(`Word count ${wordCount} below minimum ${config.minWordCount} for ${config.label}`);
  }

  if (faqCount < config.minFaqCount) {
    failures.push(`FAQ count ${faqCount} below minimum ${config.minFaqCount} for ${config.label}`);
  }

  if (content.status !== 'published') {
    failures.push(`Status "${content.status}" is not published`);
  }

  return { passes: failures.length === 0, failures };
}
