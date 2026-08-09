import {
  validateMarketProfilePromotionPreflight,
  type MarketProfilePromotionPreflight,
} from './marketProfilePromotionPreflight';
import type { MarketProfileReviewPreflight } from './marketProfileReviewPreflight';
import type {
  CandidateInventorySource,
  MarketProfileCandidateInventory,
} from './marketProfileCandidateInventory';

export const MARKET_PROFILE_IMPORT_DRY_RUN_VERSION = 1 as const;

const DIGEST = /^fnv1a64:[a-f0-9]{16}$/;
const STRICT_UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export interface MarketProfileImportDryRunEntry {
  exchangeId: string;
  countryCode: string;
  candidateDigest: string;
  sourceCommitSha: string;
  taskId: string;
  promotionPreflightState: MarketProfilePromotionPreflight['entries'][number]['state'];
  plannedAction: 'none';
  reasons: readonly string[];
  importPlanned: false;
  registryMutationPlanned: false;
  publicationPlanned: false;
  deployPlanned: false;
}

export interface MarketProfileImportDryRun {
  schemaVersion: typeof MARKET_PROFILE_IMPORT_DRY_RUN_VERSION;
  dryRunId: string;
  promotionPreflightDigest: string;
  promotionPreflightEvaluatedAt: string;
  generatedAt: string;
  entries: readonly MarketProfileImportDryRunEntry[];
  plannedImports: readonly [];
  registryMutations: readonly [];
  publications: readonly [];
  deployRequired: false;
  importPerformed: false;
  publicAuthority: false;
  dryRunDigest: string;
}

export interface MarketProfileImportDryRunRequest {
  dryRunId: string;
  inventory: MarketProfileCandidateInventory;
  reviewPreflight: MarketProfileReviewPreflight;
  promotionPreflight: MarketProfilePromotionPreflight;
  sources: readonly CandidateInventorySource[];
  generatedAt: string;
}

export type MarketProfileImportDryRunValidation =
  | { ok: true; value: MarketProfileImportDryRun }
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

export function computeMarketProfileImportDryRunDigest(
  dryRun: Omit<MarketProfileImportDryRun, 'dryRunDigest'>,
): string {
  return `fnv1a64:${fnv1a64(canonicalize(dryRun))}`;
}

function reasonForState(state: MarketProfilePromotionPreflight['entries'][number]['state']): string {
  switch (state) {
    case 'review_not_ready': return 'GOVERNED_REVIEW_NOT_READY';
    case 'refresh_required': return 'FRESH_EVIDENCE_REQUIRED';
    case 'blocked': return 'CANDIDATE_BLOCKED';
    default: return 'UPSTREAM_STATE_INVALID';
  }
}

export function buildMarketProfileImportDryRun(
  request: MarketProfileImportDryRunRequest,
): MarketProfileImportDryRun {
  if (!hasText(request.dryRunId)) throw new Error('dryRunId is required.');
  if (!strictUtcSecond(request.generatedAt)) throw new Error('Explicit strict UTC-second generatedAt is required.');
  if (Date.parse(request.generatedAt) < Date.parse(request.promotionPreflight.evaluatedAt)) {
    throw new Error('Dry run cannot predate promotion preflight.');
  }

  const promotionValidation = validateMarketProfilePromotionPreflight(request.promotionPreflight, {
    inventory: request.inventory,
    reviewPreflight: request.reviewPreflight,
    sources: request.sources,
  });
  if (!promotionValidation.ok) throw new Error(`Promotion preflight invalid: ${promotionValidation.issues.join(',')}`);
  if (request.promotionPreflight.readyForSeparateImportCount !== 0 || request.promotionPreflight.ownerReceiptCount !== 0) {
    throw new Error('Zero-action dry-run contract only accepts zero-ready/zero-receipt promotion preflight.');
  }

  const entries = request.promotionPreflight.entries.map((entry): MarketProfileImportDryRunEntry => Object.freeze({
    exchangeId: entry.exchangeId,
    countryCode: entry.countryCode,
    candidateDigest: entry.candidateDigest,
    sourceCommitSha: entry.sourceCommitSha,
    taskId: entry.taskId,
    promotionPreflightState: entry.state,
    plannedAction: 'none',
    reasons: Object.freeze([reasonForState(entry.state), ...entry.reasons]),
    importPlanned: false,
    registryMutationPlanned: false,
    publicationPlanned: false,
    deployPlanned: false,
  }));

  const base = Object.freeze({
    schemaVersion: MARKET_PROFILE_IMPORT_DRY_RUN_VERSION,
    dryRunId: request.dryRunId,
    promotionPreflightDigest: request.promotionPreflight.preflightDigest,
    promotionPreflightEvaluatedAt: request.promotionPreflight.evaluatedAt,
    generatedAt: request.generatedAt,
    entries: Object.freeze(entries),
    plannedImports: Object.freeze([]) as readonly [],
    registryMutations: Object.freeze([]) as readonly [],
    publications: Object.freeze([]) as readonly [],
    deployRequired: false as const,
    importPerformed: false as const,
    publicAuthority: false as const,
  });
  return Object.freeze({ ...base, dryRunDigest: computeMarketProfileImportDryRunDigest(base) });
}

