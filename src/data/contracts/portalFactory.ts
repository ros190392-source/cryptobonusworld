import { isInternalPath } from './internalPath';

export type SourceClass = 'exchange_official' | 'regulator' | 'government' | 'authoritative_media' | 'other';
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type ApprovalState = 'draft' | 'validated' | 'approved' | 'rejected' | 'stale';
export type AvailabilityState = 'available' | 'limited' | 'restricted' | 'unavailable' | 'unknown';
export type OfferEligibility = 'approved' | 'not_eligible' | 'under_review' | 'unknown';

/**
 * Central evidence-freshness policy — the single source of truth for how stale
 * ranking evidence may be before it can no longer back an approved (and hence
 * commercial) ranking. Kept here so there is exactly one threshold, documented
 * and free of duplicated magic numbers.
 */
export const EVIDENCE_FRESHNESS_POLICY = {
  /** Evidence older than this many days is stale; an approved ranking is rejected. */
  maxEvidenceAgeDays: 45,
  /** Clock-skew tolerance: evidence timestamps up to this far in the future are
   *  accepted; anything beyond is treated as an invalid future timestamp. */
  futureSkewToleranceMinutes: 60,
} as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

export type FreshnessState = 'fresh' | 'stale' | 'future' | 'invalid';

export interface FreshnessAssessment {
  state: FreshnessState;
  /** Age in milliseconds relative to `nowMs` (positive = past). Null when invalid. */
  ageMs: number | null;
  /** Machine-readable reason when not fresh; null when fresh. */
  reason: string | null;
}

/**
 * Deterministically assess evidence freshness against an explicit clock.
 *
 * Fail-closed and deterministic: a malformed timestamp is reported as `invalid`
 * (never silently coerced to "now"); ISO strings carrying a timezone offset are
 * normalized to a UTC epoch via Date.parse, so the assessment is timezone-safe.
 * The caller supplies `nowMs` so the function has no hidden dependency on the
 * wall clock.
 */
export function assessEvidenceFreshness(
  value: unknown,
  nowMs: number,
  policy: { maxEvidenceAgeDays: number; futureSkewToleranceMinutes: number } = EVIDENCE_FRESHNESS_POLICY,
): FreshnessAssessment {
  if (!isIsoDate(value)) {
    return { state: 'invalid', ageMs: null, reason: 'INVALID_DATE' };
  }
  const t = Date.parse(value);
  const ageMs = nowMs - t;
  const skewMs = policy.futureSkewToleranceMinutes * MS_PER_MINUTE;
  if (ageMs < -skewMs) {
    return { state: 'future', ageMs, reason: 'FUTURE_TIMESTAMP' };
  }
  const maxAgeMs = policy.maxEvidenceAgeDays * MS_PER_DAY;
  if (ageMs > maxAgeMs) {
    return { state: 'stale', ageMs, reason: 'STALE_EVIDENCE' };
  }
  return { state: 'fresh', ageMs, reason: null };
}

export interface SourcePacket {
  packetId: string;
  sourceUrl: string;
  sourceClass: SourceClass;
  publisher: string;
  accessedAt: string;
  publishedAt?: string;
  countryCode?: string;
  exchangeId?: string;
  topics: string[];
  rawCaptureRef: string;
  rawCaptureDigest: string;
  parserVersion: string;
  extractionWarnings: string[];
}

export interface NormalizedClaim {
  claimId: string;
  subjectId: string;
  predicate: string;
  value: string | number | boolean;
  unit?: string;
  countryCode?: string;
  exchangeId?: string;
  effectiveAt?: string;
  expiresAt?: string;
  supportingPacketIds: string[];
  contradictingPacketIds: string[];
  confidence: Confidence;
  limitations: string[];
  approval: ApprovalState;
}

export interface MarketProfile {
  profileId: string;
  exchangeId: string;
  countryCode: string;
  availability: AvailabilityState;
  offerEligibility: OfferEligibility;
  claimIds: string[];
  limitations: string[];
  lastCheckedAt: string;
  nextReviewAt: string;
  approval: ApprovalState;
}

