/**
 * CryptoBonusWorld — Data Management Layer
 *
 * Single source of truth for:
 *  1. Canonical Exchange TypeScript types (matches exchanges.json exactly)
 *  2. Schema validation — field presence, type checks, value constraints
 *  3. Data freshness — stale detection, age calculation, verification helpers
 *  4. Bonus expiration — window helpers, display copy
 *  5. Affiliate link management — URL resolution, GEO coverage, readiness
 *  6. Promo code management — active code lookup, validation
 *  7. Completeness scoring — weighted per-exchange quality score
 *  8. Audit report generation — full data quality report across all exchanges
 *  9. Source metadata — provenance tracking for future parser attribution
 * 10. Parser abstraction layer — safe, reviewable merge of machine-parsed data
 *
 * Usage:
 *  - Server-side only (Astro pages, build-time scripts)
 *  - Pure functions — no side effects, no external dependencies
 *  - Import individual exports as needed; never import the full module in client bundles
 *
 * Companion script: scripts/audit-exchanges.mjs
 */

// ── 1. Canonical Exchange type system ────────────────────────────────────────

export type ExchangeStatus = 'active' | 'inactive' | 'review' | 'paused';
export type CommissionType = 'cpa' | 'revshare' | 'hybrid' | 'unknown';
export type BonusType = 'signup' | 'deposit' | 'futures' | 'trading-rewards' | 'referral' | 'no-deposit';
export type FreshnessStatus = 'fresh' | 'warn' | 'stale' | 'invalid';
export type ErrorSeverity = 'error' | 'warn' | 'info';

export interface BonusTier {
  type: BonusType | string;
  title: string;
  amount: number;
  currency: string;
  condition: string;
  note?: string;
}

export interface BonusExpiry {
  days: number;
  note: string;
  /** Optional absolute expiry date (ISO) — set when a promo has a hard end date */
  endsAt?: string;
}

export interface MinAmount {
  amount: number;
  currency: string;
}

export interface TradingVolume {
  amount: number;
  currency: string;
  note?: string;
}

export interface AffiliateLinks {
  default: string;
  geo: Record<string, string>;
}

export interface PromoCode {
  code: string;
  region: string;
  description: string;
  /** Optional: ISO date after which code should be treated as expired */
  expiresAt?: string;
  /** Optional: URL that confirms the code is active */
  verifyUrl?: string;
}

// ── Source metadata (optional — enriched over time) ──────────────────────────

export type DataSourceType = 'official-promo' | 'terms-page' | 'api' | 'manual' | 'parser';

export interface DataSource {
  url: string;
  type: DataSourceType;
  /** ISO datetime of last fetch */
  fetchedAt: string;
  /** Parser identifier if type === 'parser' */
  parser?: string;
  notes?: string;
}

export interface ChangeRecord {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  /** ISO datetime */
  changedAt: string;
  /** Source identifier (parser name, editor name, 'auto') */
  source: string;
  verifiedBy: 'human' | 'parser' | 'auto';
}

// ── Full Exchange interface ───────────────────────────────────────────────────

export interface Exchange {
  // Identity
  name: string;
  slug: string;
  logo: string;
  rating: number;
  topChoice: boolean;

  // Bonus data
  bonusTitle: string;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTypes: (BonusType | string)[];
  bonusTiers: BonusTier[];
  bonusExpiry: BonusExpiry | null;

  // Access requirements
  kycRequired: boolean;
  depositRequired: boolean;
  futuresRequired: boolean;
  minDeposit: MinAmount;
  tradingVolumeRequired: TradingVolume;

  // Affiliate / monetisation
  affiliateUrl: string;
  affiliateLinks: AffiliateLinks;
  commissionType: CommissionType | string;
  promoCode: string;
  promoCodes: PromoCode[];

  // Content
  termsUrl: string;
  countries: string[];
  excludedCountries: string[];
  paymentMethods: string[];
  founded: number;
  users: string;
  headquarters: string;
  licences: string[];
  featureBadges: string[];
  pros: string[];
  cons: string[];
  requirements: string;
  riskNotes: string;
  shortDescription: string;
  bestFor: string[];
  longDescription: string;
  editorNote: string;

  // Metadata
  lastVerified: string;   // ISO date YYYY-MM-DD
  updatedAt: string;      // ISO date YYYY-MM-DD
  status: ExchangeStatus;

