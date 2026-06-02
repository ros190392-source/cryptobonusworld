/**
 * CryptoBonusWorld — Exchange Screenshot Helpers
 * ──────────────────────────────────────────────────────────────────────────────
 * Query helpers for the centralised screenshot registry.
 * Use these functions in components — do NOT import SCREENSHOT_REGISTRY directly.
 *
 * Fallback chain for getExchangeScreenshot():
 *   1. exact geo + locale + device
 *   2. geo + device  (locale ignored)
 *   3. locale + device  (geo ignored)
 *   4. GLOBAL + en + desktop  (canonical default)
 *   5. any available entry for that category
 *   6. null  (no screenshot available)
 */

import {
  SCREENSHOT_REGISTRY_MAP,
  getExchangeEntries,
  type ExtendedScreenshotEntry,
  type ScreenshotCategory,
  type ScreenshotOptions,
  type ResolvedScreenshot,
  type ScreenshotLocale,
} from '../data/exchange-screenshots';

// ── Core resolution ───────────────────────────────────────────────────────────

/**
 * Resolve the best screenshot entry for an exchange/category combination
 * using the 6-step fallback chain.
 *
 * Returns null when no entry exists at all (category absent, or exchange unknown).
 * Returns null for 'not_applicable' entries regardless of options.
 */
export function getExchangeScreenshot(
  slug: string,
  category: ScreenshotCategory,
  options: ScreenshotOptions = {},
): ResolvedScreenshot | null {
  const all = getExchangeEntries(slug).filter(e => e.category === category);

  if (all.length === 0) return null;

  // Filter out not_applicable entries — callers should check hasAvailableScreenshot first
  const candidates = all.filter(e => e.status !== 'not_applicable');

  if (candidates.length === 0) return null;

  const { geo, locale, device } = options;
  const wantGeo    = geo    ?? 'GLOBAL';
  const wantLocale = locale ?? 'en';
  const wantDevice = device ?? 'desktop';

  // Helper to wrap a match
  const wrap = (
    e: ExtendedScreenshotEntry,
    source: ResolvedScreenshot['matchSource'],
  ): ResolvedScreenshot => ({ entry: e, matchSource: source });

  // 1. Exact match: geo + locale + device
  {
    const m = candidates.find(
      e => e.geo === wantGeo && e.locale === wantLocale && e.device === wantDevice,
    );
    if (m) return wrap(m, 'exact');
  }

  // 2. Geo + device (locale flexible)
  {
    const m = candidates.find(e => e.geo === wantGeo && e.device === wantDevice);
    if (m) return wrap(m, 'geo_device');
  }

  // 3. Locale + device (geo flexible)
  {
    const m = candidates.find(e => e.locale === wantLocale && e.device === wantDevice);
    if (m) return wrap(m, 'locale_device');
  }

  // 4. GLOBAL + en + desktop (canonical default)
  {
    const m = candidates.find(
      e => e.geo === 'GLOBAL' && e.locale === 'en' && e.device === 'desktop',
    );
    if (m) return wrap(m, 'global_default');
  }

  // 5. Any available entry (last resort)
  const available = candidates.filter(e => e.status === 'available');
  if (available.length > 0) return wrap(available[0], 'any_available');

  // 6. Return the first candidate regardless of status (callers check status themselves)
  return wrap(candidates[0], 'any_available');
}

/**
 * Return the latest screenshot entry (by capturedAt) for a category.
 * Returns null if no entry with a capturedAt date exists.
 */
export function getLatestScreenshot(
  slug: string,
  category: ScreenshotCategory,
): ExtendedScreenshotEntry | null {
  const entries = getExchangeEntries(slug)
    .filter(e => e.category === category && e.capturedAt !== null)
    .sort((a, b) => (b.capturedAt ?? '').localeCompare(a.capturedAt ?? ''));

  return entries[0] ?? null;
}

// ── Freshness ─────────────────────────────────────────────────────────────────

const STALE_DAYS = 90;

export type FreshnessStatus = 'fresh' | 'stale' | 'missing' | 'not_applicable';

/**
 * Determine the freshness status of a screenshot entry.
 */
