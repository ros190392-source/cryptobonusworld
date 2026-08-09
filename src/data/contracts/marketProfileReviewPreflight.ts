import {
  createMarketProfileCandidateReview,
  validateMarketProfileCandidateReviewPacket,
  type MarketProfileCandidateReviewPacket,
} from './marketProfileCandidateReview';
import {
  recomputeCountryMarketProfileV1CandidateDigest,
  validateMarketProfileCandidateInventory,
  type CandidateInventorySource,
  type MarketProfileCandidateInventory,
} from './marketProfileCandidateInventory';

export const MARKET_PROFILE_REVIEW_PREFLIGHT_VERSION = 1 as const;
export const AUTOMATED_MARKET_PROFILE_REVIEWER_ID = 'system:owner-loop-preflight' as const;

const DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const STRICT_UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export type MarketProfileReviewPreflightState =
  | 'needs_research'
  | 'refresh_required'
  | 'blocked'
  | 'invalid';

export interface MarketProfileReviewPreflightEntry {
  exchangeId: string;
  countryCode: string;
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  inventoryState: MarketProfileCandidateInventory['entries'][number]['state'];
  state: MarketProfileReviewPreflightState;
  reasons: readonly string[];
  reviewPacket: MarketProfileCandidateReviewPacket | null;
  reviewDigest: string | null;
  promotionAllowed: false;
  importAllowed: false;
  registryMutation: false;
  publicAuthority: false;
}

export interface MarketProfileReviewPreflight {
  schemaVersion: typeof MARKET_PROFILE_REVIEW_PREFLIGHT_VERSION;
  preflightId: string;
  inventoryDigest: string;
  inventoryEvaluatedAt: string;
  reviewedAt: string;
  reviewerId: typeof AUTOMATED_MARKET_PROFILE_REVIEWER_ID;
  entries: readonly MarketProfileReviewPreflightEntry[];
  preflightDigest: string;
}

export interface MarketProfileReviewPreflightRequest {
  preflightId: string;
  inventory: MarketProfileCandidateInventory;
  sources: readonly CandidateInventorySource[];
  reviewedAt: string;
}

export type MarketProfileReviewPreflightValidation =
  | { ok: true; value: MarketProfileReviewPreflight }
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