  // Optional: provenance (enriched progressively)
  sources?: DataSource[];
  changeLog?: ChangeRecord[];
}

// ── 2. Schema validation ──────────────────────────────────────────────────────

/** Every field in this list must be present and non-null in a valid exchange entry */
export const REQUIRED_FIELDS: (keyof Exchange)[] = [
  'name', 'slug', 'logo', 'rating', 'topChoice',
  'bonusTitle', 'bonusAmount', 'bonusCurrency', 'bonusTypes', 'bonusTiers',
  'kycRequired', 'depositRequired', 'futuresRequired',
  'minDeposit', 'tradingVolumeRequired',
  'affiliateUrl', 'affiliateLinks', 'commissionType',
  'promoCode', 'promoCodes',
  'termsUrl', 'countries', 'excludedCountries', 'paymentMethods',
  'founded', 'users', 'headquarters', 'licences', 'featureBadges',
  'pros', 'cons', 'requirements', 'riskNotes',
  'shortDescription', 'bestFor', 'longDescription', 'editorNote',
  'lastVerified', 'updatedAt', 'status',
];

/** Fields whose empty value ([], '', 0) warrants a warning but not an error */
export const SOFT_REQUIRED_FIELDS: (keyof Exchange)[] = [
  'editorNote', 'licences',
];

export interface FieldIssue {
  field: string;
  severity: ErrorSeverity;
  message: string;
}

export interface ValidationResult {
  slug: string;
  valid: boolean;    // true = no errors (warnings are OK)
  errors: FieldIssue[];
  warnings: FieldIssue[];
}

