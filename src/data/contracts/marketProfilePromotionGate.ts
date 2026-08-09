import {
  validateMarketProfileCandidateReviewPacket,
  type CandidateReviewScope,
  type MarketProfileCandidateReviewPacket,
} from './marketProfileCandidateReview';
import type { CountryMarketProfileV1Candidate } from './researchToMarketProfileV1Bridge';

export const MARKET_PROFILE_PROMOTION_GATE_VERSION = 1 as const;
export const MARKET_PROFILE_PROMOTION_RECEIPT_VERSION = 1 as const;
export const MARKET_PROFILE_PROMOTION_AUTHORIZATION_TYPE = 'MARKETPROFILE_SEPARATE_IMPORT_REVIEW' as const;

const SHA40 = /^[a-f0-9]{40}$/;
const CANDIDATE_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const REVIEW_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const RECEIPT_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRICT_UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export interface PromotionAuthoritySnapshot {
  researchImportAuthorized: boolean;
  stagingImportAuthorized: boolean;
  canonicalImportAuthorized: boolean;
  productionChangeAuthorized: boolean;
  productionBindingAuthorized: boolean;
  publicationAuthorized: boolean;
  masterChangeAuthorized: boolean;
}

export interface MarketProfilePromotionReceipt {
  schemaVersion: typeof MARKET_PROFILE_PROMOTION_RECEIPT_VERSION;
  authorizationType: typeof MARKET_PROFILE_PROMOTION_AUTHORIZATION_TYPE;
  receiptId: string;
  issuer: 'owner';
  candidateDigest: string;
  reviewDigest: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  issuedAt: string;
  expiresAt: string;
  decision: 'approved';
  authorizations: PromotionAuthoritySnapshot;
  receiptDigest: string;
}

export interface ExpectedPromotionScope {
  candidateDigest: string;
  reviewDigest: string;
  receiptDigest: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
}

export type PromotionGateState = 'ready_for_separate_import' | 'blocked' | 'invalid';

export interface MarketProfilePromotionGateDecision {
  schemaVersion: typeof MARKET_PROFILE_PROMOTION_GATE_VERSION;
  state: PromotionGateState;
  reasons: readonly string[];
  candidateDigest: string;
  reviewDigest: string;
  receiptDigest: string;
  readyForSeparateImport: boolean;
  importPerformed: false;
  registryMutation: false;
  publicAuthority: false;
}

export interface PromotionGateRequest {
  candidate: CountryMarketProfileV1Candidate;
  review: MarketProfileCandidateReviewPacket;
  receipt: MarketProfilePromotionReceipt;
  expected: ExpectedPromotionScope;
  now: number;
}

