import {
  COUNTRY_MARKET_PROFILE_SCHEMA_VERSION,
  validateCountryMarketProfileV1,
  type CountryFactState,
  type CountryMarketProfileV1,
  type RegulationState,
  type RestrictionFactState,
} from './marketProfileV1';
import type { Confidence } from './portalFactory';

export const RESEARCH_MARKET_PROFILE_BRIDGE_VERSION = 1 as const;
export const CBW_RESEARCH_REPOSITORY = 'ros190392-source/cryptobonusworld' as const;

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const COUNTRY = /^[A-Z]{2}$/;
const EXCHANGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BridgeFactSignal =
  | 'supported'
  | 'supported_with_limits'
  | 'restricted'
  | 'unavailable'
  | 'under_review'
  | 'unknown'
  | 'public_visibility_only'
  | 'current_operational_availability_not_independently_confirmed'
  | 'payment_method_surface_only'
  | 'blocked'
  | 'conflicting';

export type BridgeRegulationSignal =
  | 'licensed'
  | 'registered'
  | 'restricted'
  | 'prohibited'
  | 'under_review'
  | 'unknown'
  | 'conflicting';

export type BridgeRestrictionSignal = 'clear' | 'restricted' | 'under_review' | 'unknown' | 'conflicting';

export interface ResearchArtifactBinding {
  path: string;
  digest: string;
}

export interface ResearchAuthorizationSnapshot {
  researchImportAuthorized: boolean;
  stagingImportAuthorized: boolean;
  canonicalImportAuthorized: boolean;
  productionChangeAuthorized: boolean;
  productionBindingAuthorized: boolean;
  publicationAuthorized: boolean;
  masterChangeAuthorized: boolean;
}

export interface ResearchBridgeProvenance {
  repository: string;
  sourceBranch: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  researchState: string;
  importReadiness: string;
  overallRecommendation: string;
  confidence: Confidence;
  lastCheckedAt: string;
  nextReviewAt: string;
  artifactBindings: readonly ResearchArtifactBinding[];
  authorizations: ResearchAuthorizationSnapshot;
}

export interface ResearchFactEvidence {
  signal: BridgeFactSignal;
  claimIds: readonly string[];
  limitations: readonly string[];
}

export interface ResearchFiatEvidence extends ResearchFactEvidence {
  methods: readonly string[];
}

export interface ResearchRegulationEvidence {
  signal: BridgeRegulationSignal;
  legalEntityClaimIds: readonly string[];
  licenseClaimIds: readonly string[];
  limitations: readonly string[];
}

export interface ResearchRestrictionEvidence {
  signal: BridgeRestrictionSignal;
  claimIds: readonly string[];
  limitations: readonly string[];
}

export interface ResearchMarketProfileSignals {
  availability: ResearchFactEvidence;
  regulation: ResearchRegulationEvidence;
  kyc: ResearchFactEvidence;
  deposits: ResearchFactEvidence;
  withdrawals: ResearchFactEvidence;
  fiatPayments: ResearchFiatEvidence;
  products: ResearchFactEvidence;
  bonusAvailability: ResearchFactEvidence;
  restrictions: ResearchRestrictionEvidence;
}

export interface ResearchMarketProfilePacket {
  schemaVersion: typeof RESEARCH_MARKET_PROFILE_BRIDGE_VERSION;
  provenance: ResearchBridgeProvenance;
  signals: ResearchMarketProfileSignals;
}

export interface ExpectedResearchSource {
  repository: string;
  sourceCommitSha: string;
  taskId: string;
  exchangeId: string;
  countryCode: string;
  artifactBindings: readonly ResearchArtifactBinding[];
}

export type MarketProfileCandidateState = 'candidate' | 'blocked' | 'invalid';

export interface CountryMarketProfileV1Candidate {
  schemaVersion: typeof RESEARCH_MARKET_PROFILE_BRIDGE_VERSION;
  state: MarketProfileCandidateState;
  source: ResearchBridgeProvenance;
  proposedProfile: CountryMarketProfileV1 | null;
  unresolvedDimensions: readonly string[];
  limitations: readonly string[];
  validationIssues: readonly string[];
  authorizationCeilingAllowsLaterPromotion: boolean;
  importable: false;
  publicAuthority: false;
  candidateDigest: string;
}

