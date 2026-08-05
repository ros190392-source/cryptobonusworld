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
 * Strict, calendar-valid exact ISO-8601 datetime parser (R9).
 *
 * A shape regex plus Date.parse is NOT sufficient — Date.parse silently
 * normalizes impossible calendar values (e.g. 2026-02-31 → 2026-03-03) instead of
 * rejecting them. This parser validates every component against the real
 * calendar BEFORE producing an instant, so an impossible date can never become
 * authoritative evidence.
 *
 * Accepts:  2024-02-29T00:00:00Z (leap) · 2026-04-30T23:59:59Z ·
 *           2026-07-31T09:30:00+05:00 · 2026-07-31T09:30:00.123Z · valid negative
 *           offset.
 * Rejects:  non-leap Feb 29, day > days-in-month (2026-04-31, 2026-06-31), month
 *           00/13, day 00, hour 24, minute/second 60, invalid tz offset, date-only,
 *           timezone-less, space-separated, and any overflow-normalized value.
 */
const ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const table = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month - 1];
}

export interface ParsedIsoDateTime {
  /** Deterministic UTC epoch (ms) computed only after all calendar checks pass. */
  epochMs: number;
}

/**
 * Parse and fully validate an exact ISO-8601 datetime. Returns a canonical epoch
 * only when every calendar/time/offset field is individually valid; otherwise
 * null. Never relies on Date.parse normalization as proof of validity.
 */
export function parseExactIsoDateTime(value: unknown): ParsedIsoDateTime | null {
  if (typeof value !== 'string') return null;
  const m = ISO_DATETIME_RE.exec(value);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = m[6] === undefined ? 0 : Number(m[6]);
  const fraction = m[7]; // syntax validated by the regex (1–9 digits)

  // Calendar/time bounds — validated before any instant is built.
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23) return null;
  if (minute > 59) return null;
  if (second > 59) return null;

  // Timezone: Z, or a numeric ±HH:MM offset with valid hour/minute fields.
  let offsetMinutes = 0;
  if (m[8] !== 'Z') {
    const sign = m[9] === '-' ? -1 : 1;
    const offsetHours = Number(m[10]);
    const offsetMins = Number(m[11]);
    if (offsetHours > 23 || offsetMins > 59) return null;
    offsetMinutes = sign * (offsetHours * 60 + offsetMins);
  }

  const ms = fraction ? Math.round(Number(`0.${fraction}`) * 1000) : 0;
  // All fields are in range, so Date.UTC performs no overflow normalization.
  const epochMs = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offsetMinutes * 60000;
  if (!Number.isFinite(epochMs)) return null;
  return { epochMs };
}

export function isExactIsoDateTime(value: unknown): value is string {
  return parseExactIsoDateTime(value) !== null;
}