export function validateMarketProfileImportDryRun(
  dryRun: MarketProfileImportDryRun,
  request: Omit<MarketProfileImportDryRunRequest, 'dryRunId' | 'generatedAt'>,
): MarketProfileImportDryRunValidation {
  const issues: string[] = [];
  if (!dryRun || typeof dryRun !== 'object') return { ok: false, issues: Object.freeze(['DRY_RUN_NOT_OBJECT']) };
  if (dryRun.schemaVersion !== MARKET_PROFILE_IMPORT_DRY_RUN_VERSION) issues.push('DRY_RUN_SCHEMA_INVALID');
  if (!hasText(dryRun.dryRunId)) issues.push('DRY_RUN_ID_INVALID');
  if (!strictUtcSecond(dryRun.generatedAt)) issues.push('DRY_RUN_TIME_INVALID');
  if (dryRun.promotionPreflightDigest !== request.promotionPreflight.preflightDigest) issues.push('DRY_RUN_PROMOTION_DIGEST_MISMATCH');
  if (dryRun.promotionPreflightEvaluatedAt !== request.promotionPreflight.evaluatedAt) issues.push('DRY_RUN_PROMOTION_TIME_MISMATCH');
  if (!DIGEST.test(dryRun.dryRunDigest ?? '')) issues.push('DRY_RUN_DIGEST_INVALID');
  if (!Array.isArray(dryRun.entries) || dryRun.entries.length !== request.promotionPreflight.entries.length) issues.push('DRY_RUN_ENTRY_COUNT_INVALID');
  if (!Array.isArray(dryRun.plannedImports) || dryRun.plannedImports.length !== 0) issues.push('DRY_RUN_IMPORTS_NOT_EMPTY');
  if (!Array.isArray(dryRun.registryMutations) || dryRun.registryMutations.length !== 0) issues.push('DRY_RUN_REGISTRY_MUTATIONS_NOT_EMPTY');
  if (!Array.isArray(dryRun.publications) || dryRun.publications.length !== 0) issues.push('DRY_RUN_PUBLICATIONS_NOT_EMPTY');
  if (dryRun.deployRequired !== false || dryRun.importPerformed !== false || dryRun.publicAuthority !== false) issues.push('DRY_RUN_AUTHORITY_OR_SIDE_EFFECT_LEAK');

  if (Array.isArray(dryRun.entries)) {
    for (const entry of dryRun.entries) {
      if (entry.plannedAction !== 'none' || entry.importPlanned !== false || entry.registryMutationPlanned !== false
        || entry.publicationPlanned !== false || entry.deployPlanned !== false) {
        issues.push(`ENTRY_${entry.exchangeId}_${entry.countryCode}_ACTION_LEAK`);
      }
    }
  }

  if (issues.length === 0) {
    try {
      const rebuilt = buildMarketProfileImportDryRun({
        dryRunId: dryRun.dryRunId,
        inventory: request.inventory,
        reviewPreflight: request.reviewPreflight,
        promotionPreflight: request.promotionPreflight,
        sources: request.sources,
        generatedAt: dryRun.generatedAt,
      });
      if (canonicalize(rebuilt) !== canonicalize(dryRun)) issues.push('DRY_RUN_RECOMPUTE_MISMATCH');
    } catch {
      issues.push('DRY_RUN_RECOMPUTE_FAILED');
    }
  }

  const { dryRunDigest, ...withoutDigest } = dryRun;
  if (computeMarketProfileImportDryRunDigest(withoutDigest) !== dryRunDigest) issues.push('DRY_RUN_DIGEST_MISMATCH');

  return issues.length > 0
    ? { ok: false, issues: Object.freeze([...new Set(issues)]) }
    : { ok: true, value: dryRun };
}