export interface RankingRow {
  position: number;
  exchangeId: string;
  marketProfileId: string;
  rationaleClaimIds: string[];
}

export interface RankingSnapshot {
  snapshotId: string;
  countryCode: string;
  methodologyVersion: string;
  rows: RankingRow[];
  excludedExchangeIds: string[];
  underReviewExchangeIds: string[];
  evidenceCheckedAt: string;
  approvedBy?: string;
  approval: ApprovalState;
}

export interface ContentPackage {
  packageId: string;
  countryCode?: string;
  exchangeId?: string;
  marketProfileId?: string;
  rankingSnapshotId?: string;
  approvedClaimIds: string[];
  editorialBlocks: string[];
  sourcePacketIds: string[];
  localeReadiness: Record<string, 'none' | 'draft' | 'reviewed' | 'approved'>;
  previewRoute: string;
  approval: ApprovalState;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(hasText);
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

function validateId(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!hasText(value) || !ID_PATTERN.test(value)) {
    issues.push(issue(path, 'INVALID_ID', 'A stable non-empty identifier is required.'));
  }
}

function validateCountry(value: unknown, path: string, issues: ValidationIssue[], required = false): void {
  if (value === undefined && !required) return;
  if (!hasText(value) || !COUNTRY_PATTERN.test(value)) {
    issues.push(issue(path, 'INVALID_COUNTRY', 'Country code must be an uppercase ISO-like two-letter code.'));
  }
}

function validateApproval(value: unknown, path: string, issues: ValidationIssue[]): void {
  const allowed: ApprovalState[] = ['draft', 'validated', 'approved', 'rejected', 'stale'];
  if (!allowed.includes(value as ApprovalState)) {
    issues.push(issue(path, 'INVALID_APPROVAL', 'Unknown approval state.'));
  }
}

export function validateSourcePacket(input: unknown): ValidationResult<SourcePacket> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return { ok: false, issues: [issue('$', 'NOT_OBJECT', 'Source packet must be an object.')] };

  validateId(input.packetId, 'packetId', issues);

  if (!hasText(input.sourceUrl)) {
    issues.push(issue('sourceUrl', 'REQUIRED', 'Source URL is required.'));
  } else {
    try {
      const url = new URL(input.sourceUrl);
      if (url.protocol !== 'https:') issues.push(issue('sourceUrl', 'HTTPS_REQUIRED', 'Only HTTPS source URLs are accepted.'));
    } catch {
      issues.push(issue('sourceUrl', 'INVALID_URL', 'Source URL is invalid.'));
    }
  }

  const sourceClasses: SourceClass[] = ['exchange_official', 'regulator', 'government', 'authoritative_media', 'other'];
  if (!sourceClasses.includes(input.sourceClass as SourceClass)) {
    issues.push(issue('sourceClass', 'INVALID_SOURCE_CLASS', 'Source class is not recognized.'));
  }
  if (!hasText(input.publisher)) issues.push(issue('publisher', 'REQUIRED', 'Publisher is required.'));
  if (!isIsoDate(input.accessedAt)) issues.push(issue('accessedAt', 'INVALID_DATE', 'Accessed date must be an ISO-compatible date.'));
  if (input.publishedAt !== undefined && !isIsoDate(input.publishedAt)) issues.push(issue('publishedAt', 'INVALID_DATE', 'Published date is invalid.'));
  validateCountry(input.countryCode, 'countryCode', issues);
  if (input.exchangeId !== undefined) validateId(input.exchangeId, 'exchangeId', issues);
  if (!isStringArray(input.topics) || input.topics.length === 0) issues.push(issue('topics', 'REQUIRED', 'At least one topic is required.'));
  if (!hasText(input.rawCaptureRef)) issues.push(issue('rawCaptureRef', 'REQUIRED', 'Raw capture reference is required.'));
  if (!hasText(input.rawCaptureDigest) || !SHA256_PATTERN.test(input.rawCaptureDigest)) issues.push(issue('rawCaptureDigest', 'INVALID_DIGEST', 'A sha256 digest is required.'));
  if (!hasText(input.parserVersion)) issues.push(issue('parserVersion', 'REQUIRED', 'Parser version is required.'));
  if (!isStringArray(input.extractionWarnings)) issues.push(issue('extractionWarnings', 'INVALID_ARRAY', 'Extraction warnings must be a string array.'));

  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as SourcePacket, issues };
}