/** Validate a single exchange entry against the schema */
export function validateExchange(ex: unknown): ValidationResult {
  const errors: FieldIssue[] = [];
  const warnings: FieldIssue[] = [];
  const slug = (ex as Record<string, unknown>)?.slug as string ?? 'unknown';

  if (!ex || typeof ex !== 'object') {
    errors.push({ field: 'root', severity: 'error', message: 'Entry is not an object' });
    return { slug, valid: false, errors, warnings };
  }

  const e = ex as Record<string, unknown>;

  // ── Required field presence ──────────────────────────────────────────────
  for (const field of REQUIRED_FIELDS) {
    if (!(field in e) || e[field] === undefined || e[field] === null) {
      errors.push({ field, severity: 'error', message: `Required field missing: ${field}` });
    }
  }

  // ── Type checks ──────────────────────────────────────────────────────────
  if (typeof e.rating === 'number') {
    if (e.rating < 0 || e.rating > 10) {
      errors.push({ field: 'rating', severity: 'error', message: `Rating out of range: ${e.rating} (must be 0–10)` });
    }
  }

  if (typeof e.bonusAmount === 'number' && e.bonusAmount < 0) {
    errors.push({ field: 'bonusAmount', severity: 'error', message: 'bonusAmount must be >= 0' });
  }

  if (typeof e.founded === 'number' && (e.founded < 2009 || e.founded > new Date().getFullYear())) {
    warnings.push({ field: 'founded', severity: 'warn', message: `founded year ${e.founded} looks suspicious` });
  }

  // ── Date format validation ───────────────────────────────────────────────
  for (const dateField of ['lastVerified', 'updatedAt'] as const) {
    const val = e[dateField];
    if (typeof val === 'string' && val) {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) {
        errors.push({ field: dateField, severity: 'error', message: `Invalid date format: "${val}" (expected YYYY-MM-DD)` });
      }
    }
  }

  // ── Status validation ────────────────────────────────────────────────────
  const validStatuses: ExchangeStatus[] = ['active', 'inactive', 'review', 'paused'];
  if (typeof e.status === 'string' && !validStatuses.includes(e.status as ExchangeStatus)) {
    errors.push({ field: 'status', severity: 'error', message: `Unknown status value: "${e.status}"` });
  }

  // ── affiliateLinks structure ─────────────────────────────────────────────
  if (e.affiliateLinks && typeof e.affiliateLinks === 'object') {
    const al = e.affiliateLinks as Record<string, unknown>;
    if (!('default' in al)) {
      errors.push({ field: 'affiliateLinks.default', severity: 'error', message: 'affiliateLinks.default is missing' });
    }
    if (!('geo' in al) || typeof al.geo !== 'object') {
      errors.push({ field: 'affiliateLinks.geo', severity: 'error', message: 'affiliateLinks.geo is missing or not an object' });
    }
  }

  // ── Soft required: warn on empty ─────────────────────────────────────────
  for (const field of SOFT_REQUIRED_FIELDS) {
    const val = e[field];
    const isEmpty = val === '' || (Array.isArray(val) && val.length === 0);
    if (isEmpty) {
      warnings.push({ field, severity: 'warn', message: `${field} is empty — consider adding content` });
    }
  }

  // ── termsUrl must be a real URL ──────────────────────────────────────────
  if (typeof e.termsUrl === 'string' && e.termsUrl && !e.termsUrl.startsWith('http')) {
    errors.push({ field: 'termsUrl', severity: 'error', message: `termsUrl must start with http: "${e.termsUrl}"` });
  }

  // ── bonusTiers non-empty ─────────────────────────────────────────────────
  if (Array.isArray(e.bonusTiers) && e.bonusTiers.length === 0) {
    warnings.push({ field: 'bonusTiers', severity: 'warn', message: 'bonusTiers is empty — add at least one tier' });
  }

  return {
    slug,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Validate an array of raw exchange entries, return per-entry results */
export function validateExchangeList(data: unknown[]): ValidationResult[] {
  return data.map(validateExchange);
}

// ── 3. Data freshness ─────────────────────────────────────────────────────────

/** Days before a lastVerified date triggers a warning */
export const WARN_DAYS = 14;

/** Days before a lastVerified date is considered stale */
export const STALE_DAYS = 30;

/**
 * Return the number of days since `dateStr` (ISO date YYYY-MM-DD).
 * Returns -1 if the date is invalid.
 */
export function getDataAge(dateStr: string): number {
  const ms = Date.parse(dateStr);
  if (isNaN(ms)) return -1;
  const today = Date.now();
  return Math.floor((today - ms) / 86_400_000);
}

/** Classify the freshness of a lastVerified date */
export function getFreshnessStatus(dateStr: string): FreshnessStatus {
  const age = getDataAge(dateStr);
  if (age < 0) return 'invalid';
  if (age <= WARN_DAYS) return 'fresh';
  if (age <= STALE_DAYS) return 'warn';
  return 'stale';
}

/** Return all exchanges whose data is at warn or stale level */
export function getStaleExchanges(exchanges: Exchange[]): Exchange[] {
  return exchanges.filter(ex => {
    const s = getFreshnessStatus(ex.lastVerified);
    return s === 'warn' || s === 'stale';
  });
}

/**
 * Return a copy of the exchange with lastVerified updated to today (ISO date).
 * Use when a human editor has just confirmed the data is current.
 * Does NOT modify the original object — returns a new object.
 */
export function touchVerified(exchange: Exchange): Exchange {
  const today = new Date().toISOString().slice(0, 10);
  return { ...exchange, lastVerified: today, updatedAt: today };
}

/**
 * Return a copy of the exchange with updatedAt bumped to today,
 * and a ChangeRecord appended to changeLog.
 * Use when a field value changes.
 */
export function recordChange(
  exchange: Exchange,
  field: keyof Exchange,
  newValue: unknown,
  source: string,
  verifiedBy: ChangeRecord['verifiedBy'] = 'human',
): Exchange {
  const today = new Date().toISOString().slice(0, 10);
  const record: ChangeRecord = {
    field: field as string,
    oldValue: exchange[field],
    newValue,
    changedAt: today,
    source,
    verifiedBy,
  };
  return {
    ...exchange,
    [field]: newValue,
    updatedAt: today,
    changeLog: [...(exchange.changeLog ?? []), record],
  };
}

// ── 4. Bonus expiration helpers ───────────────────────────────────────────────

/**
 * Return the number of days in the bonus claim window, or null if not set.
 * This is the window AFTER signup — not a fixed calendar date.
 */
export function getBonusWindowDays(exchange: Exchange): number | null {
  return exchange.bonusExpiry?.days ?? null;
}

/**
 * Check if a bonus has a hard absolute expiry (`bonusExpiry.endsAt`) that
 * has already passed. Returns false if no hard end date is set.
 */
export function isBonusHardExpired(exchange: Exchange): boolean {
  const endsAt = exchange.bonusExpiry?.endsAt;
  if (!endsAt) return false;
  return Date.parse(endsAt) < Date.now();
}

/**
 * Return a human-readable note about the bonus claim window.
 * Returns null if no expiry data is available.
 * Never invents urgency — only reports real data.
 */
export function getBonusWindowNote(exchange: Exchange): string | null {
  if (!exchange.bonusExpiry?.days) return null;
  const days = exchange.bonusExpiry.days;
  if (days <= 7)  return `Complete bonus tasks within ${days} days of signup`;
  if (days <= 14) return `${days}-day window to complete bonus tasks after registration`;
  return `Bonus tasks valid for ${days} days from signup date`;
}

/**
 * Return a short urgency tag for bonus window display.
 * Only emits text for tight windows (≤ 14 days).
 */
export function getBonusWindowTag(exchange: Exchange): string | null {
  const days = getBonusWindowDays(exchange);
  if (!days) return null;
  if (days <= 7)  return `${days}d window`;
  if (days <= 14) return `${days}-day claim window`;
  return null;
}

// ── 5. Affiliate link management ──────────────────────────────────────────────

/** GEO codes that must have affiliate URLs for full market coverage */
export const TARGET_GEO_MARKETS = ['tr', 'in', 'id', 'ng', 'br', 'vn', 'ph'] as const;
export type GeoMarket = typeof TARGET_GEO_MARKETS[number];

/** Placeholder value indicating a URL has not been filled in yet */
const PLACEHOLDER_URL = '#';

/** Check if a URL string is a real, non-placeholder URL */
export function isRealUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.trim() !== '' && url !== PLACEHOLDER_URL && url.startsWith('http');
}