const HTTPS_URL = /^https:\/\/[^\s]+$/i;
/** Canonical exchange identity (CBW: evidence.exchangeId === exchange slug). */
const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** HTTPS URL with NO surrounding whitespace (R12): the exact value is used. */
function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim() || !HTTPS_URL.test(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
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

  // Review window: nextReviewAt strictly after evidenceCheckedAt, compared via
  // the STRICT parser's canonical epochs (never Date.parse normalization).
  const checkedAt = parseExactIsoDateTime(rec.evidenceCheckedAt);
  const reviewAt = parseExactIsoDateTime(rec.nextReviewAt);
  if (checkedAt && reviewAt && reviewAt.epochMs <= checkedAt.epochMs) {
    issues.push({ field: 'nextReviewAt', code: 'INVALID_REVIEW_WINDOW', message: 'nextReviewAt must be strictly later than evidenceCheckedAt.' });
  }

  // Identity/reference fields must be non-empty AND carry no surrounding
  // whitespace (R12) so the validated value is safe to use verbatim.
  if (rec.sourceId !== undefined && (typeof rec.sourceId !== 'string' || !rec.sourceId.trim() || rec.sourceId !== rec.sourceId.trim())) {
    issues.push({ field: 'sourceId', code: 'INVALID_ID', message: 'sourceId, when present, must be a non-empty string without surrounding whitespace.' });
  }
  if (rec.exchangeId !== undefined && (typeof rec.exchangeId !== 'string' || !rec.exchangeId.trim() || rec.exchangeId !== rec.exchangeId.trim())) {
    issues.push({ field: 'exchangeId', code: 'INVALID_ID', message: 'exchangeId, when present, must be a non-empty string without surrounding whitespace.' });
  }

  if (issues.length) return { ok: false, issues };

  // Return a NORMALIZED validated value (R12): consumers use THIS, never a cast
  // of the raw input. Whitespace-bearing values are already rejected above, so
  // the fields are clean; we still construct the object explicitly so callers
  // cannot smuggle extra unvalidated properties into a "validated" record.
  const normalized: EvidenceMetadata = {
    evidenceCheckedAt: rec.evidenceCheckedAt as string,
    nextReviewAt: rec.nextReviewAt as string,
    sourceUrl: rec.sourceUrl as string,
    ...(rec.sourceId !== undefined ? { sourceId: rec.sourceId as string } : {}),
    ...(rec.exchangeId !== undefined ? { exchangeId: rec.exchangeId as string } : {}),
  };
  return { ok: true, value: normalized, issues };
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

export type OfferEvidenceFailReason =
  | 'OFFER_EVIDENCE_MISSING'          // null/undefined evidence
  | 'OFFER_EVIDENCE_INVALID'          // structurally invalid (date-only, no source, …)
  | 'OFFER_EVIDENCE_IDENTITY_MISMATCH'// exchangeId missing/malformed/≠ expected
  | 'OFFER_EVIDENCE_FUTURE'           // checkedAt beyond future-skew tolerance
  | 'OFFER_EVIDENCE_STALE'            // checkedAt older than the central window
  | 'OFFER_EVIDENCE_REVIEW_OVERDUE'   // now >= nextReviewAt
  | 'CLOCK_INVALID';                  // non-finite explicit clock

export type OfferEvidenceResolution =
  | { ok: true; evidence: EvidenceMetadata }
  | { ok: false; reason: OfferEvidenceFailReason };

/**
 * Offer-specific evidence authorization (R1/R2).
 *
 * A live commercial CTA requires authoritative OFFER evidence INDEPENDENTLY of
 * the MarketProfile. `offer.status === 'verified'` can never substitute for it.
 * The evidence must additionally be bound to the exact exchange being authorized
 * (`evidence.exchangeId === expectedExchangeId`), so evidence for OKX can never
 * authorize a Bybit CTA. Identity is required and explicit — never inferred from
 * the parent offer. Fail-closed at every step; the central freshness policy is
 * reused for evidence age (never re-implemented).
 */
export function resolveOfferEvidenceAuthorization(
  evidence: unknown,
  expectedExchangeId: string,
  nowMs: number,
): OfferEvidenceResolution {
  // Finite explicit clock first — a non-finite clock proves nothing.
  if (!Number.isFinite(nowMs)) return { ok: false, reason: 'CLOCK_INVALID' };
  // Missing evidence is distinct from invalid evidence (both fail closed).
  if (evidence === null || evidence === undefined) return { ok: false, reason: 'OFFER_EVIDENCE_MISSING' };

  const validation = validateEvidenceMetadata(evidence);
  if (!validation.ok || !validation.value) return { ok: false, reason: 'OFFER_EVIDENCE_INVALID' };
  const meta = validation.value;

  // Canonical exchange identity binding — explicit, never inferred.
  if (typeof expectedExchangeId !== 'string' || !CANONICAL_SLUG.test(expectedExchangeId)
    || typeof meta.exchangeId !== 'string' || !CANONICAL_SLUG.test(meta.exchangeId)
    || meta.exchangeId !== expectedExchangeId) {
    return { ok: false, reason: 'OFFER_EVIDENCE_IDENTITY_MISMATCH' };
  }

  // Freshness + review deadline via the central authorization assessment.
  const auth = assessEvidenceAuthorization(meta, nowMs);
  if (auth.authoritative) return { ok: true, evidence: meta };
  if (auth.freshness === 'future') return { ok: false, reason: 'OFFER_EVIDENCE_FUTURE' };
  if (auth.freshness === 'stale') return { ok: false, reason: 'OFFER_EVIDENCE_STALE' };
  if (auth.reviewState === 'overdue') return { ok: false, reason: 'OFFER_EVIDENCE_REVIEW_OVERDUE' };
  return { ok: false, reason: 'OFFER_EVIDENCE_INVALID' };
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

export type CheckedDisplayState = 'current' | 'stale' | 'overdue' | 'invalid' | 'none';

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
 * Absent evidence (null/undefined) → `none` (honest under-re-verification, no
 * date). Present-but-structurally-invalid evidence → `invalid` (distinct from
 * `none`: something was supplied but cannot be trusted), also no fabricated
 * date. Valid metadata → the display is derived from the exact timestamp and the
 * state reflects the central policy so stale / overdue evidence is never shown
 * as if it were current.
 */
export function deriveCheckedDisplay(
  input: unknown,
  nowMs: number,
  locale: CtaLocale = 'en',
): CheckedDisplay {
  if (input === null || input === undefined) {
    return { iso: null, display: null, state: 'none' };
  }
  const validation = validateEvidenceMetadata(input);
  if (!validation.ok || !validation.value) {
    return { iso: null, display: null, state: 'invalid' };
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
 *
 * `expectedExchangeId` is REQUIRED (R11): identity is not optional on the only
 * sanctioned route into future MarketProfile timestamps. The evidence MUST carry
 * a matching canonical `exchangeId`; cross-exchange evidence is rejected so
 * evidence for OKX can never produce timestamps for a Bybit profile. A missing
 * argument is a TypeScript compile error at typed call sites; a malformed runtime
 * value fails closed with EVIDENCE_IDENTITY_MISMATCH.
 */
export function toMarketProfileTimestamps(
  input: unknown,
  expectedExchangeId: string,
): MarketProfileTimestampAdapterResult {
  const validation = validateEvidenceMetadata(input);
  if (!validation.ok || !validation.value) {
    return { ok: false, reason: 'EVIDENCE_METADATA_INVALID' };
  }
  const meta = validation.value;
  if (typeof expectedExchangeId !== 'string' || !CANONICAL_SLUG.test(expectedExchangeId)
    || typeof meta.exchangeId !== 'string' || !CANONICAL_SLUG.test(meta.exchangeId)
    || meta.exchangeId !== expectedExchangeId) {
    return { ok: false, reason: 'EVIDENCE_IDENTITY_MISMATCH' };
  }
  return {
    ok: true,
    value: { lastCheckedAt: meta.evidenceCheckedAt, nextReviewAt: meta.nextReviewAt },
  };
}
