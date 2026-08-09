import {
  buildCountryMarketProfileV1Candidate,
  type CountryMarketProfileV1Candidate,
  type ExpectedResearchSource,
  type ResearchBridgeRequest,
  type ResearchMarketProfilePacket,
} from './researchToMarketProfileV1Bridge';

export const MARKET_PROFILE_CANDIDATE_BUNDLE_SCHEMA_VERSION = 1 as const;

const SHA40 = /^[a-f0-9]{40}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANDIDATE_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const BUNDLE_DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;

export interface MarketProfileCandidateBundleEntry {
  expected: ExpectedResearchSource;
  packet: ResearchMarketProfilePacket;
  candidate: CountryMarketProfileV1Candidate;
}

export interface MarketProfileCandidateBundle {
  schemaVersion: typeof MARKET_PROFILE_CANDIDATE_BUNDLE_SCHEMA_VERSION;
  bundleId: string;
  researchSnapshotSha: string;
  countryCode: string;
  entries: readonly MarketProfileCandidateBundleEntry[];
  bundleDigest: string;
}

export interface MarketProfileCandidateBundleBuildInput {
  bundleId: string;
  researchSnapshotSha: string;
  countryCode: string;
  requests: readonly ResearchBridgeRequest[];
}

export type MarketProfileCandidateBundleValidation =
  | { ok: true; value: MarketProfileCandidateBundle }
  | { ok: false; issues: readonly string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

export function computeMarketProfileCandidateBundleDigest(
  bundle: Omit<MarketProfileCandidateBundle, 'bundleDigest'>,
): string {
  return `fnv1a64:${fnv1a64(canonicalize(bundle))}`;
}

function bindingIssues(value: unknown, prefix: string): string[] {
  if (!Array.isArray(value) || value.length === 0) return [`${prefix}_EMPTY`];
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isObject(item) || !hasText(item.path) || !SHA256.test(String(item.digest ?? ''))) {
      issues.push(`${prefix}_INVALID`);
      continue;
    }
    const path = String(item.path);
    if (path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
      issues.push(`${prefix}_PATH_INVALID`);
    }
    if (seen.has(path)) issues.push(`${prefix}_DUPLICATE_PATH`);
    seen.add(path);
  }
  return issues;
}

function allTrueCandidateCeiling(candidate: CountryMarketProfileV1Candidate): boolean {
  const a = candidate.source.authorizations;
  return a.researchImportAuthorized
    && a.stagingImportAuthorized
    && a.canonicalImportAuthorized
    && a.productionChangeAuthorized
    && a.productionBindingAuthorized
    && a.publicationAuthorized
    && a.masterChangeAuthorized;
}

export function createMarketProfileCandidateBundle(
  input: MarketProfileCandidateBundleBuildInput,
): MarketProfileCandidateBundle {
  if (!hasText(input.bundleId)) throw new Error('bundleId is required.');
  if (!SHA40.test(input.researchSnapshotSha)) throw new Error('researchSnapshotSha must be an exact 40-char SHA.');
  if (!COUNTRY.test(input.countryCode)) throw new Error('countryCode must be uppercase alpha-2.');
  if (!Array.isArray(input.requests) || input.requests.length === 0) throw new Error('At least one bridge request is required.');

  const seenPairs = new Set<string>();
  const entries = input.requests.map((request): MarketProfileCandidateBundleEntry => {
    const source = request.packet?.provenance;
    if (!source || request.expected.sourceCommitSha !== input.researchSnapshotSha || source.sourceCommitSha !== input.researchSnapshotSha) {
      throw new Error('Every request must bind the exact bundle research snapshot.');
    }
    if (source.countryCode !== input.countryCode || request.expected.countryCode !== input.countryCode) {
      throw new Error('Every request must bind the bundle country.');
    }
    const pair = `${source.exchangeId}:${source.countryCode}`;
    if (seenPairs.has(pair)) throw new Error(`Duplicate Exchange×Country pair: ${pair}`);
    seenPairs.add(pair);

    const candidate = buildCountryMarketProfileV1Candidate(request);
    if (candidate.state === 'invalid') {
      throw new Error(`Cannot materialize invalid candidate ${pair}: ${candidate.validationIssues.join(',')}`);
    }
    return Object.freeze({ expected: request.expected, packet: request.packet, candidate });
  });

  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
    bundleId: input.bundleId,
    researchSnapshotSha: input.researchSnapshotSha,
    countryCode: input.countryCode,
    entries: Object.freeze(entries),
  });
  return Object.freeze({
    ...base,
    bundleDigest: computeMarketProfileCandidateBundleDigest(base),
  });
}