/**
 * Resolve the best available affiliate URL for a given GEO code.
 * Priority: geo-specific → default → '#'
 */
export function getEffectiveAffiliateUrl(exchange: Exchange, geoCode?: string): string {
  if (geoCode) {
    const geoUrl = exchange.affiliateLinks?.geo?.[geoCode];
    if (isRealUrl(geoUrl)) return geoUrl!;
  }
  const defaultUrl = exchange.affiliateLinks?.default;
  if (isRealUrl(defaultUrl)) return defaultUrl!;
  // Fall back to top-level affiliateUrl
  if (isRealUrl(exchange.affiliateUrl)) return exchange.affiliateUrl;
  return PLACEHOLDER_URL;
}

/** Returns true when at least one real (non-placeholder) affiliate URL is set */
export function hasLiveAffiliateUrl(exchange: Exchange): boolean {
  return isRealUrl(exchange.affiliateLinks?.default) || isRealUrl(exchange.affiliateUrl);
}

export interface GeoUrlCoverage {
  total: number;
  filled: number;
  missing: string[];
  pct: number;
}

/** Analyse which target GEO markets have real affiliate URLs */
export function getGeoUrlCoverage(exchange: Exchange): GeoUrlCoverage {
  const geo = exchange.affiliateLinks?.geo ?? {};
  const filled = TARGET_GEO_MARKETS.filter(code => isRealUrl(geo[code]));
  const missing = TARGET_GEO_MARKETS.filter(code => !isRealUrl(geo[code]));
  const total = TARGET_GEO_MARKETS.length;
  return {
    total,
    filled: filled.length,
    missing,
    pct: total > 0 ? Math.round((filled.length / total) * 100) : 0,
  };
}

/** Validate affiliate link setup and return issues */
export function validateAffiliateLinks(exchange: Exchange): FieldIssue[] {
  const issues: FieldIssue[] = [];

  if (!hasLiveAffiliateUrl(exchange)) {
    issues.push({
      field: 'affiliateLinks.default',
      severity: 'warn',
      message: 'No live affiliate URL set — revenue will be lost on clicks',
    });
  }

  const coverage = getGeoUrlCoverage(exchange);
  if (coverage.filled === 0) {
    issues.push({
      field: 'affiliateLinks.geo',
      severity: 'warn',
      message: `No GEO-specific URLs set (${coverage.total} markets unmapped)`,
    });
  } else if (coverage.missing.length > 0) {
    issues.push({
      field: 'affiliateLinks.geo',
      severity: 'info',
      message: `Missing GEO URLs for: ${coverage.missing.join(', ')}`,
    });
  }

  if (!exchange.commissionType || exchange.commissionType === 'unknown') {
    issues.push({
      field: 'commissionType',
      severity: 'info',
      message: 'Commission type not set — add for revenue tracking',
    });
  }

  return issues;
}

