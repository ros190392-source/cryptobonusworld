import { validateMarketProfile, type MarketProfile } from './portalFactory';
import {
  validateMarketProfileImportDryRun,
  type MarketProfileImportDryRun,
} from './marketProfileImportDryRun';
import type { MarketProfilePromotionPreflight } from './marketProfilePromotionPreflight';
import type { MarketProfileReviewPreflight } from './marketProfileReviewPreflight';
import type { CandidateInventorySource, MarketProfileCandidateInventory } from './marketProfileCandidateInventory';

export const MARKET_PROFILE_REGISTRY_MUTATION_GUARD_VERSION = 1 as const;

const DIGEST = /^fnv1a64:[a-f0-9]{16}$/;

export type MarketProfileRegistryMutationGuardState = 'no_op_allowed' | 'blocked' | 'invalid';

export interface MarketProfileRegistryMutationGuardDecision {
  schemaVersion: typeof MARKET_PROFILE_REGISTRY_MUTATION_GUARD_VERSION;
  state: MarketProfileRegistryMutationGuardState;
  allowed: boolean;
  reasons: readonly string[];
  dryRunDigest: string;
  currentRegistryDigest: string;
  proposedRegistryDigest: string;
  mutationDetected: boolean;
  mutationCount: number;
  mutationApplied: false;
  publicationPerformed: false;
  deployRequired: false;
  publicAuthority: false;
  guardDigest: string;
}

export interface MarketProfileRegistryMutationGuardRequest {
  dryRun: MarketProfileImportDryRun;
  inventory: MarketProfileCandidateInventory;
  reviewPreflight: MarketProfileReviewPreflight;
  promotionPreflight: MarketProfilePromotionPreflight;
  sources: readonly CandidateInventorySource[];
  currentRegistry: unknown;
  proposedRegistry: unknown;
}

export type MarketProfileRegistryMutationGuardValidation =
  | { ok: true; value: MarketProfileRegistryMutationGuardDecision }
  | { ok: false; issues: readonly string[] };

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

function digestValue(value: unknown): string {
  return `fnv1a64:${fnv1a64(canonicalize(value))}`;
}

export function computeMarketProfileRegistryGuardDigest(
  decision: Omit<MarketProfileRegistryMutationGuardDecision, 'guardDigest'>,
): string {
  return digestValue(decision);
}

interface RegistryValidation {
  ok: boolean;
  value: readonly MarketProfile[];
  issues: readonly string[];
  digest: string;
}

function validateRegistry(value: unknown, prefix: string): RegistryValidation {
  const issues: string[] = [];
  if (!Array.isArray(value)) {
    return { ok: false, value: Object.freeze([]), issues: Object.freeze([`${prefix}_NOT_ARRAY`]), digest: digestValue(value) };
  }
  const pairs = new Set<string>();
  const validated: MarketProfile[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const result = validateMarketProfile(value[index]);
    if (!result.ok || !result.value) {
      issues.push(`${prefix}_ENTRY_${index}_INVALID`);
      continue;
    }
    const pair = `${result.value.exchangeId}:${result.value.countryCode}`;
    if (pairs.has(pair)) issues.push(`${prefix}_DUPLICATE_PAIR_${pair}`);
    pairs.add(pair);
    validated.push(result.value);
  }
  return {
    ok: issues.length === 0,
    value: Object.freeze(validated),
    issues: Object.freeze(issues),
    digest: digestValue(value),
  };
}

function mutationCount(current: readonly MarketProfile[], proposed: readonly MarketProfile[]): number {
  if (canonicalize(current) === canonicalize(proposed)) return 0;
  const currentByPair = new Map(current.map((item) => [`${item.exchangeId}:${item.countryCode}`, item]));
  const proposedByPair = new Map(proposed.map((item) => [`${item.exchangeId}:${item.countryCode}`, item]));
  const pairs = new Set([...currentByPair.keys(), ...proposedByPair.keys()]);
  let changes = 0;
  for (const pair of pairs) {
    if (canonicalize(currentByPair.get(pair)) !== canonicalize(proposedByPair.get(pair))) changes += 1;
  }
  return Math.max(1, changes);
}