export function validateNormalizedClaim(input: unknown): ValidationResult<NormalizedClaim> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return { ok: false, issues: [issue('$', 'NOT_OBJECT', 'Claim must be an object.')] };

  validateId(input.claimId, 'claimId', issues);
  validateId(input.subjectId, 'subjectId', issues);
  if (!hasText(input.predicate)) issues.push(issue('predicate', 'REQUIRED', 'Predicate is required.'));
  if (!['string', 'number', 'boolean'].includes(typeof input.value)) issues.push(issue('value', 'INVALID_VALUE', 'Claim value must be a primitive.'));
  validateCountry(input.countryCode, 'countryCode', issues);
  if (input.exchangeId !== undefined) validateId(input.exchangeId, 'exchangeId', issues);
  if (input.effectiveAt !== undefined && !isIsoDate(input.effectiveAt)) issues.push(issue('effectiveAt', 'INVALID_DATE', 'Effective date is invalid.'));
  if (input.expiresAt !== undefined && !isIsoDate(input.expiresAt)) issues.push(issue('expiresAt', 'INVALID_DATE', 'Expiry date is invalid.'));
  if (!isStringArray(input.supportingPacketIds) || input.supportingPacketIds.length === 0) issues.push(issue('supportingPacketIds', 'NO_EVIDENCE', 'A factual claim requires supporting evidence.'));
  if (!isStringArray(input.contradictingPacketIds)) issues.push(issue('contradictingPacketIds', 'INVALID_ARRAY', 'Contradicting evidence must be a string array.'));
  if (!['high', 'medium', 'low', 'unknown'].includes(input.confidence as string)) issues.push(issue('confidence', 'INVALID_CONFIDENCE', 'Confidence is invalid.'));
  if (!isStringArray(input.limitations)) issues.push(issue('limitations', 'INVALID_ARRAY', 'Limitations must be a string array.'));
  validateApproval(input.approval, 'approval', issues);

  if (Array.isArray(input.contradictingPacketIds) && input.contradictingPacketIds.length > 0 && input.approval === 'approved') {
    issues.push(issue('approval', 'UNRESOLVED_CONTRADICTION', 'A claim with contradictory evidence cannot be approved without resolution.'));
  }
  if (input.confidence === 'unknown' && input.approval === 'approved') {
    issues.push(issue('approval', 'UNKNOWN_CONFIDENCE', 'Unknown-confidence claims cannot be approved.'));
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as NormalizedClaim, issues };
}

