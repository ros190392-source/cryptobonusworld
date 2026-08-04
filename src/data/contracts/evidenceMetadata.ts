/**
 * Canonical machine-readable evidence metadata contract (Split 3, Issue #250).
 *
 * ONE factual freshness source. A human display string such as `June 2026`,
 * `May 2026`, or `Recheck in progress` is presentation/editorial only and can
 * NEVER authorize freshness, publication, a MarketProfile, or a commercial CTA.
 * Only an exact, timezone-qualified ISO-8601 timestamp pair backed by an HTTPS
 * source may drive a time-sensitive decision — and only through this contract.
 *
 * Design invariants:
 *   - `evidenceCheckedAt` / `nextReviewAt` MUST be exact ISO-8601 datetimes with
 *     an explicit timezone (`Z` or a numeric `±HH:MM` offset). Date-only and
 *     timezone-less strings are REJECTED — they are ambiguous and must never be
 *     silently coerced to midnight-UTC (that would fabricate precision).
 *   - `sourceUrl` MUST be HTTPS.
 *   - `nextReviewAt` MUST be strictly later than `evidenceCheckedAt`.
 *   - Freshness reuses the ONE central policy (EVIDENCE_FRESHNESS_POLICY) via
 *     assessEvidenceFreshness — no duplicated thresholds here.
 *   - A live/authorizing decision additionally requires a finite explicit clock
 *     and `now < nextReviewAt` (review not overdue), independent of evidence age.
 *   - Visible dates are DERIVED from the machine timestamp; locale changes only
 *     the formatting, never the timestamp, freshness state, or any decision.
 */
import type { CtaLocale } from './portalCta';
import {
  EVIDENCE_FRESHNESS_POLICY,
  assessEvidenceFreshness,
  type FreshnessState,
} from './portalFactory';

export interface EvidenceMetadata {
  /** Exact ISO-8601 datetime with explicit timezone (`Z` or `±HH:MM`). */
  evidenceCheckedAt: string;
  /** Exact ISO-8601 datetime with explicit timezone; strictly after checkedAt. */
  nextReviewAt: string;
  /** HTTPS evidence source URL. */
  sourceUrl: string;
  /** Optional stable evidence/source reference when the repo already has one. */
  sourceId?: string;
  /** Optional exchange identity this evidence supports (canonical slug). */
  exchangeId?: string;
}

export interface EvidenceValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface EvidenceValidationResult {
  ok: boolean;
  value?: EvidenceMetadata;
  issues: EvidenceValidationIssue[];
}

/**
 * Exact ISO-8601 datetime with an explicit timezone designator.
 *
 * Accepts:  2026-07-31T00:00:00Z · 2026-07-31T09:30:00+05:00 · with optional
 *           fractional seconds (…:00.123Z).
 * Rejects:  date-only (2026-07-31), timezone-less datetime (2026-07-31T00:00:00),
 *           space-separated, and anything else. Parseability is also required so
 *           the value maps deterministically to a single UTC epoch.
 */
const EXACT_ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

export function isExactIsoDateTime(value: unknown): value is string {
  return typeof value === 'string'
    && EXACT_ISO_DATETIME.test(value)
    && Number.isFinite(Date.parse(value));
}

const HTTPS_URL = /^https:\/\/[^\s]+$/i;

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !HTTPS_URL.test(value.trim())) return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate an evidence metadata record fail-closed. A `status: verified` flag on
 * a parent record can NEVER substitute for this — missing/ambiguous evidence is
 * rejected here regardless of any surrounding claim.
 */
