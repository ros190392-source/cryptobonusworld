import { validateCountryMarketProfileV1 } from './marketProfileV1';
import type { CountryMarketProfileV1Candidate } from './researchToMarketProfileV1Bridge';

export const MARKET_PROFILE_CANDIDATE_REVIEW_VERSION = 1 as const;

const SHA40 = /^[a-f0-9]{40}$/;
const CANDIDATE_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const REVIEW_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CandidateReviewDecision =
  | 'ready_for_promotion_review'
  | 'needs_research'
  | 'rejected';

export interface CandidateReviewScope {
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
}

export interface CandidateReviewRequest {
  expected: CandidateReviewScope;
  candidate: CountryMarketProfileV1Candidate;
  reviewerId: string;
  reviewedAt: string;
  decision: CandidateReviewDecision;
  notes: readonly string[];
}

export interface MarketProfileCandidateReviewPacket {
  schemaVersion: typeof MARKET_PROFILE_CANDIDATE_REVIEW_VERSION;
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  proposedProfileId: string;
  unresolvedDimensions: readonly string[];
  limitations: readonly string[];
  reviewerId: string;
  reviewedAt: string;
  decision: CandidateReviewDecision;
  notes: readonly string[];
  promotionAuthorized: false;
  importAuthorized: false;
  publicAuthority: false;
  reviewDigest: string;
}

export type CandidateReviewResult =
  | { ok: true; packet: MarketProfileCandidateReviewPacket; issues: readonly [] }
  | { ok: false; packet: null; issues: readonly string[] };

export type CandidateReviewPacketValidation =
  | { ok: true; issues: readonly [] }
  | { ok: false; issues: readonly string[] };

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function validUniqueTextArray(value: unknown): value is readonly string[] {
  return Array.isArray(value)
    && value.every(hasText)
    && new Set(value).size === value.length;
}

function sameOrderedStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
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
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

function packetWithoutDigest(packet: Omit<MarketProfileCandidateReviewPacket, 'reviewDigest'>): string {
  return `fnv1a64:${fnv1a64(canonicalize(packet))}`;
}

function candidateIssues(candidate: CountryMarketProfileV1Candidate, expected: CandidateReviewScope): string[] {
  const issues: string[] = [];
  if (!candidate || candidate.state !== 'candidate') issues.push('CANDIDATE_STATE_NOT_REVIEWABLE');
  if (!CANDIDATE_DIGEST.test(candidate?.candidateDigest ?? '')) issues.push('INVALID_CANDIDATE_DIGEST');
  if (candidate?.candidateDigest !== expected.candidateDigest) issues.push('CANDIDATE_DIGEST_MISMATCH');
  if (!SHA40.test(expected.sourceCommitSha)) issues.push('INVALID_EXPECTED_SOURCE_SHA');
  if (!COUNTRY.test(expected.countryCode)) issues.push('INVALID_EXPECTED_COUNTRY');
  if (!EXCHANGE.test(expected.exchangeId)) issues.push('INVALID_EXPECTED_EXCHANGE');
  if (!hasText(expected.taskId)) issues.push('INVALID_EXPECTED_TASK');

  const source = candidate?.source;
  if (!source || source.sourceCommitSha !== expected.sourceCommitSha) issues.push('SOURCE_COMMIT_MISMATCH');
  if (!source || source.taskId !== expected.taskId) issues.push('TASK_ID_MISMATCH');
  if (!source || source.exchangeId !== expected.exchangeId) issues.push('EXCHANGE_ID_MISMATCH');
  if (!source || source.countryCode !== expected.countryCode) issues.push('COUNTRY_CODE_MISMATCH');

  if (candidate?.importable !== false) issues.push('CANDIDATE_IMPORTABLE_NOT_FALSE');
  if (candidate?.publicAuthority !== false) issues.push('CANDIDATE_PUBLIC_AUTHORITY_NOT_FALSE');
  if (!candidate?.proposedProfile) {
    issues.push('MISSING_PROPOSED_PROFILE');
  } else {
    const profile = candidate.proposedProfile;
    if (!validateCountryMarketProfileV1(profile).ok) issues.push('INVALID_V1_PROFILE');
    if (profile.approval !== 'draft') issues.push('PROFILE_NOT_DRAFT');
    if (profile.offerEligibility !== 'under_review') issues.push('OFFER_NOT_UNDER_REVIEW');
    if (profile.exchangeId !== expected.exchangeId) issues.push('PROFILE_EXCHANGE_MISMATCH');
    if (profile.countryCode !== expected.countryCode) issues.push('PROFILE_COUNTRY_MISMATCH');
  }

  if (!validUniqueTextArray(candidate?.unresolvedDimensions)) issues.push('INVALID_UNRESOLVED_DIMENSIONS');
  if (!validUniqueTextArray(candidate?.limitations)) issues.push('INVALID_LIMITATIONS');
  return [...new Set(issues)];
}