export function computeMarketProfileReviewPreflightDigest(
  preflight: Omit<MarketProfileReviewPreflight, 'preflightDigest'>,
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

function authorityCeilingComplete(source: CandidateInventorySource): boolean {
  return Object.values(source.candidate.source.authorizations).every((value) => value === true);
}

function buildEntry(
  inventoryEntry: MarketProfileCandidateInventory['entries'][number],
  source: CandidateInventorySource | undefined,
  reviewedAtMs: number,
  reviewedAt: string,
): MarketProfileReviewPreflightEntry {
  const reasons: string[] = [];
  if (!source) {
    return Object.freeze({
      exchangeId: inventoryEntry.exchangeId,
      countryCode: inventoryEntry.countryCode,
      candidateDigest: inventoryEntry.candidateDigest,
      sourceCommitSha: inventoryEntry.sourceCommitSha,
      taskId: inventoryEntry.taskId,
      inventoryState: inventoryEntry.state,
      state: 'invalid',
      reasons: Object.freeze(['CANDIDATE_SOURCE_MISSING']),
      reviewPacket: null,
      reviewDigest: null,
      promotionAllowed: false,
      importAllowed: false,
      registryMutation: false,
      publicAuthority: false,
    });
  }

  const candidate = source.candidate;
  if (source.exchangeId !== inventoryEntry.exchangeId
    || source.countryCode !== inventoryEntry.countryCode
    || candidate.candidateDigest !== inventoryEntry.candidateDigest
    || candidate.source.sourceCommitSha !== inventoryEntry.sourceCommitSha
    || candidate.source.taskId !== inventoryEntry.taskId
    || recomputeCountryMarketProfileV1CandidateDigest(candidate) !== candidate.candidateDigest) {
    return Object.freeze({
      exchangeId: inventoryEntry.exchangeId,
      countryCode: inventoryEntry.countryCode,
      candidateDigest: inventoryEntry.candidateDigest,
      sourceCommitSha: inventoryEntry.sourceCommitSha,
      taskId: inventoryEntry.taskId,
      inventoryState: inventoryEntry.state,
      state: 'invalid',
      reasons: Object.freeze(['CANDIDATE_INVENTORY_BINDING_MISMATCH']),
      reviewPacket: null,
      reviewDigest: null,
      promotionAllowed: false,
      importAllowed: false,
      registryMutation: false,
      publicAuthority: false,
    });
  }

  if (inventoryEntry.state === 'invalid') {
    reasons.push('INVENTORY_ENTRY_INVALID');
    return Object.freeze({ ...baseEntry(inventoryEntry), state: 'invalid', reasons: Object.freeze(reasons), reviewPacket: null, reviewDigest: null, promotionAllowed: false, importAllowed: false, registryMutation: false, publicAuthority: false });
  }
  if (inventoryEntry.state === 'blocked' || candidate.state === 'blocked') {
    reasons.push('CANDIDATE_BLOCKED');
    return Object.freeze({ ...baseEntry(inventoryEntry), state: 'blocked', reasons: Object.freeze(reasons), reviewPacket: null, reviewDigest: null, promotionAllowed: false, importAllowed: false, registryMutation: false, publicAuthority: false });
  }
  if (inventoryEntry.state === 'stale_review_required' || Date.parse(candidate.source.nextReviewAt) <= reviewedAtMs) {
    reasons.push('FRESH_EVIDENCE_REVIEW_REQUIRED');
    return Object.freeze({ ...baseEntry(inventoryEntry), state: 'refresh_required', reasons: Object.freeze(reasons), reviewPacket: null, reviewDigest: null, promotionAllowed: false, importAllowed: false, registryMutation: false, publicAuthority: false });
  }
  if (inventoryEntry.state !== 'reviewable' || candidate.state !== 'candidate') {
    reasons.push('ENTRY_NOT_REVIEWABLE');
    return Object.freeze({ ...baseEntry(inventoryEntry), state: 'invalid', reasons: Object.freeze(reasons), reviewPacket: null, reviewDigest: null, promotionAllowed: false, importAllowed: false, registryMutation: false, publicAuthority: false });
  }

  reasons.push('AUTOMATED_PREFLIGHT_NEEDS_RESEARCH');
  if (candidate.unresolvedDimensions.length > 0) reasons.push('UNRESOLVED_DIMENSIONS_REMAIN');
  if (!authorityCeilingComplete(source)) reasons.push('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE');
  reasons.push('HUMAN_OR_GOVERNED_REVIEW_REQUIRED_FOR_PROMOTION_DECISION');

  const review = createMarketProfileCandidateReview({
    expected: {
      candidateDigest: candidate.candidateDigest,
      sourceCommitSha: candidate.source.sourceCommitSha,
      taskId: candidate.source.taskId,
      exchangeId: candidate.source.exchangeId,
      countryCode: candidate.source.countryCode,
    },
    candidate,
    reviewerId: AUTOMATED_MARKET_PROFILE_REVIEWER_ID,
    reviewedAt,
    decision: 'needs_research',
    notes: Object.freeze([...reasons]),
  });

  if (!review.ok || !review.packet) {
    return Object.freeze({
      ...baseEntry(inventoryEntry),
      state: 'invalid',
      reasons: Object.freeze(['AUTOMATED_REVIEW_PACKET_CREATION_FAILED', ...review.issues]),
      reviewPacket: null,
      reviewDigest: null,
      promotionAllowed: false,
      importAllowed: false,
      registryMutation: false,
      publicAuthority: false,
    });
  }

  return Object.freeze({
    ...baseEntry(inventoryEntry),
    state: 'needs_research',
    reasons: Object.freeze(reasons),
    reviewPacket: review.packet,
    reviewDigest: review.packet.reviewDigest,
    promotionAllowed: false,
    importAllowed: false,
    registryMutation: false,
    publicAuthority: false,
  });
}

function baseEntry(entry: MarketProfileCandidateInventory['entries'][number]) {
  return {
    exchangeId: entry.exchangeId,
    countryCode: entry.countryCode,
    candidateDigest: entry.candidateDigest,
    sourceCommitSha: entry.sourceCommitSha,
    taskId: entry.taskId,
    inventoryState: entry.state,
  } as const;
}

export function buildMarketProfileReviewPreflight(
  request: MarketProfileReviewPreflightRequest,
): MarketProfileReviewPreflight {
  if (!hasText(request.preflightId)) throw new Error('preflightId is required.');
  const inventoryValidation = validateMarketProfileCandidateInventory(request.inventory);
  if (!inventoryValidation.ok) throw new Error(`Inventory invalid: ${inventoryValidation.issues.join(',')}`);
  if (!strictUtcSecond(request.reviewedAt)) throw new Error('Explicit strict UTC-second reviewedAt is required.');
  const reviewedAtMs = Date.parse(request.reviewedAt);
  if (reviewedAtMs < Date.parse(request.inventory.evaluatedAt)) throw new Error('reviewedAt cannot predate inventory evaluation.');

  const sources = sourceMap(request.sources);
  const entries = request.inventory.entries.map((entry) => buildEntry(
    entry,
    sources.get(`${entry.exchangeId}:${entry.countryCode}`),
    reviewedAtMs,
    request.reviewedAt,
  ));

  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_REVIEW_PREFLIGHT_VERSION,
    preflightId: request.preflightId,
    inventoryDigest: request.inventory.inventoryDigest,
    inventoryEvaluatedAt: request.inventory.evaluatedAt,
    reviewedAt: request.reviewedAt,
    reviewerId: AUTOMATED_MARKET_PROFILE_REVIEWER_ID,
    entries: Object.freeze(entries),
  });
  return Object.freeze({ ...base, preflightDigest: computeMarketProfileReviewPreflightDigest(base) });
}