export function validateEvidenceMetadata(input: unknown): EvidenceValidationResult {
  const issues: EvidenceValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Evidence metadata must be an object.' }] };
  }
  const rec = input as Record<string, unknown>;

  if (!('evidenceCheckedAt' in rec) || rec.evidenceCheckedAt === undefined || rec.evidenceCheckedAt === null) {
    issues.push({ field: 'evidenceCheckedAt', code: 'MISSING', message: 'evidenceCheckedAt is required.' });
  } else if (!isExactIsoDateTime(rec.evidenceCheckedAt)) {
    issues.push({ field: 'evidenceCheckedAt', code: 'INEXACT_TIMESTAMP', message: 'evidenceCheckedAt must be an exact ISO-8601 datetime with an explicit timezone (date-only / timezone-less rejected).' });
  }

  if (!('nextReviewAt' in rec) || rec.nextReviewAt === undefined || rec.nextReviewAt === null) {
    issues.push({ field: 'nextReviewAt', code: 'MISSING', message: 'nextReviewAt is required.' });
  } else if (!isExactIsoDateTime(rec.nextReviewAt)) {
    issues.push({ field: 'nextReviewAt', code: 'INEXACT_TIMESTAMP', message: 'nextReviewAt must be an exact ISO-8601 datetime with an explicit timezone (date-only / timezone-less rejected).' });
  }

  if (!isHttpsUrl(rec.sourceUrl)) {
    issues.push({ field: 'sourceUrl', code: 'INVALID_SOURCE_URL', message: 'sourceUrl must be a valid HTTPS URL.' });
  }

  // Review window: nextReviewAt strictly after evidenceCheckedAt (only when both
  // are exact, so we compare real epochs, not fabricated ones).
  if (isExactIsoDateTime(rec.evidenceCheckedAt) && isExactIsoDateTime(rec.nextReviewAt)
    && Date.parse(rec.nextReviewAt) <= Date.parse(rec.evidenceCheckedAt)) {
    issues.push({ field: 'nextReviewAt', code: 'INVALID_REVIEW_WINDOW', message: 'nextReviewAt must be strictly later than evidenceCheckedAt.' });
  }

  if (rec.sourceId !== undefined && (typeof rec.sourceId !== 'string' || !rec.sourceId.trim())) {
    issues.push({ field: 'sourceId', code: 'INVALID_ID', message: 'sourceId, when present, must be a non-empty string.' });
  }
  if (rec.exchangeId !== undefined && (typeof rec.exchangeId !== 'string' || !rec.exchangeId.trim())) {
    issues.push({ field: 'exchangeId', code: 'INVALID_ID', message: 'exchangeId, when present, must be a non-empty string.' });
  }

  return issues.length
    ? { ok: false, issues }
    : { ok: true, value: input as EvidenceMetadata, issues };
}

export type EvidenceReviewState = 'ok' | 'overdue' | 'invalid';

export interface EvidenceAuthorization {
  /** True only when the metadata is valid, evidence is fresh, and review is not overdue. */
  authoritative: boolean;
  /** Central-policy freshness state of evidenceCheckedAt. `invalid` when unusable. */
  freshness: FreshnessState;
  /** Review-deadline state relative to `now`. */
  reviewState: EvidenceReviewState;
  /** Machine-readable reason when not authoritative; null when authoritative. */
  reason: string | null;
}

/**
 * Deterministically decide whether evidence metadata may authorize a
 * time-sensitive action against an explicit clock. Fail-closed at every step;
 * the central freshness policy is reused (never re-implemented) for evidence age.
 */
export function assessEvidenceAuthorization(
  input: unknown,
  nowMs: number,
  policy = EVIDENCE_FRESHNESS_POLICY,
): EvidenceAuthorization {
  // A non-finite clock can never prove anything.
  if (!Number.isFinite(nowMs)) {
    return { authoritative: false, freshness: 'invalid', reviewState: 'invalid', reason: 'INVALID_CLOCK' };
  }
  const validation = validateEvidenceMetadata(input);
  if (!validation.ok || !validation.value) {
    return { authoritative: false, freshness: 'invalid', reviewState: 'invalid', reason: 'EVIDENCE_METADATA_INVALID' };
  }
  const meta = validation.value;

  // Evidence age via the ONE central policy.
  const freshness = assessEvidenceFreshness(meta.evidenceCheckedAt, nowMs, policy);
  if (freshness.state !== 'fresh') {
    const reason = freshness.state === 'future' ? 'FUTURE_EVIDENCE'
      : freshness.state === 'stale' ? 'STALE_EVIDENCE'
      : 'EVIDENCE_METADATA_INVALID';
    return { authoritative: false, freshness: freshness.state, reviewState: 'ok', reason };
  }

  // Review deadline: independent of evidence age. now >= nextReviewAt → overdue.
  const nextReview = Date.parse(meta.nextReviewAt);
  if (!Number.isFinite(nextReview) || nowMs >= nextReview) {
    return { authoritative: false, freshness: 'fresh', reviewState: 'overdue', reason: 'REVIEW_OVERDUE' };
  }

  return { authoritative: true, freshness: 'fresh', reviewState: 'ok', reason: null };
}