export function validateMarketProfile(input: unknown): ValidationResult<MarketProfile> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return { ok: false, issues: [issue('$', 'NOT_OBJECT', 'Market profile must be an object.')] };

  validateId(input.profileId, 'profileId', issues);
  validateId(input.exchangeId, 'exchangeId', issues);
  validateCountry(input.countryCode, 'countryCode', issues, true);
  if (!['available', 'limited', 'restricted', 'unavailable', 'unknown'].includes(input.availability as string)) issues.push(issue('availability', 'INVALID_AVAILABILITY', 'Availability is invalid.'));
  if (!['approved', 'not_eligible', 'under_review', 'unknown'].includes(input.offerEligibility as string)) issues.push(issue('offerEligibility', 'INVALID_OFFER', 'Offer eligibility is invalid.'));
  if (!isStringArray(input.claimIds) || input.claimIds.length === 0) issues.push(issue('claimIds', 'NO_CLAIMS', 'A market profile requires approved or reviewable claim references.'));
  if (!isStringArray(input.limitations)) issues.push(issue('limitations', 'INVALID_ARRAY', 'Limitations must be a string array.'));
  if (!isIsoDate(input.lastCheckedAt)) issues.push(issue('lastCheckedAt', 'INVALID_DATE', 'Last-checked date is invalid.'));
  if (!isIsoDate(input.nextReviewAt)) issues.push(issue('nextReviewAt', 'INVALID_DATE', 'Next-review date is invalid.'));
  validateApproval(input.approval, 'approval', issues);

  if (isIsoDate(input.lastCheckedAt) && isIsoDate(input.nextReviewAt) && Date.parse(input.nextReviewAt) <= Date.parse(input.lastCheckedAt)) {
    issues.push(issue('nextReviewAt', 'INVALID_REVIEW_WINDOW', 'Next review must be later than last checked.'));
  }
  if (input.approval === 'approved' && input.availability === 'unknown') {
    issues.push(issue('availability', 'UNKNOWN_APPROVED_PROFILE', 'An approved profile cannot have unknown availability.'));
  }
  if (input.offerEligibility === 'approved' && input.approval !== 'approved') {
    issues.push(issue('offerEligibility', 'OFFER_WITHOUT_PROFILE_APPROVAL', 'Local offer eligibility requires an approved market profile.'));
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as MarketProfile, issues };
}

export interface RankingValidationOptions {
  /**
   * Explicit clock (epoch ms) for the evidence-freshness check. When provided,
   * an approved ranking whose evidence is stale / future-dated / invalid is
   * rejected fail-closed. Omitted by default so structural validation stays
   * deterministic and time-independent (build fixtures never rot).
   */
  now?: number;
}

export function validateRankingSnapshot(
  input: unknown,
  options: RankingValidationOptions = {},
): ValidationResult<RankingSnapshot> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return { ok: false, issues: [issue('$', 'NOT_OBJECT', 'Ranking snapshot must be an object.')] };

  validateId(input.snapshotId, 'snapshotId', issues);
  validateCountry(input.countryCode, 'countryCode', issues, true);
  if (!hasText(input.methodologyVersion)) issues.push(issue('methodologyVersion', 'REQUIRED', 'Methodology version is required.'));
  if (!Array.isArray(input.rows)) issues.push(issue('rows', 'INVALID_ARRAY', 'Ranking rows must be an array.'));
  if (!isStringArray(input.excludedExchangeIds)) issues.push(issue('excludedExchangeIds', 'INVALID_ARRAY', 'Excluded exchanges must be a string array.'));
  if (!isStringArray(input.underReviewExchangeIds)) issues.push(issue('underReviewExchangeIds', 'INVALID_ARRAY', 'Under-review exchanges must be a string array.'));
  if (!isIsoDate(input.evidenceCheckedAt)) issues.push(issue('evidenceCheckedAt', 'INVALID_DATE', 'Evidence checked date is invalid.'));
  validateApproval(input.approval, 'approval', issues);

  if (Array.isArray(input.rows)) {
    const positions = input.rows.map(row => isObject(row) ? row.position : undefined);
    const expected = input.rows.map((_, index) => index + 1);
    if (JSON.stringify(positions) !== JSON.stringify(expected)) issues.push(issue('rows', 'NON_CONTIGUOUS_POSITIONS', 'Ranking positions must start at 1 and be contiguous.'));

    const exchangeIds = input.rows.map(row => isObject(row) ? row.exchangeId : undefined);
    if (new Set(exchangeIds).size !== exchangeIds.length) issues.push(issue('rows', 'DUPLICATE_EXCHANGE', 'An exchange may appear only once.'));

    input.rows.forEach((row, index) => {
      if (!isObject(row)) {
        issues.push(issue(`rows.${index}`, 'NOT_OBJECT', 'Ranking row must be an object.'));
        return;
      }
      validateId(row.exchangeId, `rows.${index}.exchangeId`, issues);
      validateId(row.marketProfileId, `rows.${index}.marketProfileId`, issues);
      if (!isStringArray(row.rationaleClaimIds) || row.rationaleClaimIds.length === 0) issues.push(issue(`rows.${index}.rationaleClaimIds`, 'NO_RATIONALE', 'Ranked rows require rationale claims.'));
    });
  }

  if (input.approval === 'approved' && (!Array.isArray(input.rows) || input.rows.length === 0)) {
    issues.push(issue('rows', 'EMPTY_APPROVED_RANKING', 'An approved ranking cannot be empty.'));
  }
  if (input.approval === 'approved' && !hasText(input.approvedBy)) {
    issues.push(issue('approvedBy', 'OWNER_APPROVAL_REQUIRED', 'Approved rankings require an approver.'));
  }

  // Evidence freshness (fail-closed) — only when an explicit clock is supplied.
  // An approved ranking cannot ship on stale, future-dated or unusable evidence.
  if (options.now !== undefined && input.approval === 'approved') {
    const freshness = assessEvidenceFreshness(input.evidenceCheckedAt, options.now);
    if (freshness.state === 'stale') {
      issues.push(issue('evidenceCheckedAt', 'STALE_EVIDENCE', `Evidence is older than the ${EVIDENCE_FRESHNESS_POLICY.maxEvidenceAgeDays}-day freshness window.`));
    } else if (freshness.state === 'future') {
      issues.push(issue('evidenceCheckedAt', 'FUTURE_EVIDENCE', 'Evidence timestamp is implausibly in the future.'));
    }
    // 'invalid' is already reported by the structural INVALID_DATE check above.
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as RankingSnapshot, issues };
}

