// ResearchOps Factory V1.1 — canonical model: states, transitions, inventory,
// cross-reference rules and authorization-key policy. Dependency-free.

export const FACTORY_VERSION = '1.1';

// Canonical task lifecycle states.
export const STATES = [
  'PREPARED',
  'RESEARCH_CAPTURED',
  'PACKAGE_VALIDATED',
  'SOURCE_TRUTH_REVIEWED',
  'CORRECTION_REQUIRED',
  'CORRECTED',
  'VALIDATED',
  'OWNER_CLOSEOUT_REQUIRED',
  'RESEARCH_RECORD_MERGE_AUTHORIZED',
  'RESEARCH_RECORD_MERGED_TO_MAIN',
  'BLOCKED',
];

// Explicit, fail-closed transition map. Any pair not listed is invalid.
export const TRANSITIONS = {
  PREPARED: ['RESEARCH_CAPTURED', 'BLOCKED'],
  RESEARCH_CAPTURED: ['PACKAGE_VALIDATED', 'BLOCKED'],
  PACKAGE_VALIDATED: ['SOURCE_TRUTH_REVIEWED', 'BLOCKED'],
  SOURCE_TRUTH_REVIEWED: ['CORRECTION_REQUIRED', 'VALIDATED', 'BLOCKED'],
  CORRECTION_REQUIRED: ['CORRECTED', 'BLOCKED'],
  CORRECTED: ['VALIDATED', 'BLOCKED'],
  VALIDATED: ['OWNER_CLOSEOUT_REQUIRED', 'BLOCKED'],
  OWNER_CLOSEOUT_REQUIRED: ['RESEARCH_RECORD_MERGE_AUTHORIZED', 'BLOCKED'],
  RESEARCH_RECORD_MERGE_AUTHORIZED: ['RESEARCH_RECORD_MERGED_TO_MAIN', 'BLOCKED'],
  RESEARCH_RECORD_MERGED_TO_MAIN: [],
  BLOCKED: [],
};

export function isState(s) {
  return STATES.includes(s);
}

export function canTransition(from, to) {
  if (!isState(from) || !isState(to)) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

// Canonical stage directories (append-only research layers).
export const STAGE_DIRS = [
  '00-contract',
  '10-input',
  '20-research-output',
  '50-source-truth-review',
  '60-correction',
  '70-validation',
  '80-closeout',
];

// Exact eleven-file research inventory (order is canonical).
export const RESEARCH_FILES = [
  'research-run.json',
  'source-verification.json',
  'claim-verdicts.json',
  'conflict-resolution.json',
  'product-availability.json',
  'payment-rails.json',
  'offer-eligibility-review.json',
  'schema-normalization-notes.json',
  'import-readiness.json',
  'source-truth-review-report.md',
  'MANIFEST.txt',
];

export const RESEARCH_JSON_FILES = RESEARCH_FILES.filter((f) => f.endsWith('.json'));

// Files the MANIFEST hashes (everything except MANIFEST.txt itself).
export const MANIFEST_HASHED_FILES = RESEARCH_FILES.filter((f) => f !== 'MANIFEST.txt');

// ID collections: file -> { arrayKey, idKey }.
export const ID_COLLECTIONS = [
  { file: 'source-verification.json', arrayKey: 'sources', idKey: 'sourceId', label: 'source' },
  { file: 'claim-verdicts.json', arrayKey: 'claims', idKey: 'claimId', label: 'claim' },
  { file: 'conflict-resolution.json', arrayKey: 'conflicts', idKey: 'conflictId', label: 'conflict' },
  { file: 'product-availability.json', arrayKey: 'products', idKey: 'productId', label: 'product' },
  { file: 'payment-rails.json', arrayKey: 'rails', idKey: 'railId', label: 'rail' },
];

// Cross-reference rules resolved against a set of known IDs.
// kind: 'source' references resolve to source IDs; 'claim' to claim IDs.
export const CROSSREF_RULES = [
  { file: 'claim-verdicts.json', arrayKey: 'claims', ownerIdKey: 'claimId', refKeys: ['supportedSourceIds', 'contradictedSourceIds'], resolvesTo: 'source' },
  { file: 'conflict-resolution.json', arrayKey: 'conflicts', ownerIdKey: 'conflictId', refKeys: ['availabilitySourceIds', 'restrictionSourceIds'], resolvesTo: 'source' },
  { file: 'payment-rails.json', arrayKey: 'rails', ownerIdKey: 'railId', refKeys: ['sourceIds'], resolvesTo: 'source' },
  { file: 'product-availability.json', arrayKey: 'products', ownerIdKey: 'productId', refKeys: ['claimIds'], resolvesTo: 'claim' },
];

// Authorization keys that must be FALSE in every generated/validated task,
// unless a valid owner research-record merge receipt is presented.
export const FORBIDDEN_TRUE_AUTH_KEYS = [
  'researchImportAuthorized',
  'stagingImportAuthorized',
  'canonicalImportAuthorized',
  'productionChangeAuthorized',
  'productionBindingAuthorized',
  'rankingChangeAuthorized',
  'ctaChangeAuthorized',
  'promoChangeAuthorized',
  'affiliateRouteChangeAuthorized',
  'publicationAuthorized',
  'sitemapAuthorized',
  'indexabilityAuthorized',
  'migration5Authorized',
  'deployAuthorized',
  'masterChangeAuthorized',
  'binancePilotAuthorized',
];

// The ONLY authorization an owner receipt may flip true.
export const OWNER_MERGE_KEY = 'researchRecordMergeToMainAuthorized';

// Default all-false authorization block for a fresh task.
export function freshAuthorizations() {
  const a = {};
  a[OWNER_MERGE_KEY] = false;
  for (const k of FORBIDDEN_TRUE_AUTH_KEYS) a[k] = false;
  return a;
}

// Task-ID grammar: uppercase segments, digits and single hyphens.
// e.g. CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001
export const TASK_ID_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

export function isValidTaskId(id) {
  return typeof id === 'string' && id.length >= 3 && id.length <= 120 && TASK_ID_RE.test(id);
}