export function validateMarketProfileReviewPreflight(
  preflight: MarketProfileReviewPreflight,
  inventory: MarketProfileCandidateInventory,
  sources: readonly CandidateInventorySource[],
): MarketProfileReviewPreflightValidation {
  const issues: string[] = [];
  if (!preflight || typeof preflight !== 'object') return { ok: false, issues: Object.freeze(['PREFLIGHT_NOT_OBJECT']) };
  if (preflight.schemaVersion !== MARKET_PROFILE_REVIEW_PREFLIGHT_VERSION) issues.push('PREFLIGHT_SCHEMA_INVALID');
  if (!hasText(preflight.preflightId)) issues.push('PREFLIGHT_ID_INVALID');
  if (preflight.inventoryDigest !== inventory.inventoryDigest) issues.push('PREFLIGHT_INVENTORY_DIGEST_MISMATCH');
  if (preflight.inventoryEvaluatedAt !== inventory.evaluatedAt) issues.push('PREFLIGHT_INVENTORY_TIME_MISMATCH');
  if (!strictUtcSecond(preflight.reviewedAt)) issues.push('PREFLIGHT_REVIEW_TIME_INVALID');
  if (preflight.reviewerId !== AUTOMATED_MARKET_PROFILE_REVIEWER_ID) issues.push('PREFLIGHT_REVIEWER_INVALID');
  if (!DIGEST.test(preflight.preflightDigest ?? '')) issues.push('PREFLIGHT_DIGEST_INVALID');
  if (!Array.isArray(preflight.entries) || preflight.entries.length !== inventory.entries.length) issues.push('PREFLIGHT_ENTRY_COUNT_INVALID');

  if (issues.length === 0) {
    let rebuilt: MarketProfileReviewPreflight;
    try {
      rebuilt = buildMarketProfileReviewPreflight({
        preflightId: preflight.preflightId,
        inventory,
        sources,
        reviewedAt: preflight.reviewedAt,
      });
      if (canonicalize(rebuilt) !== canonicalize(preflight)) issues.push('PREFLIGHT_RECOMPUTE_MISMATCH');
    } catch {
      issues.push('PREFLIGHT_RECOMPUTE_FAILED');
    }
  }

  if (Array.isArray(preflight.entries)) {
    const map = sourceMap(sources);
    for (const entry of preflight.entries) {
      if (entry.promotionAllowed !== false || entry.importAllowed !== false || entry.registryMutation !== false || entry.publicAuthority !== false) {
        issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_AUTHORITY_LEAK`);
      }
      if (entry.reviewPacket) {
        const source = map.get(`${entry.exchangeId}:${entry.countryCode}`);
        if (!source) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_SOURCE_MISSING`);
        else {
          const validation = validateMarketProfileCandidateReviewPacket(entry.reviewPacket, source.candidate, {
            candidateDigest: source.candidate.candidateDigest,
            sourceCommitSha: source.candidate.source.sourceCommitSha,
            taskId: source.candidate.source.taskId,
            exchangeId: source.candidate.source.exchangeId,
            countryCode: source.candidate.source.countryCode,
          });
          if (!validation.ok) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_REVIEW_PACKET_INVALID`);
          if (entry.reviewPacket.reviewerId !== AUTOMATED_MARKET_PROFILE_REVIEWER_ID) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_REVIEWER_IMPERSONATION`);
          if (entry.reviewPacket.decision !== 'needs_research') issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_AUTOMATED_DECISION_ESCALATED`);
          if (entry.reviewDigest !== entry.reviewPacket.reviewDigest) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_REVIEW_DIGEST_MISMATCH`);
        }
      } else if (entry.reviewDigest !== null) {
        issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_ORPHAN_REVIEW_DIGEST`);
      }
    }
  }

  const { preflightDigest, ...withoutDigest } = preflight;
  if (computeMarketProfileReviewPreflightDigest(withoutDigest) !== preflightDigest) issues.push('PREFLIGHT_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: preflight };
}