export interface ResearchBridgeRequest {
  expected: ExpectedResearchSource;
  packet: ResearchMarketProfilePacket;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function validArtifactPath(path: unknown): path is string {
  return hasText(path)
    && !path.startsWith('/')
    && !path.includes('\\')
    && !path.split('/').some((part) => part === '' || part === '.' || part === '..');
}

function normalizeBindings(input: readonly ResearchArtifactBinding[]): string[] | null {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const item of input) {
    if (!item || !validArtifactPath(item.path) || !SHA256.test(item.digest)) return null;
    if (seen.has(item.path)) return null;
    seen.add(item.path);
    rows.push(`${item.path}\u0000${item.digest}`);
  }
  return rows.sort();
}

function sameBindings(a: readonly ResearchArtifactBinding[], b: readonly ResearchArtifactBinding[]): boolean {
  const left = normalizeBindings(a);
  const right = normalizeBindings(b);
  return Boolean(left && right && left.length > 0 && JSON.stringify(left) === JSON.stringify(right));
}

function stringArray(value: readonly string[]): boolean {
  return Array.isArray(value) && value.every(hasText) && new Set(value).size === value.length;
}

function factState(signal: BridgeFactSignal): CountryFactState {
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
    case 'conflicting':
      return 'under_review';
    default: return 'unknown';
  }
}

function availabilityState(signal: BridgeFactSignal): CountryMarketProfileV1['availability'] {
  switch (signal) {
    case 'supported': return 'available';
    case 'supported_with_limits': return 'limited';
    case 'restricted': return 'restricted';
    case 'unavailable': return 'unavailable';
    default: return 'unknown';
  }
}

function regulationState(signal: BridgeRegulationSignal): RegulationState {
  return signal === 'conflicting' ? 'under_review' : signal;
}

function restrictionState(signal: BridgeRestrictionSignal): RestrictionFactState {
  return signal === 'conflicting' ? 'under_review' : signal;
}