/** Map a CtaLocale to a BCP-47 tag for Intl formatting (formatting only). */
const LOCALE_TAG: Record<CtaLocale, string> = { en: 'en-GB', ru: 'ru-RU', kk: 'kk-KZ' };

/**
 * Format an exact machine timestamp as a localized human date. Purely
 * presentational: the locale changes ONLY the rendered characters — never the
 * underlying instant, freshness, or any decision. Returns null for non-exact
 * input (never fabricates a date).
 */
export function formatEvidenceCheckedAt(value: unknown, locale: CtaLocale = 'en'): string | null {
  if (!isExactIsoDateTime(value)) return null;
  const dt = new Date(Date.parse(value));
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(dt);
  } catch {
    // Deterministic fallback if the runtime lacks the locale data.
    return dt.toISOString().slice(0, 10);
  }
}

export type CheckedDisplayState = 'current' | 'stale' | 'overdue' | 'none';

export interface CheckedDisplay {
  /** Raw exact ISO instant for semantic `<time datetime>` markup; null when none. */
  iso: string | null;
  /** Localized human display of the checked date; null when no machine evidence. */
  display: string | null;
  /** Freshness/visibility state so the UI can mark non-current evidence. */
  state: CheckedDisplayState;
}

/**
 * Derive the visible "last checked" presentation from machine evidence ONLY.
 *
 * With no valid metadata (e.g. a record still under re-verification) this
 * returns a clear `none` state and no fabricated date — the caller shows an
 * honest under-review label instead. When metadata exists, the display is
 * derived from the exact timestamp and the state reflects the central policy so
 * stale / overdue evidence is never shown as if it were current.
 */
export function deriveCheckedDisplay(
  input: unknown,
  nowMs: number,
  locale: CtaLocale = 'en',
): CheckedDisplay {
  const validation = validateEvidenceMetadata(input);
  if (!validation.ok || !validation.value) {
    return { iso: null, display: null, state: 'none' };
  }
  const meta = validation.value;
  const iso = meta.evidenceCheckedAt;
  const display = formatEvidenceCheckedAt(iso, locale);

  if (!Number.isFinite(nowMs)) {
    // Without a usable clock we can still show the derived date but must not
    // claim it is current.
    return { iso, display, state: 'stale' };
  }
  const auth = assessEvidenceAuthorization(meta, nowMs);
  const state: CheckedDisplayState = auth.authoritative
    ? 'current'
    : auth.reviewState === 'overdue'
      ? 'overdue'
      : 'stale';
  return { iso, display, state };
}

export interface MarketProfileTimestamps {
  lastCheckedAt: string;
  nextReviewAt: string;
}

export interface MarketProfileTimestampAdapterResult {
  ok: boolean;
  value?: MarketProfileTimestamps;
  reason?: string;
}

/**
 * Future-MarketProfile adapter (documented, deterministic).
 *
 * The ONLY sanctioned path from real evidence metadata to a future
 * MarketProfile.lastCheckedAt / nextReviewAt. It accepts nothing but fully
 * validated exact metadata: display strings, date-only values, timezone-less
 * datetimes and missing provenance are all rejected. This task never populates
 * PUBLIC_MARKET_PROFILES; the adapter merely proves that when profiles ARE
 * created later, their timestamps can only originate from exact validated
 * evidence — never from a human freshness string.
 */
export function toMarketProfileTimestamps(input: unknown): MarketProfileTimestampAdapterResult {
  const validation = validateEvidenceMetadata(input);
  if (!validation.ok || !validation.value) {
    return { ok: false, reason: 'EVIDENCE_METADATA_INVALID' };
  }
  const meta = validation.value;
  return {
    ok: true,
    value: { lastCheckedAt: meta.evidenceCheckedAt, nextReviewAt: meta.nextReviewAt },
  };
}
