import type { CountryMarketProfileV1Candidate } from './researchToMarketProfileV1Bridge';

export const MARKET_PROFILE_CANDIDATE_INVENTORY_VERSION = 1 as const;

const CANDIDATE_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const INVENTORY_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA40 = /^[a-f0-9]{40}$/;
const STRICT_UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export type CandidateProvenanceClass =
  | 'modern_research_main'
  | 'legacy_portal_review_master'
  | 'legacy_research_pilot_main';

export type CandidateInventoryState =
  | 'reviewable'
  | 'stale_review_required'
  | 'blocked'
  | 'invalid';

export interface CandidateInventorySource {
  exchangeId: string;
  countryCode: string;
  provenanceClass: CandidateProvenanceClass;
  candidate: CountryMarketProfileV1Candidate;
}

export interface MarketProfileCandidateInventoryEntry {
  exchangeId: string;
  countryCode: string;
  provenanceClass: CandidateProvenanceClass;
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  candidateState: CountryMarketProfileV1Candidate['state'];
  lastCheckedAt: string;
  nextReviewAt: string;
  state: CandidateInventoryState;
  reasons: readonly string[];
  unresolvedDimensions: readonly string[];
  unresolvedDimensionCount: number;
  reviewAllowed: boolean;
  promotionAllowed: false;
  importAllowed: false;
  registryMutation: false;
  publicAuthority: false;
}

export interface MarketProfileCandidateInventory {
  schemaVersion: typeof MARKET_PROFILE_CANDIDATE_INVENTORY_VERSION;
  inventoryId: string;
  evaluatedAt: string;
  entries: readonly MarketProfileCandidateInventoryEntry[];
  inventoryDigest: string;
}

export interface CandidateInventoryBuildRequest {
  inventoryId: string;
  now: number;
  sources: readonly CandidateInventorySource[];
}

export type CandidateInventoryValidation =
  | { ok: true; value: MarketProfileCandidateInventory }
  | { ok: false; issues: readonly string[] };

const EXPECTED_PAIRS = Object.freeze([
  'binance:PL',
  'bybit:PL',
  'okx:PL',
  'binance:KZ',
  'bybit:KZ',
  'okx:KZ',
]);

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

export function recomputeCountryMarketProfileV1CandidateDigest(
  candidate: CountryMarketProfileV1Candidate,
): string {
  const { candidateDigest: _candidateDigest, ...withoutDigest } = candidate;
  return `fnv1a64:${fnv1a64(canonicalize(withoutDigest))}`;
}

export function computeMarketProfileCandidateInventoryDigest(
  inventory: Omit<MarketProfileCandidateInventory, 'inventoryDigest'>,
): string {
  return `fnv1a64:${fnv1a64(canonicalize(inventory))}`;
}

function expectedProvenanceClass(candidate: CountryMarketProfileV1Candidate): CandidateProvenanceClass | null {
  const state = candidate.source?.researchState ?? '';
  if (state === 'RESEARCH_RECORD_MERGED_TO_MAIN' && candidate.source.sourceBranch === 'main') return 'modern_research_main';
  if (state.startsWith('LEGACY_GOVERNED:portal_review_master:') && candidate.source.sourceBranch === 'master') return 'legacy_portal_review_master';
  if (state.startsWith('LEGACY_GOVERNED:research_pilot_main:') && candidate.source.sourceBranch === 'main') return 'legacy_research_pilot_main';
  return null;
}