export function getScreenshotFreshnessStatus(entry: ExtendedScreenshotEntry): FreshnessStatus {
  if (entry.status === 'not_applicable') return 'not_applicable';
  if (entry.status !== 'available' || !entry.capturedAt) return 'missing';

  const dateStr = entry.capturedAt.length === 7
    ? entry.capturedAt + '-01'
    : entry.capturedAt;
  const captured = new Date(dateStr);
  if (isNaN(captured.getTime())) return 'missing';

  const ageDays = (Date.now() - captured.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_DAYS ? 'stale' : 'fresh';
}

// ── Convenience predicates ────────────────────────────────────────────────────

/**
 * True when the exchange has at least one 'available' screenshot for the category.
 */
export function hasAvailableScreenshot(
  slug: string,
  category: ScreenshotCategory,
): boolean {
  return getExchangeEntries(slug).some(
    e => e.category === category && e.status === 'available',
  );
}

/**
 * Return all categories that are missing screenshots for an exchange
 * (i.e. not 'available' and not 'not_applicable').
 */
export function getMissingScreenshots(slug: string): ExtendedScreenshotEntry[] {
  return getExchangeEntries(slug).filter(
    e => e.status === 'missing' || e.status === 'needs_manual_capture',
  );
}

/**
 * Return all outdated screenshots for an exchange.
 * An entry is outdated if status=available and capturedAt > 90 days ago,
 * OR if status='outdated'.
 */
export function getExpiredScreenshots(slug: string): ExtendedScreenshotEntry[] {
  return getExchangeEntries(slug).filter(e => {
    if (e.status === 'outdated') return true;
    if (e.status !== 'available') return false;
    return getScreenshotFreshnessStatus(e) === 'stale';
  });
}

// ── Locale / Geo helpers ──────────────────────────────────────────────────────

/**
 * Return a screenshot resolved for a specific locale.
 */
export function getLocalizedExchangeScreenshot(
  slug: string,
  category: ScreenshotCategory,
  locale: ScreenshotLocale,
  device: 'desktop' | 'mobile' = 'desktop',
): ResolvedScreenshot | null {
  return getExchangeScreenshot(slug, category, { locale, device });
}

/**
 * Return a screenshot resolved for a specific geo region.
 */
export function getGeoExchangeScreenshot(
  slug: string,
  category: ScreenshotCategory,
  geo: string,
  device: 'desktop' | 'mobile' = 'desktop',
): ResolvedScreenshot | null {
  return getExchangeScreenshot(slug, category, { geo, device });
}

/**
 * Return the GLOBAL/en/desktop fallback screenshot, or null.
 * This is a guaranteed-safe call that never triggers geo/locale matching.
 */
export function getFallbackScreenshot(
  slug: string,
  category: ScreenshotCategory,
): ExtendedScreenshotEntry | null {
  const entries = getExchangeEntries(slug).filter(
    e => e.category === category
      && e.status !== 'not_applicable'
      && e.geo === 'GLOBAL'
      && e.locale === 'en'
      && e.device === 'desktop',
  );
  return entries[0] ?? null;
}

// ── Coverage helpers ──────────────────────────────────────────────────────────

/**
 * Calculate coverage percentage for an exchange.
 * Applicable = all entries that are not 'not_applicable'.
 * Available = entries with status 'available'.
 */
export function getExchangeCoverage(slug: string): {
  applicable: number;
  available: number;
  percentage: number;
} {
  const entries    = getExchangeEntries(slug);
  const applicable = entries.filter(e => e.status !== 'not_applicable').length;
  const available  = entries.filter(e => e.status === 'available').length;
  const percentage = applicable > 0 ? Math.round((available / applicable) * 100) : 0;
  return { applicable, available, percentage };
}

/**
 * Get the source URL to visit when capturing a screenshot.
 * Returns null if no URL is defined or the category is not_applicable.
 */
export function getCaptureUrl(
  slug: string,
  category: ScreenshotCategory,
): string | null {
  const entry = getFallbackScreenshot(slug, category);
  return entry?.sourceUrl ?? null;
}