// ── 6. Promo code management ──────────────────────────────────────────────────

/** Return the first active promo code for a given region (or global fallback) */
export function getActivePromoCode(exchange: Exchange, region = 'global'): string | null {
  const codes = exchange.promoCodes ?? [];

  // Check for expired codes
  const today = Date.now();
  const active = codes.filter(c => {
    if (!c.expiresAt) return true;
    return Date.parse(c.expiresAt) > today;
  });

  // Prefer region-specific code
  const regional = active.find(c => c.region === region && c.code.trim());
  if (regional) return regional.code.trim();

  // Fall back to global
  const global = active.find(c => c.region === 'global' && c.code.trim());
  if (global) return global.code.trim();

  // Fall back to legacy single promoCode
  if (exchange.promoCode?.trim()) return exchange.promoCode.trim();

  return null;
}

/** Return all active promo codes (non-empty, non-expired) */
export function getActivePromoCodes(exchange: Exchange): PromoCode[] {
  const today = Date.now();
  return (exchange.promoCodes ?? []).filter(c => {
    if (!c.code.trim()) return false;
    if (c.expiresAt && Date.parse(c.expiresAt) <= today) return false;
    return true;
  });
}

/** Validate promo code entries and return issues */
export function validatePromoCodes(exchange: Exchange): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const codes = exchange.promoCodes ?? [];

  codes.forEach((c, i) => {
    if (c.expiresAt) {
      const ms = Date.parse(c.expiresAt);
      if (isNaN(ms)) {
        issues.push({
          field: `promoCodes[${i}].expiresAt`,
          severity: 'warn',
          message: `Invalid expiresAt date: "${c.expiresAt}"`,
        });
      } else if (ms <= Date.now()) {
        issues.push({
          field: `promoCodes[${i}]`,
          severity: 'warn',
          message: `Promo code "${c.code}" in region "${c.region}" has expired (${c.expiresAt})`,
        });
      }
    }
  });

  return issues;
}

// ── 7. Completeness scoring ───────────────────────────────────────────────────

/**
 * Weighted completeness criteria.
 * Sum of all weights = 100.
 * Fields not yet filled reduce the score proportionally.
 */
export const COMPLETENESS_WEIGHTS: Record<string, number> = {
  'affiliateUrl_live':     20,  // highest weight — direct revenue impact
  'geoUrls_any':           15,  // geo diversification
  'promoCode_any':         10,  // conversion booster
  'editorNote':             8,  // editorial quality signal
  'licences':               7,  // trust signal
  'termsUrl':               8,  // legal & SEO hygiene
  'longDescription':        8,  // content completeness
  'riskNotes':              7,  // compliance completeness
  'bonusExpiry':            7,  // data accuracy
  'sources_any':           10,  // provenance tracking
};

export interface CompletenessReport {
  score: number;    // weighted sum of filled criteria
  max: number;      // 100
  pct: number;      // 0–100
  /** Human-readable list of what's still missing */
  missing: string[];
}

export function getCompletenessScore(exchange: Exchange): CompletenessReport {
  let score = 0;
  const missing: string[] = [];

  const criteria: Record<string, () => boolean> = {
    affiliateUrl_live:  () => hasLiveAffiliateUrl(exchange),
    geoUrls_any:        () => getGeoUrlCoverage(exchange).filled > 0,
    promoCode_any:      () => getActivePromoCodes(exchange).length > 0,
    editorNote:         () => Boolean(exchange.editorNote?.trim()),
    licences:           () => (exchange.licences?.length ?? 0) > 0,
    termsUrl:           () => isRealUrl(exchange.termsUrl),
    longDescription:    () => Boolean(exchange.longDescription?.trim()),
    riskNotes:          () => Boolean(exchange.riskNotes?.trim()),
    bonusExpiry:        () => Boolean(exchange.bonusExpiry?.days),
    sources_any:        () => (exchange.sources?.length ?? 0) > 0,
  };

  for (const [key, check] of Object.entries(criteria)) {
    const weight = COMPLETENESS_WEIGHTS[key] ?? 0;
    if (check()) {
      score += weight;
    } else {
      missing.push(key.replace(/_/g, ' ').replace(' any', ''));
    }
  }

  return { score, max: 100, pct: score, missing };
}