export function createMarketProfileCandidateReview(
  request: CandidateReviewRequest,
): CandidateReviewResult {
  const issues = candidateIssues(request?.candidate, request?.expected);
  if (!hasText(request?.reviewerId)) issues.push('INVALID_REVIEWER');
  if (!validDate(request?.reviewedAt)) issues.push('INVALID_REVIEWED_AT');
  if (!['ready_for_promotion_review', 'needs_research', 'rejected'].includes(request?.decision as string)) {
    issues.push('INVALID_REVIEW_DECISION');
  }
  if (!validUniqueTextArray(request?.notes)) issues.push('INVALID_REVIEW_NOTES');
  if (issues.length > 0) return { ok: false, packet: null, issues: Object.freeze([...new Set(issues)]) };

  const candidate = request.candidate;
  const profile = candidate.proposedProfile!;
  const base: Omit<MarketProfileCandidateReviewPacket, 'reviewDigest'> = {
    schemaVersion: MARKET_PROFILE_CANDIDATE_REVIEW_VERSION,
    candidateDigest: candidate.candidateDigest,
    sourceCommitSha: candidate.source.sourceCommitSha,
    taskId: candidate.source.taskId,
    exchangeId: candidate.source.exchangeId,
    countryCode: candidate.source.countryCode,
    proposedProfileId: profile.profileId,
    unresolvedDimensions: Object.freeze([...candidate.unresolvedDimensions]),
    limitations: Object.freeze([...candidate.limitations]),
    reviewerId: request.reviewerId.trim(),
    reviewedAt: new Date(request.reviewedAt).toISOString(),
    decision: request.decision,
    notes: Object.freeze([...request.notes]),
    promotionAuthorized: false,
    importAuthorized: false,
    publicAuthority: false,
  };
  return {
    ok: true,
    packet: Object.freeze({ ...base, reviewDigest: packetWithoutDigest(base) }),
    issues: Object.freeze([]),
  };
}

export function validateMarketProfileCandidateReviewPacket(
  packet: unknown,
  candidate: CountryMarketProfileV1Candidate,
  expected: CandidateReviewScope,
): CandidateReviewPacketValidation {
  const issues = candidateIssues(candidate, expected);
  if (typeof packet !== 'object' || packet === null || Array.isArray(packet)) {
    return { ok: false, issues: Object.freeze([...issues, 'REVIEW_PACKET_NOT_OBJECT']) };
  }
  const value = packet as MarketProfileCandidateReviewPacket;
  if (value.schemaVersion !== MARKET_PROFILE_CANDIDATE_REVIEW_VERSION) issues.push('INVALID_REVIEW_SCHEMA_VERSION');
  if (!REVIEW_DIGEST.test(value.reviewDigest ?? '')) issues.push('INVALID_REVIEW_DIGEST');
  if (value.candidateDigest !== candidate.candidateDigest || value.candidateDigest !== expected.candidateDigest) issues.push('REVIEW_CANDIDATE_MISMATCH');
  if (value.sourceCommitSha !== expected.sourceCommitSha) issues.push('REVIEW_SOURCE_SHA_MISMATCH');
  if (value.taskId !== expected.taskId) issues.push('REVIEW_TASK_MISMATCH');
  if (value.exchangeId !== expected.exchangeId) issues.push('REVIEW_EXCHANGE_MISMATCH');
  if (value.countryCode !== expected.countryCode) issues.push('REVIEW_COUNTRY_MISMATCH');
  if (value.proposedProfileId !== candidate.proposedProfile?.profileId) issues.push('REVIEW_PROFILE_ID_MISMATCH');
  if (!validUniqueTextArray(value.unresolvedDimensions)
    || !sameOrderedStrings(value.unresolvedDimensions, candidate.unresolvedDimensions)) issues.push('REVIEW_UNRESOLVED_SNAPSHOT_MISMATCH');
  if (!validUniqueTextArray(value.limitations)
    || !sameOrderedStrings(value.limitations, candidate.limitations)) issues.push('REVIEW_LIMITATIONS_SNAPSHOT_MISMATCH');
  if (!hasText(value.reviewerId)) issues.push('INVALID_REVIEWER');
  if (!validDate(value.reviewedAt)) issues.push('INVALID_REVIEWED_AT');
  if (!['ready_for_promotion_review', 'needs_research', 'rejected'].includes(value.decision)) issues.push('INVALID_REVIEW_DECISION');
  if (!validUniqueTextArray(value.notes)) issues.push('INVALID_REVIEW_NOTES');
  if (value.promotionAuthorized !== false) issues.push('PROMOTION_AUTHORITY_NOT_FALSE');
  if (value.importAuthorized !== false) issues.push('IMPORT_AUTHORITY_NOT_FALSE');
  if (value.publicAuthority !== false) issues.push('PUBLIC_AUTHORITY_NOT_FALSE');

  const { reviewDigest, ...withoutDigest } = value;
  if (packetWithoutDigest(withoutDigest) !== reviewDigest) issues.push('REVIEW_DIGEST_MISMATCH');
  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, issues: Object.freeze([]) };
}