function sourceIssues(source: CandidateInventorySource): string[] {
  const issues: string[] = [];
  const candidate = source?.candidate;
  if (!EXCHANGE.test(source?.exchangeId ?? '')) issues.push('EXCHANGE_INVALID');
  if (!COUNTRY.test(source?.countryCode ?? '')) issues.push('COUNTRY_INVALID');
  if (!candidate || typeof candidate !== 'object') return [...issues, 'CANDIDATE_MISSING'];
  if (!CANDIDATE_DIGEST.test(candidate.candidateDigest ?? '')) issues.push('CANDIDATE_DIGEST_INVALID');
  else if (recomputeCountryMarketProfileV1CandidateDigest(candidate) !== candidate.candidateDigest) issues.push('CANDIDATE_DIGEST_MISMATCH');
  if (candidate.source.exchangeId !== source.exchangeId) issues.push('CANDIDATE_EXCHANGE_MISMATCH');
  if (candidate.source.countryCode !== source.countryCode) issues.push('CANDIDATE_COUNTRY_MISMATCH');
  if (!SHA40.test(candidate.source.sourceCommitSha ?? '')) issues.push('SOURCE_COMMIT_INVALID');
  if (!hasText(candidate.source.taskId)) issues.push('TASK_ID_INVALID');
  if (!strictUtcSecond(candidate.source.lastCheckedAt)) issues.push('LAST_CHECKED_INVALID');
  if (!strictUtcSecond(candidate.source.nextReviewAt)) issues.push('NEXT_REVIEW_INVALID');
  if (strictUtcSecond(candidate.source.lastCheckedAt) && strictUtcSecond(candidate.source.nextReviewAt)
    && Date.parse(candidate.source.nextReviewAt) <= Date.parse(candidate.source.lastCheckedAt)) issues.push('REVIEW_WINDOW_INVALID');
  if (candidate.importable !== false) issues.push('CANDIDATE_IMPORTABLE_TRUE');
  if (candidate.publicAuthority !== false) issues.push('CANDIDATE_PUBLIC_AUTHORITY_TRUE');
  const inferred = expectedProvenanceClass(candidate);
  if (!inferred) issues.push('PROVENANCE_CLASS_UNRECOGNIZED');
  else if (inferred !== source.provenanceClass) issues.push('PROVENANCE_CLASS_MISMATCH');
  if (candidate.state === 'candidate') {
    if (!candidate.proposedProfile) issues.push('CANDIDATE_PROFILE_MISSING');
    else {
      if (candidate.proposedProfile.exchangeId !== source.exchangeId) issues.push('PROFILE_EXCHANGE_MISMATCH');
      if (candidate.proposedProfile.countryCode !== source.countryCode) issues.push('PROFILE_COUNTRY_MISMATCH');
      if (candidate.proposedProfile.approval !== 'draft') issues.push('PROFILE_NOT_DRAFT');
      if (candidate.proposedProfile.offerEligibility !== 'under_review') issues.push('PROFILE_OFFER_NOT_UNDER_REVIEW');
    }
  }
  if (candidate.state === 'blocked' && candidate.proposedProfile !== null) issues.push('BLOCKED_PROFILE_NOT_NULL');
  if (!Array.isArray(candidate.unresolvedDimensions) || !candidate.unresolvedDimensions.every(hasText)) issues.push('UNRESOLVED_DIMENSIONS_INVALID');
  return [...new Set(issues)];
}

function classifySource(source: CandidateInventorySource, now: number): MarketProfileCandidateInventoryEntry {
  const candidate = source.candidate;
  const issues = sourceIssues(source);
  let state: CandidateInventoryState;
  const reasons: string[] = [];

  if (issues.length > 0 || candidate.state === 'invalid') {
    state = 'invalid';
    reasons.push(...issues);
    if (candidate.state === 'invalid') reasons.push('CANDIDATE_STATE_INVALID');
  } else if (candidate.state === 'blocked') {
    state = 'blocked';
    reasons.push('CANDIDATE_BLOCKED');
  } else if (Date.parse(candidate.source.nextReviewAt) <= now) {
    state = 'stale_review_required';
    reasons.push('SOURCE_REVIEW_OVERDUE');
  } else {
    state = 'reviewable';
    reasons.push('SOURCE_REVIEW_WINDOW_CURRENT');
  }

  return Object.freeze({
    exchangeId: source.exchangeId,
    countryCode: source.countryCode,
    provenanceClass: source.provenanceClass,
    candidateDigest: candidate.candidateDigest,
    sourceCommitSha: candidate.source.sourceCommitSha,
    taskId: candidate.source.taskId,
    candidateState: candidate.state,
    lastCheckedAt: candidate.source.lastCheckedAt,
    nextReviewAt: candidate.source.nextReviewAt,
    state,
    reasons: Object.freeze([...new Set(reasons)]),
    unresolvedDimensions: Object.freeze([...candidate.unresolvedDimensions]),
    unresolvedDimensionCount: candidate.unresolvedDimensions.length,
    reviewAllowed: state === 'reviewable',
    promotionAllowed: false,
    importAllowed: false,
    registryMutation: false,
    publicAuthority: false,
  });
}