const AUTH_KEYS: readonly (keyof PromotionAuthoritySnapshot)[] = Object.freeze([
  'researchImportAuthorized',
  'stagingImportAuthorized',
  'canonicalImportAuthorized',
  'productionChangeAuthorized',
  'productionBindingAuthorized',
  'publicationAuthorized',
  'masterChangeAuthorized',
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
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function computeMarketProfilePromotionReceiptDigest(
  receipt: Omit<MarketProfilePromotionReceipt, 'receiptDigest'>,
): string {
  return `fnv1a64:${fnv1a64(canonicalize(receipt))}`;
}

function exactObjectKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function authShapeIssues(value: unknown, prefix: string): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${prefix}_NOT_OBJECT`];
  const record = value as Record<string, unknown>;
  if (!exactObjectKeys(record, AUTH_KEYS)) return [`${prefix}_KEYS_INVALID`];
  const issues: string[] = [];
  for (const key of AUTH_KEYS) {
    if (typeof record[key] !== 'boolean') issues.push(`${prefix}_${key}_NOT_BOOLEAN`);
  }
  return issues;
}

function allAuthoritiesTrue(value: PromotionAuthoritySnapshot): boolean {
  return AUTH_KEYS.every((key) => value[key] === true);
}

function receiptStructuralIssues(
  receipt: MarketProfilePromotionReceipt,
  expected: ExpectedPromotionScope,
): string[] {
  const issues: string[] = [];
  if (typeof receipt !== 'object' || receipt === null || Array.isArray(receipt)) return ['RECEIPT_NOT_OBJECT'];
  const allowed = [
    'schemaVersion', 'authorizationType', 'receiptId', 'issuer', 'candidateDigest', 'reviewDigest',
    'sourceCommitSha', 'taskId', 'exchangeId', 'countryCode', 'issuedAt', 'expiresAt', 'decision',
    'authorizations', 'receiptDigest',
  ];
  if (!exactObjectKeys(receipt, allowed)) issues.push('RECEIPT_KEYS_INVALID');
  if (receipt.schemaVersion !== MARKET_PROFILE_PROMOTION_RECEIPT_VERSION) issues.push('RECEIPT_SCHEMA_INVALID');
  if (receipt.authorizationType !== MARKET_PROFILE_PROMOTION_AUTHORIZATION_TYPE) issues.push('RECEIPT_TYPE_INVALID');
  if (!hasText(receipt.receiptId)) issues.push('RECEIPT_ID_INVALID');
  if (receipt.issuer !== 'owner') issues.push('RECEIPT_ISSUER_INVALID');
  if (!CANDIDATE_DIGEST.test(receipt.candidateDigest ?? '')) issues.push('RECEIPT_CANDIDATE_DIGEST_INVALID');
  if (!REVIEW_DIGEST.test(receipt.reviewDigest ?? '')) issues.push('RECEIPT_REVIEW_DIGEST_INVALID');
  if (!SHA40.test(receipt.sourceCommitSha ?? '')) issues.push('RECEIPT_SOURCE_SHA_INVALID');
  if (!hasText(receipt.taskId)) issues.push('RECEIPT_TASK_INVALID');
  if (!EXCHANGE.test(receipt.exchangeId ?? '')) issues.push('RECEIPT_EXCHANGE_INVALID');
  if (!COUNTRY.test(receipt.countryCode ?? '')) issues.push('RECEIPT_COUNTRY_INVALID');
  if (!strictUtcSecond(receipt.issuedAt)) issues.push('RECEIPT_ISSUED_AT_INVALID');
  if (!strictUtcSecond(receipt.expiresAt)) issues.push('RECEIPT_EXPIRES_AT_INVALID');
  if (receipt.decision !== 'approved') issues.push('RECEIPT_DECISION_INVALID');
  issues.push(...authShapeIssues(receipt.authorizations, 'RECEIPT_AUTH'));
  if (!RECEIPT_DIGEST.test(receipt.receiptDigest ?? '')) issues.push('RECEIPT_DIGEST_INVALID');

  if (receipt.candidateDigest !== expected.candidateDigest) issues.push('RECEIPT_CANDIDATE_BINDING_MISMATCH');
  if (receipt.reviewDigest !== expected.reviewDigest) issues.push('RECEIPT_REVIEW_BINDING_MISMATCH');
  if (receipt.receiptDigest !== expected.receiptDigest) issues.push('RECEIPT_EXPECTED_DIGEST_MISMATCH');
  if (receipt.sourceCommitSha !== expected.sourceCommitSha) issues.push('RECEIPT_SOURCE_BINDING_MISMATCH');
  if (receipt.taskId !== expected.taskId) issues.push('RECEIPT_TASK_BINDING_MISMATCH');
  if (receipt.exchangeId !== expected.exchangeId) issues.push('RECEIPT_EXCHANGE_BINDING_MISMATCH');
  if (receipt.countryCode !== expected.countryCode) issues.push('RECEIPT_COUNTRY_BINDING_MISMATCH');

  if (strictUtcSecond(receipt.issuedAt) && strictUtcSecond(receipt.expiresAt)
    && Date.parse(receipt.expiresAt) <= Date.parse(receipt.issuedAt)) issues.push('RECEIPT_WINDOW_INVALID');

  const { receiptDigest, ...withoutDigest } = receipt;
  if (computeMarketProfilePromotionReceiptDigest(withoutDigest) !== receiptDigest) issues.push('RECEIPT_DIGEST_MISMATCH');
  return [...new Set(issues)];
}

function baseDecision(
  state: PromotionGateState,
  reasons: readonly string[],
  expected: ExpectedPromotionScope,
): MarketProfilePromotionGateDecision {
  return Object.freeze({
    schemaVersion: MARKET_PROFILE_PROMOTION_GATE_VERSION,
    state,
    reasons: Object.freeze([...reasons]),
    candidateDigest: expected?.candidateDigest ?? '',
    reviewDigest: expected?.reviewDigest ?? '',
    receiptDigest: expected?.receiptDigest ?? '',
    readyForSeparateImport: state === 'ready_for_separate_import',
    importPerformed: false,
    registryMutation: false,
    publicAuthority: false,
  });
}

export function evaluateMarketProfilePromotionGate(
  request: PromotionGateRequest,
): MarketProfilePromotionGateDecision {
  const invalid: string[] = [];
  const blocked: string[] = [];
  const expected = request?.expected;
  const candidate = request?.candidate;
  const review = request?.review;
  const receipt = request?.receipt;

  if (!expected || !CANDIDATE_DIGEST.test(expected.candidateDigest ?? '')) invalid.push('EXPECTED_CANDIDATE_DIGEST_INVALID');
  if (!expected || !REVIEW_DIGEST.test(expected.reviewDigest ?? '')) invalid.push('EXPECTED_REVIEW_DIGEST_INVALID');
  if (!expected || !RECEIPT_DIGEST.test(expected.receiptDigest ?? '')) invalid.push('EXPECTED_RECEIPT_DIGEST_INVALID');
  if (!expected || !SHA40.test(expected.sourceCommitSha ?? '')) invalid.push('EXPECTED_SOURCE_SHA_INVALID');
  if (!expected || !hasText(expected.taskId)) invalid.push('EXPECTED_TASK_INVALID');
  if (!expected || !EXCHANGE.test(expected.exchangeId ?? '')) invalid.push('EXPECTED_EXCHANGE_INVALID');
  if (!expected || !COUNTRY.test(expected.countryCode ?? '')) invalid.push('EXPECTED_COUNTRY_INVALID');
  if (!Number.isFinite(request?.now)) invalid.push('CLOCK_INVALID');
  if (invalid.length > 0) return baseDecision('invalid', invalid, expected ?? ({} as ExpectedPromotionScope));

  const reviewScope: CandidateReviewScope = {
    candidateDigest: expected.candidateDigest,
    sourceCommitSha: expected.sourceCommitSha,
    taskId: expected.taskId,
    exchangeId: expected.exchangeId,
    countryCode: expected.countryCode,
  };
  const reviewValidation = validateMarketProfileCandidateReviewPacket(review, candidate, reviewScope);
  if (!reviewValidation.ok) invalid.push(...reviewValidation.issues.map((item) => `REVIEW_${item}`));
  if (review?.reviewDigest !== expected.reviewDigest) invalid.push('REVIEW_EXPECTED_DIGEST_MISMATCH');
  if (candidate?.candidateDigest !== expected.candidateDigest) invalid.push('CANDIDATE_EXPECTED_DIGEST_MISMATCH');
  if (candidate?.source?.sourceCommitSha !== expected.sourceCommitSha) invalid.push('CANDIDATE_SOURCE_MISMATCH');
  if (candidate?.source?.taskId !== expected.taskId) invalid.push('CANDIDATE_TASK_MISMATCH');
  if (candidate?.source?.exchangeId !== expected.exchangeId) invalid.push('CANDIDATE_EXCHANGE_MISMATCH');
  if (candidate?.source?.countryCode !== expected.countryCode) invalid.push('CANDIDATE_COUNTRY_MISMATCH');
  if (invalid.length > 0) return baseDecision('invalid', [...new Set(invalid)], expected);

  if (review.decision !== 'ready_for_promotion_review') blocked.push('REVIEW_NOT_READY_FOR_PROMOTION');

  invalid.push(...receiptStructuralIssues(receipt, expected));
  if (invalid.length > 0) return baseDecision('invalid', [...new Set(invalid)], expected);

  const issuedMs = Date.parse(receipt.issuedAt);
  const expiresMs = Date.parse(receipt.expiresAt);
  if (request.now < issuedMs) blocked.push('RECEIPT_NOT_YET_VALID');
  if (request.now >= expiresMs) blocked.push('RECEIPT_EXPIRED');
  if (!allAuthoritiesTrue(receipt.authorizations)) blocked.push('RECEIPT_AUTHORIZATION_INCOMPLETE');

  const sourceAuth = candidate.source.authorizations as PromotionAuthoritySnapshot;
  const sourceAuthIssues = authShapeIssues(sourceAuth, 'SOURCE_AUTH');
  if (sourceAuthIssues.length > 0) return baseDecision('invalid', sourceAuthIssues, expected);
  const sourceAllTrue = allAuthoritiesTrue(sourceAuth);
  if (candidate.authorizationCeilingAllowsLaterPromotion !== sourceAllTrue) {
    return baseDecision('invalid', ['SOURCE_AUTHORIZATION_CEILING_TAMPERED'], expected);
  }
  if (!sourceAllTrue) blocked.push('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE');

  if (blocked.length > 0) return baseDecision('blocked', [...new Set(blocked)], expected);
  return baseDecision('ready_for_separate_import', [], expected);
}