// ── 8. Audit report ───────────────────────────────────────────────────────────

export interface ExchangeAuditResult {
  slug: string;
  name: string;
  status: ExchangeStatus;
  freshness: FreshnessStatus;
  dataAgeDays: number;
  completeness: CompletenessReport;
  validation: ValidationResult;
  affiliateIssues: FieldIssue[];
  promoIssues: FieldIssue[];
  /** True if any error-level validation issues exist */
  hasCriticalIssues: boolean;
}

export interface AuditSummary {
  totalExchanges: number;
  withCriticalIssues: number;
  staleExchanges: number;
  warnExchanges: number;
  withLiveAffiliateUrl: number;
  withAnyGeoUrl: number;
  withActivePromoCode: number;
  avgCompleteness: number;
}

export interface DataAuditReport {
  generatedAt: string;
  schemaVersion: string;
  summary: AuditSummary;
  results: ExchangeAuditResult[];
}

export const SCHEMA_VERSION = '1.0';

/** Audit a single exchange and return a structured result */
export function auditExchange(exchange: Exchange): ExchangeAuditResult {
  const validation = validateExchange(exchange);
  const affiliateIssues = validateAffiliateLinks(exchange);
  const promoIssues = validatePromoCodes(exchange);
  const completeness = getCompletenessScore(exchange);
  const freshness = getFreshnessStatus(exchange.lastVerified);
  const dataAgeDays = getDataAge(exchange.lastVerified);

  return {
    slug: exchange.slug,
    name: exchange.name,
    status: exchange.status,
    freshness,
    dataAgeDays,
    completeness,
    validation,
    affiliateIssues,
    promoIssues,
    hasCriticalIssues: validation.errors.length > 0,
  };
}

/** Generate a full audit report across all exchanges */
export function generateAuditReport(exchanges: Exchange[]): DataAuditReport {
  const results = exchanges.map(auditExchange);

  const summary: AuditSummary = {
    totalExchanges: exchanges.length,
    withCriticalIssues: results.filter(r => r.hasCriticalIssues).length,
    staleExchanges: results.filter(r => r.freshness === 'stale').length,
    warnExchanges: results.filter(r => r.freshness === 'warn').length,
    withLiveAffiliateUrl: exchanges.filter(hasLiveAffiliateUrl).length,
    withAnyGeoUrl: exchanges.filter(ex => getGeoUrlCoverage(ex).filled > 0).length,
    withActivePromoCode: exchanges.filter(ex => getActivePromoCodes(ex).length > 0).length,
    avgCompleteness: Math.round(
      results.reduce((sum, r) => sum + r.completeness.pct, 0) / (results.length || 1)
    ),
  };

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    summary,
    results,
  };
}

// ── 9. Source metadata helpers ────────────────────────────────────────────────

/** Create a new DataSource entry (to be pushed into exchange.sources) */
export function createDataSource(
  url: string,
  type: DataSourceType,
  options: { parser?: string; notes?: string } = {},
): DataSource {
  return {
    url,
    type,
    fetchedAt: new Date().toISOString(),
    ...(options.parser ? { parser: options.parser } : {}),
    ...(options.notes  ? { notes:  options.notes  } : {}),
  };
}

/** Add a DataSource to an exchange, returning a new exchange object */
export function addSource(exchange: Exchange, source: DataSource): Exchange {
  return {
    ...exchange,
    sources: [...(exchange.sources ?? []), source],
  };
}

/** Return the most recent source entry, if any */
export function getLatestSource(exchange: Exchange): DataSource | null {
  const sources = exchange.sources;
  if (!sources || sources.length === 0) return null;
  return [...sources].sort((a, b) =>
    Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt)
  )[0];
}

// ── 10. Parser abstraction layer ──────────────────────────────────────────────
//
// Safe, reviewable merge of machine-parsed data into exchange records.
// Design principles:
//  - Parsers PROPOSE changes; they never auto-apply to sensitive fields.
//  - Each proposed value carries a confidence score (0–1).
//  - Only SAFE_AUTO_APPLY_FIELDS can be applied automatically, and only at
//    confidence >= AUTO_APPLY_CONFIDENCE_THRESHOLD.
//  - Everything else requires human review.
//  - All applied changes are logged in changeLog.