function unresolvedForFact(path: string, signal: BridgeFactSignal, out: string[]): void {
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

function invalidCandidate(
  source: ResearchBridgeProvenance,
  issues: string[],
): CountryMarketProfileV1Candidate {
  return withDigest({
    schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
    state: 'invalid',
    source,
    proposedProfile: null,
    unresolvedDimensions: Object.freeze([]),
    limitations: Object.freeze(['Bridge input failed exact provenance or structural validation.']),
    validationIssues: Object.freeze([...issues]),
    authorizationCeilingAllowsLaterPromotion: false,
    importable: false,
    publicAuthority: false,
  });
}

function validatePacket(request: ResearchBridgeRequest): string[] {
  const issues: string[] = [];
  const { expected, packet } = request;
  const source = packet?.provenance;

  if (packet?.schemaVersion !== RESEARCH_MARKET_PROFILE_BRIDGE_VERSION) issues.push('INVALID_BRIDGE_SCHEMA_VERSION');
  if (!source || source.repository !== CBW_RESEARCH_REPOSITORY || expected.repository !== CBW_RESEARCH_REPOSITORY) issues.push('REPOSITORY_MISMATCH');
  if (source?.sourceBranch !== 'main') issues.push('SOURCE_BRANCH_NOT_RESEARCH_MAIN');
  if (!SHA40.test(source?.sourceCommitSha ?? '') || source?.sourceCommitSha !== expected.sourceCommitSha) issues.push('SOURCE_COMMIT_MISMATCH');
  if (!hasText(source?.taskId) || source?.taskId !== expected.taskId) issues.push('TASK_ID_MISMATCH');
  if (!EXCHANGE.test(source?.exchangeId ?? '') || source?.exchangeId !== expected.exchangeId) issues.push('EXCHANGE_ID_MISMATCH');
  if (!COUNTRY.test(source?.countryCode ?? '') || source?.countryCode !== expected.countryCode) issues.push('COUNTRY_CODE_MISMATCH');
  if (source?.researchState !== 'RESEARCH_RECORD_MERGED_TO_MAIN') issues.push('RESEARCH_NOT_MERGED_TO_MAIN');
  if (!source?.artifactBindings || !sameBindings(source.artifactBindings, expected.artifactBindings)) issues.push('ARTIFACT_BINDING_MISMATCH');
  if (!validDate(source?.lastCheckedAt) || !validDate(source?.nextReviewAt)
    || Date.parse(source.nextReviewAt) <= Date.parse(source.lastCheckedAt)) issues.push('INVALID_REVIEW_WINDOW');
  if (!['high', 'medium', 'low', 'unknown'].includes(source?.confidence ?? '')) issues.push('INVALID_CONFIDENCE');

  const auth = source?.authorizations;
  const authKeys: Array<keyof ResearchAuthorizationSnapshot> = [
    'researchImportAuthorized', 'stagingImportAuthorized', 'canonicalImportAuthorized',
    'productionChangeAuthorized', 'productionBindingAuthorized', 'publicationAuthorized',
    'masterChangeAuthorized',
  ];
  if (!auth || authKeys.some((key) => typeof auth[key] !== 'boolean')) issues.push('INVALID_AUTHORIZATION_SNAPSHOT');

  const s = packet?.signals;
  if (!s) return [...issues, 'MISSING_SIGNALS'];
  const factDimensions = [s.availability, s.kyc, s.deposits, s.withdrawals, s.fiatPayments, s.products, s.bonusAvailability];
  if (factDimensions.some((item) => !item || !stringArray(item.claimIds) || !stringArray(item.limitations))) issues.push('INVALID_FACT_EVIDENCE');
  if (!s.regulation || !stringArray(s.regulation.legalEntityClaimIds) || !stringArray(s.regulation.licenseClaimIds) || !stringArray(s.regulation.limitations)) issues.push('INVALID_REGULATION_EVIDENCE');
  if (!s.restrictions || !stringArray(s.restrictions.claimIds) || !stringArray(s.restrictions.limitations)) issues.push('INVALID_RESTRICTION_EVIDENCE');
  if (!s.fiatPayments || !stringArray(s.fiatPayments.methods)) issues.push('INVALID_FIAT_METHODS');
  return [...new Set(issues)];
}

function promotionCeiling(auth: ResearchAuthorizationSnapshot): boolean {
  return auth.researchImportAuthorized
    && auth.stagingImportAuthorized
    && auth.canonicalImportAuthorized
    && auth.productionChangeAuthorized
    && auth.productionBindingAuthorized
    && auth.publicationAuthorized
    && auth.masterChangeAuthorized;
}

export function buildCountryMarketProfileV1Candidate(
  request: ResearchBridgeRequest,
): CountryMarketProfileV1Candidate {
  const inputIssues = validatePacket(request);
  const source = request.packet.provenance;
  if (inputIssues.length > 0) return invalidCandidate(source, inputIssues);

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
  if (claimIds.length === 0) return invalidCandidate(source, ['NO_EVIDENCE_CLAIMS']);

  const limitations = [...new Set([
    'NON_AUTHORIZING_RESEARCH_CANDIDATE',
    'Bridge output cannot enter PUBLIC_MARKET_PROFILES without a later separately authorized promotion.',
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

  if (blocked) {
    return withDigest({
      schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
      state: 'blocked',
      source,
      proposedProfile: null,
      unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
      limitations: Object.freeze([...limitations, 'SOURCE_RESEARCH_BLOCKED_OR_CONFLICTING']),
      validationIssues: Object.freeze([]),
      authorizationCeilingAllowsLaterPromotion: promotionCeiling(source.authorizations),
      importable: false,
      publicAuthority: false,
    });
  }

  const profile: CountryMarketProfileV1 = {
    schemaVersion: COUNTRY_MARKET_PROFILE_SCHEMA_VERSION,
    profileId: `candidate:${source.exchangeId}:${source.countryCode}:${source.sourceCommitSha.slice(0, 12)}`,
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

  const validation = validateCountryMarketProfileV1(profile);
  if (!validation.ok) {
    return invalidCandidate(source, validation.issues.map((item) => `${item.path}:${item.code}`));
  }

  return withDigest({
    schemaVersion: RESEARCH_MARKET_PROFILE_BRIDGE_VERSION,
    state: 'candidate',
    source,
    proposedProfile: Object.freeze(profile),
    unresolvedDimensions: Object.freeze([...new Set(unresolved)]),
    limitations: Object.freeze(limitations),
    validationIssues: Object.freeze([]),
    authorizationCeilingAllowsLaterPromotion: promotionCeiling(source.authorizations),
    importable: false,
    publicAuthority: false,
  });
}
