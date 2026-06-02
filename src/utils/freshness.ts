/**
 * CryptoBonusWorld — Freshness Utilities
 * ──────────────────────────────────────────────────────────────────────────────
 * Human-readable freshness labels and structured freshness metadata for reviews,
 * bonuses, and screenshots.
 *
 * Public copy examples:
 *   "Updated June 2026"
 *   "Bonus verified 2 days ago"
 *   "Interface checked June 2026"
 *
 * Used in:
 *   - Exchange review pages          (getReviewFreshness)
 *   - Bonus detail pages             (getBonusFreshness)
 *   - Screenshot captions            (getInterfaceCheckedLabel)
 *   - FreshnessLabel.astro component
 *   - scripts/audit-freshness.mjs
 */

// ── Thresholds ────────────────────────────────────────────────────────────────

/** Exchange review is stale if not verified in this many days */
export const REVIEW_STALE_DAYS = 30;

/** Bonus conditions are stale if not checked in this many days */
export const BONUS_STALE_DAYS = 7;

/** Screenshot is stale if older than this many days */
export const SCREENSHOT_STALE_DAYS = 90;

// ── Internal date helpers ─────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM or YYYY-MM-DD date string into a Date.
 * Returns null on invalid input.
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Age in full days from a date string to now.
 * Returns Infinity for null/invalid dates.
 */
export function ageDays(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const d = parseDate(dateStr);
  if (!d) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Label formatters ──────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Short relative/absolute label for any date string.
 *
 * - < 1 day  → "Updated today"
 * - 1 day    → "Updated yesterday"
 * - < 7 days → "Updated N days ago"
 * - ≥ 7 days → "Updated June 2026"
 */
export function getFreshnessLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = ageDays(dateStr);
  if (!isFinite(days)) return '';
  if (days < 1) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  const d = parseDate(dateStr);
  if (!d) return '';
  return `Updated ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Bonus-specific freshness label.
 *
 * - < 1 day  → "Bonus verified today"
 * - 1 day    → "Bonus verified yesterday"
 * - < 7 days → "Bonus verified N days ago"
 * - ≥ 7 days → "Bonus verified June 2026"
 */
export function getBonusFreshnessLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = ageDays(dateStr);
  if (!isFinite(days)) return '';
  if (days < 1) return 'Bonus verified today';
  if (days === 1) return 'Bonus verified yesterday';
  if (days < 7) return `Bonus verified ${days} days ago`;
  const d = parseDate(dateStr);
  if (!d) return '';
  return `Bonus verified ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Screenshot/interface freshness label.
 *
 * - < 7 days → "Interface checked recently"
 * - ≥ 7 days → "Interface checked June 2026"
 */
export function getInterfaceCheckedLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const days = ageDays(dateStr);
  if (!isFinite(days)) return '';
  if (days < 7) return 'Interface checked recently';
  const d = parseDate(dateStr);
  if (!d) return '';
  return `Interface checked ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Structured freshness result ───────────────────────────────────────────────

export interface FreshnessResult {
  /** Human-readable generic label ("Updated June 2026") */
  label: string;
  /** Bonus-specific label ("Bonus verified 2 days ago") */
  bonusLabel: string;
  /** Interface-specific label ("Interface checked June 2026") */
  interfaceLabel: string;
  /** True when the content is past the relevant staleness threshold */
  isStale: boolean;
  /** Age in full days (Infinity when date is absent/invalid) */
  ageDays: number;
  /** Raw ISO date string, normalised to YYYY-MM-DD format for datetime attributes */
  dateIso: string;
}

function toDateIso(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.length === 7 ? `${dateStr}-01` : dateStr;
}

/**
 * Freshness metadata for an exchange review page.
 * Uses `lastVerified` → `updatedAt` fallback chain.
 * Stale threshold: REVIEW_STALE_DAYS (30 days).
 */
export function getReviewFreshness(ex: {
  lastVerified?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}): FreshnessResult {
  const dateStr = (ex.lastVerified ?? ex.updatedAt ?? '') as string;
  const days = ageDays(dateStr);
  return {
    label:          getFreshnessLabel(dateStr),
    bonusLabel:     '',
    interfaceLabel: '',
    isStale:        days > REVIEW_STALE_DAYS,
    ageDays:        days,
    dateIso:        toDateIso(dateStr),
  };
}

/**
 * Freshness metadata for the bonus/offer section of an exchange.
 * Uses `offerLastChecked` → `lastVerified` → `updatedAt` fallback chain.
 * Stale threshold: BONUS_STALE_DAYS (7 days).
 */
export function getBonusFreshness(ex: {
  offerLastChecked?: string | null;
  lastVerified?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}): FreshnessResult {
  const dateStr = (ex.offerLastChecked ?? ex.lastVerified ?? ex.updatedAt ?? '') as string;
  const days = ageDays(dateStr);
  return {
    label:          getFreshnessLabel(dateStr),
    bonusLabel:     getBonusFreshnessLabel(dateStr),
    interfaceLabel: '',
    isStale:        days > BONUS_STALE_DAYS,
    ageDays:        days,
    dateIso:        toDateIso(dateStr),
  };
}

/**
 * Freshness metadata for a screenshot entry.
 * Uses `capturedAt` directly (YYYY-MM format is acceptable).
 * Stale threshold: SCREENSHOT_STALE_DAYS (90 days).
 */
export function getScreenshotFreshness(capturedAt: string | null | undefined): FreshnessResult {
  const dateStr = capturedAt ?? '';
  const days = ageDays(dateStr);
  return {
    label:          getFreshnessLabel(dateStr),
    bonusLabel:     '',
    interfaceLabel: getInterfaceCheckedLabel(dateStr),
    isStale:        days > SCREENSHOT_STALE_DAYS,
    ageDays:        days,
    dateIso:        toDateIso(dateStr),
  };
}
