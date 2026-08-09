import {
  AUTOMATED_MARKET_PROFILE_REVIEWER_ID,
  validateMarketProfileReviewPreflight,
  type MarketProfileReviewPreflight,
} from './marketProfileReviewPreflight';
import {
  recomputeCountryMarketProfileV1CandidateDigest,
  type CandidateInventorySource,
  type MarketProfileCandidateInventory,
} from './marketProfileCandidateInventory';

export const MARKET_PROFILE_PROMOTION_PREFLIGHT_VERSION = 1 as const;

const DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const STRICT_UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export type MarketProfilePromotionPreflightState =
  | 'review_not_ready'
  | 'refresh_required'
  | 'blocked'
  | 'invalid';

export interface MarketProfilePromotionPreflightEntry {
  exchangeId: string;
  countryCode: string;
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  reviewPreflightState: MarketProfileReviewPreflight['entries'][number]['state'];
  reviewDigest: string | null;
  sourceAuthorizationComplete: boolean;
  state: MarketProfilePromotionPreflightState;
  reasons: readonly string[];
  ownerReceiptPresent: false;
  promotionReady: false;
  readyForSeparateImport: false;
  importAllowed: false;
  registryMutation: false;
  publicAuthority: false;
}

export interface MarketProfilePromotionPreflight {
  schemaVersion: typeof MARKET_PROFILE_PROMOTION_PREFLIGHT_VERSION;
  preflightId: string;
  reviewPreflightDigest: string;
  reviewPreflightReviewedAt: string;
  evaluatedAt: string;
  entries: readonly MarketProfilePromotionPreflightEntry[];
  readyForSeparateImportCount: 0;
  ownerReceiptCount: 0;
  preflightDigest: string;
}

export interface MarketProfilePromotionPreflightRequest {
  preflightId: string;
  inventory: MarketProfileCandidateInventory;
  reviewPreflight: MarketProfileReviewPreflight;
  sources: readonly CandidateInventorySource[];
  evaluatedAt: string;
}