export function buildMarketProfileCandidateInventory(
  request: CandidateInventoryBuildRequest,
): MarketProfileCandidateInventory {
  if (!hasText(request.inventoryId)) throw new Error('inventoryId is required.');
  if (!Number.isFinite(request.now)) throw new Error('Explicit finite inventory clock is required.');
  if (!Array.isArray(request.sources) || request.sources.length !== EXPECTED_PAIRS.length) {
    throw new Error(`Exactly ${EXPECTED_PAIRS.length} candidate sources are required.`);
  }

  const pairs = request.sources.map((source) => `${source.exchangeId}:${source.countryCode}`);
  if (new Set(pairs).size !== pairs.length) throw new Error('Duplicate Exchange×Country candidate source.');
  if (JSON.stringify([...pairs].sort()) !== JSON.stringify([...EXPECTED_PAIRS].sort())) {
    throw new Error('Candidate inventory pair set is incomplete or unexpected.');
  }

  const entries = request.sources.map((source) => classifySource(source, request.now));
  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_CANDIDATE_INVENTORY_VERSION,
    inventoryId: request.inventoryId,
    evaluatedAt: new Date(request.now).toISOString().replace('.000Z', 'Z'),
    entries: Object.freeze(entries),
  });
  return Object.freeze({ ...base, inventoryDigest: computeMarketProfileCandidateInventoryDigest(base) });
}

export function validateMarketProfileCandidateInventory(
  inventory: MarketProfileCandidateInventory,
): CandidateInventoryValidation {
  const issues: string[] = [];
  if (!inventory || typeof inventory !== 'object') return { ok: false, issues: Object.freeze(['INVENTORY_NOT_OBJECT']) };
  if (inventory.schemaVersion !== MARKET_PROFILE_CANDIDATE_INVENTORY_VERSION) issues.push('INVENTORY_SCHEMA_INVALID');
  if (!hasText(inventory.inventoryId)) issues.push('INVENTORY_ID_INVALID');
  if (!strictUtcSecond(inventory.evaluatedAt)) issues.push('INVENTORY_EVALUATED_AT_INVALID');
  if (!INVENTORY_DIGEST.test(inventory.inventoryDigest ?? '')) issues.push('INVENTORY_DIGEST_INVALID');
  if (!Array.isArray(inventory.entries) || inventory.entries.length !== EXPECTED_PAIRS.length) issues.push('INVENTORY_ENTRY_COUNT_INVALID');

  if (Array.isArray(inventory.entries)) {
    const pairs = inventory.entries.map((entry) => `${entry.exchangeId}:${entry.countryCode}`);
    if (new Set(pairs).size !== pairs.length) issues.push('INVENTORY_DUPLICATE_PAIR');
    if (JSON.stringify([...pairs].sort()) !== JSON.stringify([...EXPECTED_PAIRS].sort())) issues.push('INVENTORY_PAIR_SET_INVALID');
    for (const entry of inventory.entries) {
      if (!CANDIDATE_DIGEST.test(entry.candidateDigest ?? '')) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_DIGEST_INVALID`);
      if (!SHA40.test(entry.sourceCommitSha ?? '')) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_SOURCE_SHA_INVALID`);
      if (!hasText(entry.taskId)) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_TASK_INVALID`);
      if (!strictUtcSecond(entry.lastCheckedAt) || !strictUtcSecond(entry.nextReviewAt)) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_TIME_INVALID`);
      if (!['reviewable', 'stale_review_required', 'blocked', 'invalid'].includes(entry.state)) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_STATE_INVALID`);
      if (entry.reviewAllowed !== (entry.state === 'reviewable')) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_REVIEW_FLAG_MISMATCH`);
      if (entry.promotionAllowed !== false || entry.importAllowed !== false || entry.registryMutation !== false || entry.publicAuthority !== false) {
        issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_AUTHORITY_LEAK`);
      }
      if (entry.unresolvedDimensionCount !== entry.unresolvedDimensions.length) issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_UNRESOLVED_COUNT_MISMATCH`);
    }
  }

  const { inventoryDigest, ...withoutDigest } = inventory;
  if (computeMarketProfileCandidateInventoryDigest(withoutDigest) !== inventoryDigest) issues.push('INVENTORY_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: inventory };
}