export interface ParsedField {
  field: string;
  value: unknown;
  /** Confidence score 0–1. 1.0 = exact match from official source. */
  confidence: number;
  sourceUrl: string;
  extractedAt: string;
}

export interface ParserResult {
  exchangeSlug: string;
  parserName: string;
  parsedAt: string;
  sourceUrl: string;
  fields: ParsedField[];
  /** Raw page data for debugging — not persisted */
  rawData?: Record<string, unknown>;
}

export interface DataDiff {
  field: string;
  current: unknown;
  proposed: unknown;
  confidence: number;
  sourceUrl: string;
  /** True if this diff will be applied automatically */
  autoApply: boolean;
  /** Human-readable reason why autoApply is true or false */
  reason: string;
}

/** Fields safe to auto-apply from high-confidence parser results */
export const SAFE_AUTO_APPLY_FIELDS: (keyof Exchange)[] = [
  'bonusAmount',
  'bonusCurrency',
  'bonusExpiry',
  'minDeposit',
  'tradingVolumeRequired',
  'termsUrl',
  'status',
];

/** Confidence threshold above which a SAFE field can be auto-applied */
export const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Compare a parser result against the current exchange record.
 * Returns a DataDiff for each field the parser found.
 */
export function diffParserResult(existing: Exchange, parsed: ParserResult): DataDiff[] {
  return parsed.fields.map(pf => {
    const field = pf.field as keyof Exchange;
    const current = existing[field];
    const proposed = pf.value;

    const isSafeField = (SAFE_AUTO_APPLY_FIELDS as string[]).includes(pf.field);
    const isHighConfidence = pf.confidence >= AUTO_APPLY_CONFIDENCE_THRESHOLD;
    const hasChanged = JSON.stringify(current) !== JSON.stringify(proposed);

    const autoApply = isSafeField && isHighConfidence && hasChanged;
    let reason: string;

    if (!hasChanged) {
      reason = 'No change detected — current value matches parsed value';
    } else if (!isSafeField) {
      reason = `"${pf.field}" requires human review (not in SAFE_AUTO_APPLY_FIELDS)`;
    } else if (!isHighConfidence) {
      reason = `Confidence ${pf.confidence.toFixed(2)} below threshold ${AUTO_APPLY_CONFIDENCE_THRESHOLD} — human review required`;
    } else {
      reason = `Auto-apply: safe field + confidence ${pf.confidence.toFixed(2)} >= ${AUTO_APPLY_CONFIDENCE_THRESHOLD}`;
    }

    return { field: pf.field, current, proposed, confidence: pf.confidence, sourceUrl: pf.sourceUrl, autoApply, reason };
  });
}

export interface ApplyParserResultOutput {
  /** The updated exchange (or original if dryRun) */
  updated: Exchange;
  /** Diffs that were automatically applied */
  applied: DataDiff[];
  /** Diffs that require human review */
  pending: DataDiff[];
  /** ChangeRecords for all applied diffs */
  changes: ChangeRecord[];
}

/**
 * Apply a parser result to an exchange record.
 * - Auto-applies safe, high-confidence fields.
 * - Returns pending diffs that require human review.
 * - When dryRun: returns what WOULD be applied without modifying the record.
 */
export function applyParserResult(
  existing: Exchange,
  parsed: ParserResult,
  options: { dryRun?: boolean } = {},
): ApplyParserResultOutput {
  const diffs = diffParserResult(existing, parsed);
  const applied = diffs.filter(d => d.autoApply);
  const pending = diffs.filter(d => !d.autoApply && JSON.stringify(d.current) !== JSON.stringify(d.proposed));

  if (options.dryRun) {
    return { updated: existing, applied, pending, changes: [] };
  }

  const changes: ChangeRecord[] = [];
  let updated = { ...existing };

  for (const diff of applied) {
    const change: ChangeRecord = {
      field: diff.field,
      oldValue: diff.current,
      newValue: diff.proposed,
      changedAt: parsed.parsedAt,
      source: `${parsed.parserName}:${diff.sourceUrl}`,
      verifiedBy: 'parser',
    };
    updated = { ...updated, [diff.field]: diff.proposed };
    changes.push(change);
  }

  if (changes.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    updated = {
      ...updated,
      updatedAt: today,
      changeLog: [...(updated.changeLog ?? []), ...changes],
    };
  }

  return { updated, applied, pending, changes };
}