export type MarketProfilePromotionPreflightValidation =
  | { ok: true; value: MarketProfilePromotionPreflight }
  | { ok: false; issues: readonly string[] };

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function strictUtcSecond(value: unknown): value is string {
  if (!hasText(value) || !STRICT_UTC_SECOND.test(value)) return false;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return false;
  return new Date(ms).toISOString().replace('.000Z', 'Z') === value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function computeMarketProfilePromotionPreflightDigest(
  preflight: Omit<MarketProfilePromotionPreflight, 'preflightDigest'>,
): string {
  return `fnv1a64:${fnv1a64(canonicalize(preflight))}`;
}

function sourceMap(sources: readonly CandidateInventorySource[]): Map<string, CandidateInventorySource> {
  if (!Array.isArray(sources)) throw new Error('Candidate sources must be an array.');
  const map = new Map<string, CandidateInventorySource>();
  for (const source of sources) {
    const pair = `${source.exchangeId}:${source.countryCode}`;
    if (map.has(pair)) throw new Error(`Duplicate candidate source ${pair}.`);
    map.set(pair, source);
  }
  return map;
}

function sourceAuthorityComplete(source: CandidateInventorySource): boolean {
  return Object.values(source.candidate.source.authorizations).every((value) => value === true);
}

function baseEntry(
  entry: MarketProfileReviewPreflight['entries'][number],
  sourceAuthorizationCompleteValue: boolean,
): Omit<MarketProfilePromotionPreflightEntry, 'state' | 'reasons'> {
  return {
    exchangeId: entry.exchangeId,
    countryCode: entry.countryCode,
    candidateDigest: entry.candidateDigest,
    sourceCommitSha: entry.sourceCommitSha,
    taskId: entry.taskId,
    reviewPreflightState: entry.state,
    reviewDigest: entry.reviewDigest,
    sourceAuthorizationComplete: sourceAuthorizationCompleteValue,
    ownerReceiptPresent: false,
    promotionReady: false,
    readyForSeparateImport: false,
    importAllowed: false,
    registryMutation: false,
    publicAuthority: false,
  };
}

function buildEntry(
  entry: MarketProfileReviewPreflight['entries'][number],
  source: CandidateInventorySource | undefined,
): MarketProfilePromotionPreflightEntry {
  if (!source
    || source.exchangeId !== entry.exchangeId
    || source.countryCode !== entry.countryCode
    || source.candidate.candidateDigest !== entry.candidateDigest
    || source.candidate.source.sourceCommitSha !== entry.sourceCommitSha
    || source.candidate.source.taskId !== entry.taskId
    || recomputeCountryMarketProfileV1CandidateDigest(source.candidate) !== source.candidate.candidateDigest) {
    return Object.freeze({
      ...baseEntry(entry, false),
      state: 'invalid',
      reasons: Object.freeze(['CANDIDATE_REVIEW_BINDING_MISMATCH']),
    });
  }

  const ceilingComplete = sourceAuthorityComplete(source);
  if (entry.state === 'invalid') {
    return Object.freeze({ ...baseEntry(entry, ceilingComplete), state: 'invalid', reasons: Object.freeze(['REVIEW_PREFLIGHT_INVALID']) });
  }
  if (entry.state === 'blocked') {
    return Object.freeze({ ...baseEntry(entry, ceilingComplete), state: 'blocked', reasons: Object.freeze(['REVIEW_PREFLIGHT_BLOCKED']) });
  }
  if (entry.state === 'refresh_required') {
    return Object.freeze({ ...baseEntry(entry, ceilingComplete), state: 'refresh_required', reasons: Object.freeze(['FRESH_EVIDENCE_REVIEW_REQUIRED']) });
  }

  const reasons: string[] = [];
  if (entry.state !== 'needs_research' || !entry.reviewPacket || !entry.reviewDigest) {
    return Object.freeze({ ...baseEntry(entry, ceilingComplete), state: 'invalid', reasons: Object.freeze(['EXPECTED_NEEDS_RESEARCH_REVIEW_PACKET_MISSING']) });
  }
  if (entry.reviewPacket.reviewerId !== AUTOMATED_MARKET_PROFILE_REVIEWER_ID) reasons.push('AUTOMATED_REVIEWER_IDENTITY_INVALID');
  if (entry.reviewPacket.decision !== 'needs_research') reasons.push('AUTOMATED_REVIEW_NOT_NEEDS_RESEARCH');
  if (entry.reviewPacket.reviewDigest !== entry.reviewDigest) reasons.push('REVIEW_DIGEST_BINDING_MISMATCH');
  if (entry.reviewPacket.promotionAuthorized !== false || entry.reviewPacket.importAuthorized !== false || entry.reviewPacket.publicAuthority !== false) {
    reasons.push('REVIEW_PACKET_AUTHORITY_LEAK');
  }
  if (reasons.length > 0) {
    return Object.freeze({ ...baseEntry(entry, ceilingComplete), state: 'invalid', reasons: Object.freeze(reasons) });
  }

  reasons.push('REVIEW_DECISION_NOT_READY_FOR_PROMOTION');
  reasons.push('OWNER_PROMOTION_RECEIPT_NOT_PRESENT_BY_DESIGN');
  if (!ceilingComplete) reasons.push('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE');
  return Object.freeze({
    ...baseEntry(entry, ceilingComplete),
    state: 'review_not_ready',
    reasons: Object.freeze(reasons),
  });
}

export function buildMarketProfilePromotionPreflight(
  request: MarketProfilePromotionPreflightRequest,
): MarketProfilePromotionPreflight {
  if (!hasText(request.preflightId)) throw new Error('preflightId is required.');
  if (!strictUtcSecond(request.evaluatedAt)) throw new Error('Explicit strict UTC-second evaluatedAt is required.');
  if (Date.parse(request.evaluatedAt) < Date.parse(request.reviewPreflight.reviewedAt)) {
    throw new Error('Promotion preflight cannot predate review preflight.');
  }
  const reviewValidation = validateMarketProfileReviewPreflight(request.reviewPreflight, request.inventory, request.sources);
  if (!reviewValidation.ok) throw new Error(`Review preflight invalid: ${reviewValidation.issues.join(',')}`);

  const sources = sourceMap(request.sources);
  const entries = request.reviewPreflight.entries.map((entry) => buildEntry(
    entry,
    sources.get(`${entry.exchangeId}:${entry.countryCode}`),
  ));

  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_PROMOTION_PREFLIGHT_VERSION,
    preflightId: request.preflightId,
    reviewPreflightDigest: request.reviewPreflight.preflightDigest,
    reviewPreflightReviewedAt: request.reviewPreflight.reviewedAt,
    evaluatedAt: request.evaluatedAt,
    entries: Object.freeze(entries),
    readyForSeparateImportCount: 0 as const,
    ownerReceiptCount: 0 as const,
  });
  return Object.freeze({ ...base, preflightDigest: computeMarketProfilePromotionPreflightDigest(base) });
}