export function validateMarketProfileCandidateBundle(input: unknown): MarketProfileCandidateBundleValidation {
  const issues: string[] = [];
  if (!isObject(input)) return { ok: false, issues: Object.freeze(['BUNDLE_NOT_OBJECT']) };

  const bundle = input as unknown as MarketProfileCandidateBundle;
  if (bundle.schemaVersion !== MARKET_PROFILE_CANDIDATE_BUNDLE_SCHEMA_VERSION) issues.push('BUNDLE_SCHEMA_INVALID');
  if (!hasText(bundle.bundleId)) issues.push('BUNDLE_ID_INVALID');
  if (!SHA40.test(bundle.researchSnapshotSha ?? '')) issues.push('BUNDLE_RESEARCH_SHA_INVALID');
  if (!COUNTRY.test(bundle.countryCode ?? '')) issues.push('BUNDLE_COUNTRY_INVALID');
  if (!BUNDLE_DIGEST.test(bundle.bundleDigest ?? '')) issues.push('BUNDLE_DIGEST_INVALID');
  if (!Array.isArray(bundle.entries) || bundle.entries.length === 0) issues.push('BUNDLE_ENTRIES_EMPTY');
  if (issues.length > 0) return { ok: false, issues: Object.freeze([...new Set(issues)]) };

  const seenPairs = new Set<string>();
  for (const [index, entry] of bundle.entries.entries()) {
    const prefix = `ENTRY_${index}`;
    if (!entry || !isObject(entry.expected) || !isObject(entry.packet) || !isObject(entry.candidate)) {
      issues.push(`${prefix}_SHAPE_INVALID`);
      continue;
    }
    const expected = entry.expected;
    const packet = entry.packet;
    const source = packet.provenance;
    const candidate = entry.candidate;

    if (!SHA40.test(expected.sourceCommitSha ?? '') || expected.sourceCommitSha !== bundle.researchSnapshotSha) issues.push(`${prefix}_EXPECTED_SOURCE_SHA_MISMATCH`);
    if (!source || source.sourceCommitSha !== bundle.researchSnapshotSha) issues.push(`${prefix}_PACKET_SOURCE_SHA_MISMATCH`);
    if (expected.countryCode !== bundle.countryCode || source?.countryCode !== bundle.countryCode) issues.push(`${prefix}_COUNTRY_MISMATCH`);
    if (!EXCHANGE.test(expected.exchangeId ?? '') || expected.exchangeId !== source?.exchangeId) issues.push(`${prefix}_EXCHANGE_MISMATCH`);
    if (!hasText(expected.taskId) || expected.taskId !== source?.taskId) issues.push(`${prefix}_TASK_MISMATCH`);
    issues.push(...bindingIssues(expected.artifactBindings, `${prefix}_EXPECTED_BINDINGS`));
    issues.push(...bindingIssues(source?.artifactBindings, `${prefix}_PACKET_BINDINGS`));

    const pair = `${expected.exchangeId}:${expected.countryCode}`;
    if (seenPairs.has(pair)) issues.push(`${prefix}_DUPLICATE_PAIR`);
    seenPairs.add(pair);

    if (!CANDIDATE_DIGEST.test(candidate.candidateDigest ?? '')) issues.push(`${prefix}_CANDIDATE_DIGEST_INVALID`);
    if (candidate.state === 'invalid') issues.push(`${prefix}_INVALID_CANDIDATE_MATERIALIZED`);
    if (candidate.importable !== false) issues.push(`${prefix}_IMPORTABLE_MUST_BE_FALSE`);
    if (candidate.publicAuthority !== false) issues.push(`${prefix}_PUBLIC_AUTHORITY_MUST_BE_FALSE`);
    if (candidate.authorizationCeilingAllowsLaterPromotion !== allTrueCandidateCeiling(candidate)) issues.push(`${prefix}_AUTHORIZATION_CEILING_MISMATCH`);
    if (candidate.proposedProfile) {
      if (candidate.proposedProfile.approval !== 'draft') issues.push(`${prefix}_PROFILE_NOT_DRAFT`);
      if (candidate.proposedProfile.offerEligibility !== 'under_review') issues.push(`${prefix}_OFFER_NOT_UNDER_REVIEW`);
    }

    const recomputed = buildCountryMarketProfileV1Candidate({ expected, packet });
    if (canonicalize(recomputed) !== canonicalize(candidate)) issues.push(`${prefix}_CANDIDATE_RECOMPUTE_MISMATCH`);
  }

  const { bundleDigest, ...withoutDigest } = bundle;
  if (computeMarketProfileCandidateBundleDigest(withoutDigest) !== bundleDigest) issues.push('BUNDLE_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: bundle };
}
