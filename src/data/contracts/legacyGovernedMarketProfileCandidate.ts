import {
  COUNTRY_MARKET_PROFILE_SCHEMA_VERSION,
  validateCountryMarketProfileV1,
  type CountryFactState,
  type CountryMarketProfileV1,
  type RegulationState,
  type RestrictionFactState,
} from './marketProfileV1';
import {
  CBW_RESEARCH_REPOSITORY,
  RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
  type CountryMarketProfileV1Candidate,
  type ResearchArtifactBinding,
  type ResearchAuthorizationSnapshot,
  type ResearchMarketProfileSignals,
} from './researchToMarketProfileV1Bridge';
import type { Confidence } from './portalFactory';

export const LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION = 1 as const;

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const GIT_BLOB = /^gitblob:[a-f0-9]{40}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LegacyGovernanceKind = 'portal_review_master' | 'research_pilot_main';

export interface LegacyGovernedCandidateProvenance {
  repository: typeof CBW_RESEARCH_REPOSITORY;
  governanceKind: LegacyGovernanceKind;
  sourceBranch: 'master' | 'main';
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  lifecycleState: string;
  importReadiness: string;
  overallRecommendation: string;
  confidence: Confidence;
  lastCheckedAt: string;
  nextReviewAt: string;
  artifactBindings: readonly ResearchArtifactBinding[];
}

export interface LegacyGovernedCandidatePacket {
  schemaVersion: typeof LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION;
  provenance: LegacyGovernedCandidateProvenance;
  signals: ResearchMarketProfileSignals;
}

export interface ExpectedLegacyGovernedSource {
  repository: typeof CBW_RESEARCH_REPOSITORY;
  governanceKind: LegacyGovernanceKind;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  artifactBindings: readonly ResearchArtifactBinding[];
}

export interface LegacyGovernedCandidateRequest {
  expected: ExpectedLegacyGovernedSource;
  packet: LegacyGovernedCandidatePacket;
}

const ALL_FALSE_AUTHORIZATIONS: ResearchAuthorizationSnapshot = Object.freeze({
  researchImportAuthorized: false,
  stagingImportAuthorized: false,
  canonicalImportAuthorized: false,
  productionChangeAuthorized: false,
  productionBindingAuthorized: false,
  publicationAuthorized: false,
  masterChangeAuthorized: false,
});

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function validArtifactPath(value: unknown): value is string {
  return hasText(value)
    && !value.startsWith('/')
    && !value.includes('\\')
    && !value.split('/').some((part) => part === '' || part === '.' || part === '..');
}

function normalizeBindings(input: readonly ResearchArtifactBinding[]): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const item of input) {
    if (!item || !validArtifactPath(item.path) || !(SHA256.test(item.digest) || GIT_BLOB.test(item.digest))) return null;
    if (seen.has(item.path)) return null;
    seen.add(item.path);
    rows.push(`${item.path}\u0000${item.digest}`);
  }
  return rows.sort();
}

function sameBindings(a: readonly ResearchArtifactBinding[], b: readonly ResearchArtifactBinding[]): boolean {
  const left = normalizeBindings(a);
  const right = normalizeBindings(b);
  return Boolean(left && right && JSON.stringify(left) === JSON.stringify(right));
}

function stringArray(value: readonly string[]): boolean {
  return Array.isArray(value) && value.every(hasText) && new Set(value).size === value.length;
}

function factState(signal: ResearchMarketProfileSignals['kyc']['signal']): CountryFactState {
  switch (signal) {
    case 'supported': return 'supported';
    case 'supported_with_limits': return 'limited';
    case 'restricted': return 'restricted';
    case 'unavailable': return 'unavailable';
    case 'under_review':
    case 'public_visibility_only':
    case 'current_operational_availability_not_independently_confirmed':
    case 'payment_method_surface_only':
    case 'blocked':
    case 'conflicting': return 'under_review';
    default: return 'unknown';
  }
}