export function validateMarketProfilePromotionPreflight(
  preflight: MarketProfilePromotionPreflight,
  request: Omit<MarketProfilePromotionPreflightRequest, 'preflightId' | 'evaluatedAt'>,
): MarketProfilePromotionPreflightValidation {
  const issues: string[] = [];
  if (!preflight || typeof preflight !== 'object') return { ok: false, issues: Object.freeze(['PROMOTION_PREFLIGHT_NOT_OBJECT']) };
  if (preflight.schemaVersion !== MARKET_PROFILE_PROMOTION_PREFLIGHT_VERSION) issues.push('PROMOTION_PREFLIGHT_SCHEMA_INVALID');
  if (!hasText(preflight.preflightId)) issues.push('PROMOTION_PREFLIGHT_ID_INVALID');
  if (!strictUtcSecond(preflight.evaluatedAt)) issues.push('PROMOTION_PREFLIGHT_TIME_INVALID');
  if (preflight.reviewPreflightDigest !== request.reviewPreflight.preflightDigest) issues.push('PROMOTION_PREFLIGHT_REVIEW_DIGEST_MISMATCH');
  if (preflight.reviewPreflightReviewedAt !== request.reviewPreflight.reviewedAt) issues.push('PROMOTION_PREFLIGHT_REVIEW_TIME_MISMATCH');
  if (preflight.readyForSeparateImportCount !== 0) issues.push('PROMOTION_PREFLIGHT_READY_COUNT_NONZERO');
  if (preflight.ownerReceiptCount !== 0) issues.push('PROMOTION_PREFLIGHT_OWNER_RECEIPT_COUNT_NONZERO');
  if (!DIGEST.test(preflight.preflightDigest ?? '')) issues.push('PROMOTION_PREFLIGHT_DIGEST_INVALID');
  if (!Array.isArray(preflight.entries) || preflight.entries.length !== request.reviewPreflight.entries.length) issues.push('PROMOTION_PREFLIGHT_ENTRY_COUNT_INVALID');

  if (Array.isArray(preflight.entries)) {
    for (const entry of preflight.entries) {
      if (!['review_not_ready', 'refresh_required', 'blocked', 'invalid'].includes(entry.state)) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_STATE_INVALID`);
      if (entry.ownerReceiptPresent !== false || entry.promotionReady !== false || entry.readyForSeparateImport !== false
        || entry.importAllowed !== false || entry.registryMutation !== false || entry.publicAuthority !== false) {
        issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_AUTHORITY_LEAK`);
      }
      if (entry.state === 'review_not_ready' && entry.reviewDigest === null) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_REVIEW_DIGEST_MISSING`);
    }
  }

  if (issues.length === 0) {
    try {
      const rebuilt = buildMarketProfilePromotionPreflight({
        preflightId: preflight.preflightId,
        inventory: request.inventory,
        reviewPreflight: request.reviewPreflight,
        sources: request.sources,
        evaluatedAt: preflight.evaluatedAt,
      });
      if (canonicalize(rebuilt) !== canonicalize(preflight)) issues.push('PROMOTION_PREFLIGHT_RECOMPUTE_MISMATCH');
    } catch {
      issues.push('PROMOTION_PREFLIGHT_RECOMPUTE_FAILED');
    }
  }

  const { preflightDigest, ...withoutDigest } = preflight;
  if (computeMarketProfilePromotionPreflightDigest(withoutDigest) !== preflightDigest) issues.push('PROMOTION_PREFLIGHT_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: preflight };
}