function finalize(
  state: MarketProfileRegistryMutationGuardState,
  reasons: readonly string[],
  dryRunDigest: string,
  currentRegistryDigest: string,
  proposedRegistryDigest: string,
  count: number,
): MarketProfileRegistryMutationGuardDecision {
  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_REGISTRY_MUTATION_GUARD_VERSION,
    state,
    allowed: state === 'no_op_allowed',
    reasons: Object.freeze([...reasons]),
    dryRunDigest,
    currentRegistryDigest,
    proposedRegistryDigest,
    mutationDetected: count > 0,
    mutationCount: count,
    mutationApplied: false as const,
    publicationPerformed: false as const,
    deployRequired: false as const,
    publicAuthority: false as const,
  });
  return Object.freeze({ ...base, guardDigest: computeMarketProfileRegistryGuardDigest(base) });
}

export function evaluateMarketProfileRegistryMutationGuard(
  request: MarketProfileRegistryMutationGuardRequest,
): MarketProfileRegistryMutationGuardDecision {
  const current = validateRegistry(request.currentRegistry, 'CURRENT_REGISTRY');
  const proposed = validateRegistry(request.proposedRegistry, 'PROPOSED_REGISTRY');
  const dryRunValidation = validateMarketProfileImportDryRun(request.dryRun, {
    inventory: request.inventory,
    reviewPreflight: request.reviewPreflight,
    promotionPreflight: request.promotionPreflight,
    sources: request.sources,
  });

  const invalidReasons: string[] = [];
  if (!dryRunValidation.ok) invalidReasons.push(...dryRunValidation.issues.map((issue) => `DRY_RUN_${issue}`));
  if (!current.ok) invalidReasons.push(...current.issues);
  if (!proposed.ok) invalidReasons.push(...proposed.issues);
  if (!DIGEST.test(request.dryRun?.dryRunDigest ?? '')) invalidReasons.push('DRY_RUN_DIGEST_INVALID');
  if (invalidReasons.length > 0) {
    return finalize('invalid', [...new Set(invalidReasons)], request.dryRun?.dryRunDigest ?? '', current.digest, proposed.digest, 0);
  }

  const count = mutationCount(current.value, proposed.value);
  if (count === 0) {
    return finalize('no_op_allowed', ['EXACT_REGISTRY_NO_OP'], request.dryRun.dryRunDigest, current.digest, proposed.digest, 0);
  }

  return finalize(
    'blocked',
    ['ZERO_IMPORT_DRY_RUN_FORBIDS_REGISTRY_MUTATION'],
    request.dryRun.dryRunDigest,
    current.digest,
    proposed.digest,
    count,
  );
}

export function validateMarketProfileRegistryMutationGuardDecision(
  decision: MarketProfileRegistryMutationGuardDecision,
  request: MarketProfileRegistryMutationGuardRequest,
): MarketProfileRegistryMutationGuardValidation {
  const issues: string[] = [];
  if (!decision || typeof decision !== 'object') return { ok: false, issues: Object.freeze(['GUARD_DECISION_NOT_OBJECT']) };
  if (decision.schemaVersion !== MARKET_PROFILE_REGISTRY_MUTATION_GUARD_VERSION) issues.push('GUARD_SCHEMA_INVALID');
  if (!['no_op_allowed', 'blocked', 'invalid'].includes(decision.state)) issues.push('GUARD_STATE_INVALID');
  if (decision.allowed !== (decision.state === 'no_op_allowed')) issues.push('GUARD_ALLOWED_FLAG_MISMATCH');
  if (decision.mutationDetected !== (decision.mutationCount > 0)) issues.push('GUARD_MUTATION_FLAG_MISMATCH');
  if (!Number.isInteger(decision.mutationCount) || decision.mutationCount < 0) issues.push('GUARD_MUTATION_COUNT_INVALID');
  if (decision.mutationApplied !== false || decision.publicationPerformed !== false || decision.deployRequired !== false || decision.publicAuthority !== false) {
    issues.push('GUARD_SIDE_EFFECT_OR_AUTHORITY_LEAK');
  }
  if (!DIGEST.test(decision.guardDigest ?? '')) issues.push('GUARD_DIGEST_INVALID');

  if (issues.length === 0) {
    const rebuilt = evaluateMarketProfileRegistryMutationGuard(request);
    if (canonicalize(rebuilt) !== canonicalize(decision)) issues.push('GUARD_RECOMPUTE_MISMATCH');
  }

  const { guardDigest, ...withoutDigest } = decision;
  if (computeMarketProfileRegistryGuardDigest(withoutDigest) !== guardDigest) issues.push('GUARD_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: decision };
}