function availabilityState(signal: ResearchMarketProfileSignals['availability']['signal']): CountryMarketProfileV1['availability'] {
  switch (signal) {
    case 'supported': return 'available';
    case 'supported_with_limits': return 'limited';
    case 'restricted': return 'restricted';
    case 'unavailable': return 'unavailable';
    default: return 'unknown';
  }
}

function regulationState(signal: ResearchMarketProfileSignals['regulation']['signal']): RegulationState {
  return signal === 'conflicting' ? 'under_review' : signal;
}

function restrictionState(signal: ResearchMarketProfileSignals['restrictions']['signal']): RestrictionFactState {
  return signal === 'conflicting' ? 'under_review' : signal;
}

function unresolvedForFact(path: string, signal: ResearchMarketProfileSignals['kyc']['signal'], out: string[]): void {
  if (!['supported', 'supported_with_limits', 'restricted', 'unavailable'].includes(signal)) out.push(path);
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

function withDigest(candidate: Omit<CountryMarketProfileV1Candidate, 'candidateDigest'>): CountryMarketProfileV1Candidate {
  return Object.freeze({
    ...candidate,
    candidateDigest: `fnv1a64:${fnv1a64(canonicalize(candidate))}`,
  });
}

function sourceFor(packet: LegacyGovernedCandidatePacket): CountryMarketProfileV1Candidate['source'] {
  const p = packet.provenance;
  return Object.freeze({
    repository: p.repository,
    sourceBranch: p.sourceBranch,
    sourceCommitSha: p.sourceCommitSha,
    taskId: p.taskId,
    exchangeId: p.exchangeId,
    countryCode: p.countryCode,
    researchState: `LEGACY_GOVERNED:${p.governanceKind}:${p.lifecycleState}`,
    importReadiness: p.importReadiness,
    overallRecommendation: p.overallRecommendation,
    confidence: p.confidence,
    lastCheckedAt: p.lastCheckedAt,
    nextReviewAt: p.nextReviewAt,
    artifactBindings: p.artifactBindings,
    authorizations: ALL_FALSE_AUTHORIZATIONS,
  });
}

function validatePacket(request: LegacyGovernedCandidateRequest): string[] {
  const issues: string[] = [];
  const p = request.packet?.provenance;
  const expected = request.expected;
  if (request.packet?.schemaVersion !== LEGACY_GOVERNED_CANDIDATE_ADAPTER_VERSION) issues.push('INVALID_LEGACY_SCHEMA_VERSION');
  if (!p || p.repository !== CBW_RESEARCH_REPOSITORY || expected.repository !== CBW_RESEARCH_REPOSITORY) issues.push('REPOSITORY_MISMATCH');
  if (!p || p.governanceKind !== expected.governanceKind) issues.push('GOVERNANCE_KIND_MISMATCH');
  if (p?.governanceKind === 'portal_review_master' && p.sourceBranch !== 'master') issues.push('PORTAL_REVIEW_MUST_BIND_MASTER');
  if (p?.governanceKind === 'research_pilot_main' && p.sourceBranch !== 'main') issues.push('RESEARCH_PILOT_MUST_BIND_MAIN');
  if (!SHA40.test(p?.sourceCommitSha ?? '') || p?.sourceCommitSha !== expected.sourceCommitSha) issues.push('SOURCE_COMMIT_MISMATCH');
  if (!hasText(p?.taskId) || p?.taskId !== expected.taskId) issues.push('TASK_ID_MISMATCH');
  if (!EXCHANGE.test(p?.exchangeId ?? '') || p?.exchangeId !== expected.exchangeId) issues.push('EXCHANGE_ID_MISMATCH');
  if (!COUNTRY.test(p?.countryCode ?? '') || p?.countryCode !== expected.countryCode) issues.push('COUNTRY_CODE_MISMATCH');
  if (!hasText(p?.lifecycleState)) issues.push('LIFECYCLE_STATE_MISSING');
  if (!p?.artifactBindings || !sameBindings(p.artifactBindings, expected.artifactBindings)) issues.push('ARTIFACT_BINDING_MISMATCH');
  if (!validDate(p?.lastCheckedAt) || !validDate(p?.nextReviewAt) || Date.parse(p.nextReviewAt) <= Date.parse(p.lastCheckedAt)) issues.push('INVALID_REVIEW_WINDOW');
  if (!['high', 'medium', 'low', 'unknown'].includes(p?.confidence ?? '')) issues.push('INVALID_CONFIDENCE');

  const s = request.packet?.signals;
  if (!s) return [...issues, 'MISSING_SIGNALS'];
  const facts = [s.availability, s.kyc, s.deposits, s.withdrawals, s.fiatPayments, s.products, s.bonusAvailability];
  if (facts.some((item) => !item || !stringArray(item.claimIds) || !stringArray(item.limitations))) issues.push('INVALID_FACT_EVIDENCE');
  if (!s.regulation || !stringArray(s.regulation.legalEntityClaimIds) || !stringArray(s.regulation.licenseClaimIds) || !stringArray(s.regulation.limitations)) issues.push('INVALID_REGULATION_EVIDENCE');
  if (!s.restrictions || !stringArray(s.restrictions.claimIds) || !stringArray(s.restrictions.limitations)) issues.push('INVALID_RESTRICTION_EVIDENCE');
  if (!s.fiatPayments || !stringArray(s.fiatPayments.methods)) issues.push('INVALID_FIAT_METHODS');
  return [...new Set(issues)];
}

export function buildLegacyGovernedMarketProfileV1Candidate(
  request: LegacyGovernedCandidateRequest,
): CountryMarketProfileV1Candidate {
  const validationIssues = validatePacket(request);
  const source = sourceFor(request.packet);
  if (validationIssues.length > 0) {
    return withDigest({
      schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
      state: 'invalid',
      source,
      proposedProfile: null,
      unresolvedDimensions: Object.freeze([]),
      limitations: Object.freeze(['LEGACY_GOVERNED_ADAPTER_INPUT_INVALID']),
      validationIssues: Object.freeze(validationIssues),
      authorizationCeilingAllowsLaterPromotion: false,
      importable: false,
      publicAuthority: false,
    });
  }

  const s = request.packet.signals;
  const blocked = /BLOCKED/i.test(source.importReadiness)
    || /CONFLICT/i.test(source.overallRecommendation)
    || s.availability.signal === 'blocked'
    || s.availability.signal === 'conflicting'
    || s.regulation.signal === 'conflicting'
    || s.restrictions.signal === 'conflicting';

  const unresolved: string[] = [];
  unresolvedForFact('availability', s.availability.signal, unresolved);
  unresolvedForFact('kyc', s.kyc.signal, unresolved);
  unresolvedForFact('deposits', s.deposits.signal, unresolved);
  unresolvedForFact('withdrawals', s.withdrawals.signal, unresolved);
  unresolvedForFact('fiatPayments', s.fiatPayments.signal, unresolved);
  unresolvedForFact('products', s.products.signal, unresolved);
  unresolvedForFact('bonusAvailability', s.bonusAvailability.signal, unresolved);
  if (['under_review', 'unknown', 'conflicting'].includes(s.regulation.signal)) unresolved.push('regulation');
  if (['under_review', 'unknown', 'conflicting'].includes(s.restrictions.signal)) unresolved.push('restrictions');

  const claimIds = [...new Set([
    ...s.availability.claimIds,
    ...s.regulation.legalEntityClaimIds,
    ...s.regulation.licenseClaimIds,
    ...s.kyc.claimIds,
    ...s.deposits.claimIds,
    ...s.withdrawals.claimIds,
    ...s.fiatPayments.claimIds,
    ...s.products.claimIds,
    ...s.bonusAvailability.claimIds,
    ...s.restrictions.claimIds,
  ])].sort();

  const limitations = [...new Set([
    'NON_AUTHORIZING_LEGACY_GOVERNED_CANDIDATE',
    'Legacy-governed evidence cannot enter PUBLIC_MARKET_PROFILES or acquire promotion authority through this adapter.',
    ...s.availability.limitations,
    ...s.regulation.limitations,
    ...s.kyc.limitations,
    ...s.deposits.limitations,
    ...s.withdrawals.limitations,
    ...s.fiatPayments.limitations,
    ...s.products.limitations,
    ...s.bonusAvailability.limitations,
    ...s.restrictions.limitations,
  ])];

  if (claimIds.length === 0) validationIssues.push('NO_EVIDENCE_CLAIMS');
  if (validationIssues.length > 0) {
    return withDigest({
      schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
      state: 'invalid',
      source,
      proposedProfile: null,
      unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
      limitations: Object.freeze(limitations),
      validationIssues: Object.freeze([...new Set(validationIssues)]),
      authorizationCeilingAllowsLaterPromotion: false,
      importable: false,
      publicAuthority: false,
    });
  }

  if (blocked) {
    return withDigest({
      schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
      state: 'blocked',
      source,
      proposedProfile: null,
      unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
      limitations: Object.freeze([...limitations, 'LEGACY_SOURCE_BLOCKED_OR_CONFLICTING']),
      validationIssues: Object.freeze([]),
      authorizationCeilingAllowsLaterPromotion: false,
      importable: false,
      publicAuthority: false,
    });
  }

  const profile: CountryMarketProfileV1 = {
    schemaVersion: COUNTRY_MARKET_PROFILE_SCHEMA_VERSION,
    profileId: `legacy-candidate:${source.exchangeId}:${source.countryCode}:${source.sourceCommitSha.slice(0, 12)}`,
    exchangeId: source.exchangeId,
    countryCode: source.countryCode,
    availability: availabilityState(s.availability.signal),
    offerEligibility: 'under_review',
    claimIds,
    limitations,
    lastCheckedAt: source.lastCheckedAt,
    nextReviewAt: source.nextReviewAt,
    approval: 'draft',
    confidence: source.confidence,
    regulation: {
      state: regulationState(s.regulation.signal),
      legalEntityClaimIds: [...s.regulation.legalEntityClaimIds],
      licenseClaimIds: [...s.regulation.licenseClaimIds],
      limitations: [...s.regulation.limitations],
    },
    kyc: { state: factState(s.kyc.signal), claimIds: [...s.kyc.claimIds], limitations: [...s.kyc.limitations] },
    deposits: { state: factState(s.deposits.signal), claimIds: [...s.deposits.claimIds], limitations: [...s.deposits.limitations] },
    withdrawals: { state: factState(s.withdrawals.signal), claimIds: [...s.withdrawals.claimIds], limitations: [...s.withdrawals.limitations] },
    fiatPayments: {
      state: factState(s.fiatPayments.signal),
      claimIds: [...s.fiatPayments.claimIds],
      limitations: [...s.fiatPayments.limitations],
      methods: [...s.fiatPayments.methods],
    },
    products: { state: factState(s.products.signal), claimIds: [...s.products.claimIds], limitations: [...s.products.limitations] },
    bonusAvailability: { state: factState(s.bonusAvailability.signal), claimIds: [...s.bonusAvailability.claimIds], limitations: [...s.bonusAvailability.limitations] },
    restrictions: {
      state: restrictionState(s.restrictions.signal),
      claimIds: [...s.restrictions.claimIds],
      limitations: [...s.restrictions.limitations],
    },
  };

  const profileValidation = validateCountryMarketProfileV1(profile);
  if (!profileValidation.ok) {
    return withDigest({
      schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
      state: 'invalid',
      source,
      proposedProfile: null,
      unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
      limitations: Object.freeze(limitations),
      validationIssues: Object.freeze(profileValidation.issues.map((item) => `${item.path}:${item.code}`)),
      authorizationCeilingAllowsLaterPromotion: false,
      importable: false,
      publicAuthority: false,
    });
  }

  return withDigest({
    schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
    state: 'candidate',
    source,
    proposedProfile: Object.freeze(profile),
    unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
    limitations: Object.freeze(limitations),
    validationIssues: Object.freeze([]),
    authorizationCeilingAllowsLaterPromotion: false,
    importable: false,
    publicAuthority: false,
  });
}
