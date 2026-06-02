/**
 * SEO Issue Schema — CryptoBonusWorld
 * =====================================
 *
 * Canonical structure for all SEO, indexing, schema, analytics and crawl
 * issues ingested from external tools (GSC, Yandex Webmaster, Bing, GA4, etc.)
 * and from manual editorial observation.
 *
 * Files in data/seo-issues/{source}/ must conform to this schema.
 * The intake script (scripts/seo-issue-intake.mjs) reads, classifies, and
 * de-duplicates them into reports/seo-issue-queue.md + reports/seo-issue-queue.json.
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

export type IssueSeverity =
  | 'critical'   // blocks indexing, revenue, or legal compliance
  | 'high'       // affects rankings, conversions, or trust signals
  | 'medium'     // affects UX, analytics accuracy, or E-E-A-T
  | 'low';       // cosmetic, minor, or advisory

export type IssueStatus =
  | 'new'                // just ingested, not yet triaged
  | 'classified'         // triaged and assigned to a component/file
  | 'fixed'              // code change applied, pending re-validation
  | 'deployed'           // fix confirmed live on production
  | 'ignored'            // acknowledged but deliberately not fixed
  | 'needs_manual_review'; // auto-fix would be unsafe; requires human decision

export type IssueSource =
  | 'google-search-console'
  | 'yandex-webmaster'
  | 'bing-webmaster'
  | 'yandex-metrika'
  | 'ga4'
  | 'clarity'
  | 'manual';

// ── Issue type classifiers ────────────────────────────────────────────────────

/** Google Search Console issue types */
export type GscIssueType =
  // Structured data
  | 'schema:invalid-currency'         // priceCurrency not ISO 4217
  | 'schema:invalid-brand-type'       // brand @type must be "Brand"
  | 'schema:missing-required-field'   // required schema.org field absent
  | 'schema:invalid-field-value'      // field value fails schema.org validation
  | 'schema:merchant-listing'         // MerchantListing specific error
  // Indexing
  | 'indexing:discovered-not-indexed'
  | 'indexing:crawled-not-indexed'
  | 'indexing:404'
  | 'indexing:redirect-error'
  | 'indexing:canonical-mismatch'
  | 'indexing:noindex-tag'
  | 'indexing:blocked-robots'
  // Page experience
  | 'core-web-vitals:lcp'
  | 'core-web-vitals:cls'
  | 'core-web-vitals:inp'
  | 'mobile-usability:viewport'
  | 'mobile-usability:text-size'
  | 'mobile-usability:tap-targets';

/** Yandex Webmaster issue types */
export type YandexIssueType =
  | 'sitemap:error'
  | 'sitemap:url-not-found'
  | 'robots:error'
  | 'content:duplicate-title'
  | 'content:duplicate-description'
  | 'indexing:excluded'
  | 'indexing:low-quality'
  | 'page-quality:thin-content'
  | 'page-quality:low-text-ratio';

/** Bing Webmaster issue types */
export type BingIssueType =
  | 'crawl:error'
  | 'crawl:blocked'
  | 'sitemap:error'
  | 'indexnow:failure'
  | 'seo:missing-meta'
  | 'seo:duplicate-title'
  | 'seo:missing-h1';

/** Yandex Metrika issue types */
export type MetrikaIssueType =
  | 'tracking:no-data'
  | 'tracking:goal-not-firing'
  | 'ux:high-bounce'
  | 'ux:low-scroll-depth'
  | 'conversion:broken-affiliate-click';

/** GA4 issue types */
export type GA4IssueType =
  | 'tracking:tag-not-detected'
  | 'tracking:no-realtime-users'
  | 'tracking:event-mismatch'
  | 'tracking:missing-outbound-events';

/** Clarity issue types */
export type ClarityIssueType =
  | 'ux:rage-clicks'
  | 'ux:dead-clicks'
  | 'ux:scroll-drop'
  | 'ux:ui-confusion';

/** Manual / cross-tool issue types */
export type ManualIssueType =
  | 'content:stale-data'
  | 'content:broken-affiliate-url'
  | 'content:missing-screenshot'
  | 'seo:missing-og-image'
  | 'seo:missing-meta-description'
  | 'technical:broken-internal-link'
  | 'technical:missing-canonical'
  | 'technical:slow-page';

export type IssueType =
  | GscIssueType
  | YandexIssueType
  | BingIssueType
  | MetrikaIssueType
  | GA4IssueType
  | ClarityIssueType
  | ManualIssueType
  | string; // fallback for unknown types

// ── Auto-fix policy ───────────────────────────────────────────────────────────

/**
 * Whether this issue type is eligible for automated code-level fixing.
 *
 * SAFE_TO_AUTOFIX = LOW-RISK only:
 *   - schema formatting bugs (wrong @type, invalid currency code)
 *   - missing/wrong meta tags
 *   - broken internal image paths when target is obvious
 *   - stale sitemap references
 *
 * NEVER auto-fix (requires_manual_review = true):
 *   - factual exchange data (fees, KYC, bonus values)
 *   - affiliate URLs
 *   - legal / disclaimer text
 *   - geo restriction data
 *   - anything in evidence JSON files
 */
export type AutoFixPolicy =
  | 'safe'           // can apply automatically with confidence
  | 'requires-review' // fix pattern known but human must approve
  | 'manual-only';   // no automated fix path exists

// ── Core issue interface ──────────────────────────────────────────────────────

export interface SeoIssue {
  /** Unique identifier — typically source:type:slug or source:type:hash */
  id: string;

  /** Tool/platform that detected this issue */
  source: IssueSource;

  /** Classified issue type */
  issueType: IssueType;

  /** Impact severity */
  severity: IssueSeverity;

  /** Pages affected — relative paths (e.g. /exchanges/bybit/) */
  affectedUrls: string[];

  /** ISO date string when this issue was first detected */
  detectedAt: string;

  /** Raw message from the tool (copy-paste from GSC/Yandex/etc.) */
  rawMessage: string;

  /** Screenshot of the error in the tool (relative to public/) — optional */
  screenshotPath?: string | null;

  /** Current triage status */
  status: IssueStatus;

  /** Human-readable recommended fix description */
  recommendedFix: string;

  /** Auto-fix eligibility */
  autoFixPolicy: AutoFixPolicy;

  /** Source files most likely responsible for this issue */
  relatedFiles: string[];

  /** Steps to verify the fix was applied correctly */
  validationSteps: string[];

  /** Free-form notes, context, links to GSC report, etc. */
  notes?: string;

  /** If fixed: ISO date the fix was applied */
  fixedAt?: string;

  /** If fixed: description of what was changed */
  fixDescription?: string;
}

// ── Issue file format ─────────────────────────────────────────────────────────

/**
 * Each file in data/seo-issues/{source}/ should be a JSON file containing
 * either a single SeoIssue object or an array of SeoIssue objects.
 *
 * File naming convention:
 *   {YYYY-MM-DD}-{brief-slug}.json
 *   e.g. 2026-06-01-product-schema-currency.json
 *
 * Markdown files (.md) are also supported for manually pasted issues —
 * the intake script will parse them as raw text and classify automatically.
 */
export type SeoIssueFile = SeoIssue | SeoIssue[];