export function validateContentPackage(input: unknown): ValidationResult<ContentPackage> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return { ok: false, issues: [issue('$', 'NOT_OBJECT', 'Content package must be an object.')] };

  validateId(input.packageId, 'packageId', issues);
  validateCountry(input.countryCode, 'countryCode', issues);
  if (input.exchangeId !== undefined) validateId(input.exchangeId, 'exchangeId', issues);
  if (input.marketProfileId !== undefined) validateId(input.marketProfileId, 'marketProfileId', issues);
  if (input.rankingSnapshotId !== undefined) validateId(input.rankingSnapshotId, 'rankingSnapshotId', issues);
  if (!isStringArray(input.approvedClaimIds)) issues.push(issue('approvedClaimIds', 'INVALID_ARRAY', 'Approved claims must be a string array.'));
  if (!isStringArray(input.editorialBlocks) || input.editorialBlocks.length === 0) issues.push(issue('editorialBlocks', 'NO_CONTENT', 'At least one editorial block is required.'));
  if (!isStringArray(input.sourcePacketIds) || input.sourcePacketIds.length === 0) issues.push(issue('sourcePacketIds', 'NO_SOURCES', 'Content packages require source packet references.'));
  if (!isObject(input.localeReadiness)) issues.push(issue('localeReadiness', 'INVALID_OBJECT', 'Locale readiness must be an object.'));
  if (!isInternalPath(input.previewRoute)) issues.push(issue('previewRoute', 'INVALID_PREVIEW_ROUTE', 'Preview route must be a normalized internal path ending with a slash (never affiliate or protocol-relative).'));
  validateApproval(input.approval, 'approval', issues);

  if (input.approval === 'approved' && Array.isArray(input.approvedClaimIds) && input.approvedClaimIds.length === 0) {
    issues.push(issue('approvedClaimIds', 'EMPTY_APPROVED_PACKAGE', 'An approved factual package requires approved claims.'));
  }
  if (input.approval === 'approved' && isObject(input.localeReadiness)) {
    const readyLocales = Object.values(input.localeReadiness).filter(value => value === 'approved');
    if (readyLocales.length === 0) issues.push(issue('localeReadiness', 'NO_APPROVED_LOCALE', 'An approved package requires at least one approved locale rendering.'));
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as ContentPackage, issues };
}
