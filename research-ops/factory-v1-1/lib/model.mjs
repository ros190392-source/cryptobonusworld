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

// V2-C7 — identity field grammar/types. These fields feed deterministic branch and
// path generation, so they are validated (not merely compared).
export const COUNTRY_CODE_RE = /^[A-Z]{2}$/;                 // canonical uppercase ISO-like
export const EXCHANGE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;  // lowercase safe slug
export const BATCH_ID_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;     // uppercase governed grammar
export const PRIORITY_RE = /^P[0-2]$/;                       // controlled enum P0|P1|P2
export const BRANCH_RE = /^research\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Bounded human text: non-empty, <=64 chars, no control chars, no path separators.
const CONTROL_RE = new RegExp('[\\x00-\\x1f\\x7f]');
export function isSafeName(v) {
  if (typeof v !== 'string') return false;
  return v.trim().length > 0 && v.length <= 64 && !CONTROL_RE.test(v) && !/[\\/]/.test(v);
}

// Validate identity values from an object exposing the identity fields.
// Returns an array of error strings (empty === valid).
export function validateIdentityValues(o) {
  const e = [];
  if (!o || typeof o !== 'object') return ['identity source not an object'];
  if (!COUNTRY_CODE_RE.test(String(o.countryCode))) e.push(`countryCode invalid: ${JSON.stringify(o.countryCode)}`);
  if ('countryName' in o && !isSafeName(o.countryName)) e.push(`countryName invalid: ${JSON.stringify(o.countryName)}`);
  if (!EXCHANGE_ID_RE.test(String(o.exchangeId))) e.push(`exchangeId invalid: ${JSON.stringify(o.exchangeId)}`);
  if ('exchangeName' in o && !isSafeName(o.exchangeName)) e.push(`exchangeName invalid: ${JSON.stringify(o.exchangeName)}`);
  if (!BATCH_ID_RE.test(String(o.batchId))) e.push(`batchId invalid: ${JSON.stringify(o.batchId)}`);
  if (!PRIORITY_RE.test(String(o.priority))) e.push(`priority invalid (want P0|P1|P2): ${JSON.stringify(o.priority)}`);
  return e;
}

// Deterministic task branch from validated safe values.
export function deterministicBranch(o) {
  return `research/${String(o.countryCode).toLowerCase()}-${String(o.exchangeId).toLowerCase()}-${String(o.batchId).toLowerCase()}`;
}
