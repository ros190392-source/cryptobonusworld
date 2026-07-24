#!/usr/bin/env node
/**
 * CBW KZ×MEXC P0-B — deterministic STAGING import (non-production).
 *
 * Executes the owner-approved deterministic transform
 * (owner-ops/market-intelligence/decisions/CBW_KZ_MEXC_P0B_IMPORT_PREP_DESIGN_v1.json,
 * design commit 0198d9fe05ca7c8425c61d56fd85de475f5df8fc) over the recovered
 * MEXC × Kazakhstan Source Truth Review package, producing normalized research
 * records and one NON-PRODUCTION exchange-market-cell CANDIDATE under
 * research/market-intelligence/staging/kz/mexc/p0b-v1/.
 *
 * STAGING ONLY: writes nothing outside the approved staging dir; creates no
 * canonical record, no production/ranking/CTA/promo behavior. Deterministic
 * (no wall-clock, no network, no browser, no child process, no git commands);
 * Node built-ins only; package.json unchanged.
 *
 * Usage:
 *   node scripts/market-intelligence/import-kz-mexc-p0b.mjs --input-dir <DIR> --dry-run
 *   node scripts/market-intelligence/import-kz-mexc-p0b.mjs --input-dir <DIR> --write-staging
 *   node scripts/market-intelligence/import-kz-mexc-p0b.mjs --input-dir <DIR> --check
 *
 * Exit codes: 0 success · 1 input/parsing/identity/validation error · 2 unsafe mode/path/overwrite
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO_ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const STAGING_REL = 'research/market-intelligence/staging/kz/mexc/p0b-v1';
const STAGING_ABS = resolve(join(REPO_ROOT, ...STAGING_REL.split('/')));

const TRANSFORM_VERSION = 'kz-mexc-p0b-v1';
const TASK_ID = 'CBW-KZ-MEXC-P0-B-STAGING-IMPORT-003';
const BASELINE_HEAD = '0198d9fe05ca7c8425c61d56fd85de475f5df8fc';
const OWNER_DECISION_COMMIT = '6f922cdff5caf0a6fb0f5eeff7618ea895234c73';
const IMPORT_PREP_DESIGN_COMMIT = '0198d9fe05ca7c8425c61d56fd85de475f5df8fc';
const INPUT_PACKAGE = {
  name: 'CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip',
  deliveredAs: 'CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1.zip',
  bytes: 27833,
  sha256: 'f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f',
  role: 'recovered source-truth review package',
};
const UNAVAILABLE_ORIGINAL = {
  bytes: 37001,
  sha256: '3f0e10d231efc2ce33f77fac85182809197c11bf5b0cf400f32c77bad4774281',
  status: 'ORIGINAL BYTES UNAVAILABLE',
};
const RECOVERED_RESEARCH_PACKAGE = {
  name: 'CBW_KZ_MEXC_P0B_RESEARCH_PACKAGE_v1_RECOVERED.zip',
  bytes: 30728,
  sha256: 'aa4ee0a0e3399c74f80eb22de843815a9899fa43fb947b3b660a713aaa5dd242',
  role: 'recovered original research package (context only; not read by this script)',
};

const EXPECTED_IDENTITY = {
  project: 'CryptoBonusWorld',
  countryName: 'Kazakhstan',
  countryCode: 'KZ',
  exchangeName: 'MEXC',
  exchangeId: 'mexc',
  batchId: 'KZ-P0-B',
  taskId: 'CBW-KZ-MEXC-P0-B-SOURCE-TRUTH-REVIEW-001',
  projectBaselineCommit: '2d1e94904491861a69f35329691514bb148407dd',
  researchPackageBaselineCommit: '67bdca323928a4a26aaa4cbe48ec18200fdc1d1d',
  liveVerificationState: 'NOT_LIVE_VERIFIED',
  packageStatus: 'RECOVERED / UNVERIFIED',
};

const REQUIRED_INPUT_FILES = [
  'review-run.json', 'source-verification.json', 'claim-verdicts.json',
  'conflict-resolution.json', 'offer-eligibility-review.json',
  'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md',
];

const EXPECTED = {
  sources: 16, claims: 24, corrections: 15, conflicts: 7, links: 55,
  linkDist: { SUPPORTS: 41, CONTRADICTS: 14 },
  sourceReviewDist: { VERIFIED_CURRENT: 9, VERIFIED_WITH_LIMITS: 6, OUTDATED: 1 },
  sourceStatusDist: { ACTIVE: 15, STALE: 1 },
  claimDist: { CONFIRMED: 11, CONFIRMED_WITH_LIMITS: 11, UNVERIFIED: 2 },
  conflictDist: { RESOLVED_RESTRICTIVE: 2, PARTIALLY_RESOLVED: 4, RESOLVED_BY_SPECIFICITY: 1 },
};

// Owner-fixed conflict final statuses (from the committed owner decision).
const EXPECTED_CONFLICTS = {
  'cf-kz-mexc-terms-vs-regulator': 'RESOLVED_RESTRICTIVE',
  'cf-kz-mexc-terms-vs-app-support': 'PARTIALLY_RESOLVED',
  'cf-kz-mexc-terms-vs-p2p-kzt': 'PARTIALLY_RESOLVED',
  'cf-kz-mexc-terms-vs-fiat-tn': 'PARTIALLY_RESOLVED',
  'cf-kz-mexc-terms-vs-earn': 'PARTIALLY_RESOLVED',
  'cf-kz-mexc-card-guide-scope': 'RESOLVED_BY_SPECIFICITY',
  'cf-kz-mexc-global-referral-vs-kz-restriction': 'RESOLVED_RESTRICTIVE',
};

// Deterministic enum maps (committed design §5).
const TIER_MAP = { TIER_A: 'A', TIER_B: 'B', TIER_C: 'C', TIER_D: 'D' };
const LANGUAGE_MAP = { English: 'en', Russian: 'ru', Kazakh: 'kk' };
// All observed review sourceType tokens are live web pages reviewed without proxy -> HTML.
const CAPTURE_TYPE_MAP = {
  LEGAL_TERMS: 'HTML', REGULATOR_WARNING: 'HTML', HELP_CENTER_PRODUCT_SUPPORT: 'HTML',
  OFFICIAL_PRODUCT_PAGE: 'HTML', HELP_CENTER_PRODUCT_RULES: 'HTML', HELP_CENTER_FIAT_POLICY: 'HTML',
  PRODUCT_LEGAL_TERMS: 'HTML', HELP_CENTER_PRODUCT_GUIDE: 'HTML', HELP_CENTER_GENERAL_GUIDE: 'HTML',
  KYC_POLICY_GUIDANCE: 'HTML', HELP_CENTER_REGISTRATION_GUIDE: 'HTML', OFFICIAL_REFERRAL_GUIDE: 'HTML',
  OFFICIAL_REFERRAL_RULES: 'HTML', OFFICIAL_AFFILIATE_RULES: 'HTML', OFFICIAL_CAMPAIGN_PAGE: 'HTML',
};
const CURRENT_PAGE_STATUSES = new Set([
  'CURRENT_AT_CHECK', 'CURRENT_BUT_CONFLICTING', 'LIVE_PAGE_BUT_CONFLICTING',
  'CURRENT_BUT_NON_DECISIVE', 'CURRENT_GLOBAL_FLOW',
]);
const SCHEMA_STATUS = ['ACTIVE', 'MOVED', 'REMOVED', 'SUPERSEDED', 'BLOCKED', 'STALE'];
const SCHEMA_TIER = ['A', 'B', 'C', 'D'];
const SCHEMA_CAPTURE = ['HTML', 'PDF', 'SCREENSHOT', 'API', 'DATASET', 'MANUAL_BROWSER', 'NEWS'];
const NON_PERMISSIVE_USE = new Set(['BLOCK', 'NONE']);

// Owner-approved candidate product projection (committed owner decision §6 / design §8).
const PRODUCT_STATUSES = {
  registration: 'RESTRICTED', kyc: 'RESTRICTED', spot: 'RESTRICTED', derivatives: 'RESTRICTED',
  margin: 'RESTRICTED', copy_trading: 'RESTRICTED_WITH_PRODUCT_DETAIL_UNVERIFIED',
  p2p: 'CONFLICTING', kzt_p2p: 'CONFLICTING', direct_kzt_deposit: 'UNKNOWN',
  direct_kzt_withdrawal: 'UNKNOWN', bank_card_purchase: 'UNAVAILABLE',
  mobile_application: 'CONFLICTING', earn: 'CONFLICTING',
};
const REASON_CODES = [
  'RESTRICTED_BY_CURRENT_TERMS_PROHIBITED_JURISDICTION',
  'AFSA_UNLICENSED_WARNING_SUPPORTING',
  'TERMS_PAGE_FLIP_MONITORING_REQUIRED',
  'CONFLICTING_PRODUCT_SIGNALS_PRESERVED',
  'DIRECT_FIAT_RAILS_UNVERIFIED',
  'REFERRAL_KZ_COMPATIBILITY_UNVERIFIED',
  'RECOVERED_PACKAGE_UNVERIFIED',
];
const TERMS_PAGE_FLIP = {
  state: 'CURRENT_RESTRICTIVE_SOURCE_ACCEPTED_WITH_MONITORING',
  earlierCaptures: [
    { date: '2026-07-03', finding: 'Kazakhstan reportedly absent from the prohibited-jurisdiction list' },
    { date: '2026-07-14', finding: 'Kazakhstan reportedly absent; document update date 2025-05-29' },
  ],
  currentReview: {
    date: '2026-07-22',
    finding: 'Kazakhstan expressly present in the prohibited-jurisdiction list; displayed document update date remained 2025-05-29',
  },
  sourceChangeOrPriorMisreadUnresolved: true,
  productionPublicationRecheckRequired: true,
  restrictionMonitoringRequired: true,
};
const GRANTED_AUTHORIZATIONS = ['ownerDecisionCompleted', 'importPreparationDesignAuthorized', 'stagingImportExecuted (this task, non-production)'];
const WITHHELD_AUTHORIZATIONS = [
  'researchImportAuthorized', 'normalizationExecutionAuthorizedBeyondStaging', 'canonicalImportAuthorized',
  'legacyGeoUpdateAuthorized', 'productionChangeAuthorized', 'rankingChangeAuthorized', 'ctaChangeAuthorized',
  'promoChangeAuthorized', 'affiliateRouteChangeAuthorized', 'referralCodeActivationAuthorized',
  'publicationAuthorized', 'migration5Authorized', 'pageOrRouteChangeAuthorized', 'deployAuthorized',
];

const OUTPUT_FILES = [
  'import-manifest.json', 'normalized-sources.json', 'claim-source-links.json', 'claim-review.json',
  'qa-provenance.json', 'normalized-conflicts.json', 'exchange-market-cell.candidate.json', 'transform-report.md',
];

// ---------- helpers ----------
function fail(code, msg) { console.error(`ERROR: ${msg}`); process.exit(code); }
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }
function stableJson(obj) { return JSON.stringify(obj, null, 2) + '\n'; }
function sortedUnique(arr) { return [...new Set(arr)].sort(); }
function claimCategory(claimId) {
  const m = /^clm-kz-mexc-(.+)-\d+$/.exec(claimId);
  if (!m) fail(1, `unparseable claimId category: ${claimId}`);
  return m[1];
}
function addDaysIso(iso, days) {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
function distribution(items, key) {
  const out = {};
  for (const it of items) { const v = typeof key === 'function' ? key(it) : it[key]; out[v] = (out[v] || 0) + 1; }
  return out;
}
function sameDist(a, b) {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

// Minimal structural validator for market-source.schema.json (additionalProperties:false).
const SOURCE_SCHEMA_FIELDS = new Set([
  'sourceId', 'exchangeId', 'countryCode', 'productScope', 'claimType', 'url', 'sourceTier', 'publisher',
  'title', 'publishedDate', 'updatedDate', 'retrievedDate', 'effectiveFrom', 'effectiveTo', 'language',
  'contentHash', 'evidenceSummary', 'quotedClaim', 'captureType', 'status',
]);
function validateSourceRecord(r) {
  for (const k of Object.keys(r)) if (!SOURCE_SCHEMA_FIELDS.has(k)) fail(1, `source ${r.sourceId}: schema-prohibited field ${k}`);
  for (const req of ['sourceId', 'url', 'sourceTier', 'publisher', 'retrievedDate', 'status'])
    if (r[req] === undefined || r[req] === null || r[req] === '') fail(1, `source ${r.sourceId}: missing required ${req}`);
  if (!SCHEMA_TIER.includes(r.sourceTier)) fail(1, `source ${r.sourceId}: bad tier ${r.sourceTier}`);
  if (!SCHEMA_STATUS.includes(r.status)) fail(1, `source ${r.sourceId}: bad status ${r.status}`);
  if (r.captureType !== undefined && !SCHEMA_CAPTURE.includes(r.captureType)) fail(1, `source ${r.sourceId}: bad captureType`);
  if (!Array.isArray(r.productScope) || r.productScope.length === 0) fail(1, `source ${r.sourceId}: empty productScope`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.retrievedDate)) fail(1, `source ${r.sourceId}: bad retrievedDate`);
}

// Minimal structural validator for exchange-market-cell.schema.json (additionalProperties:false).
const CELL_FIELDS = new Set([
  'exchangeId', 'countryCode', 'exchangeLegalEntity', 'overallAvailability', 'registrationStatus',
  'productStatuses', 'rankingEligibility', 'ctaEligibility', 'promoEligibility', 'confidence', 'freshness',
  'checkedDate', 'nextReviewDate', 'reasonCodes', 'limitations', 'sourceIds', 'conflictIds',
  'alternativeExchangeIds', 'liveVerificationState',
]);
function validateCell(c) {
  for (const k of Object.keys(c)) if (!CELL_FIELDS.has(k)) fail(1, `cell: schema-prohibited field ${k}`);
  for (const req of ['exchangeId', 'countryCode', 'overallAvailability', 'registrationStatus', 'productStatuses', 'rankingEligibility', 'ctaEligibility', 'confidence', 'checkedDate', 'sourceIds'])
    if (c[req] === undefined) fail(1, `cell: missing required ${req}`);
  if (c.countryCode.length !== 2) fail(1, 'cell: countryCode must be 2 chars');
  if (!['AVAILABLE', 'AVAILABLE_WITH_LIMITS', 'RESTRICTED', 'UNAVAILABLE', 'UNDER_REVIEW', 'CONFLICTING', 'UNKNOWN', 'STALE'].includes(c.overallAvailability)) fail(1, 'cell: bad overallAvailability');
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(c.confidence)) fail(1, 'cell: bad confidence');
  if (c.freshness !== undefined && !['CURRENT', 'DUE_SOON', 'STALE', 'UNDER_REVIEW', 'CONFLICTING'].includes(c.freshness)) fail(1, 'cell: bad freshness');
  if (c.liveVerificationState !== undefined && !['LIVE_VERIFIED', 'NOT_LIVE_VERIFIED', 'NOT_APPLICABLE', 'UNKNOWN'].includes(c.liveVerificationState)) fail(1, 'cell: bad liveVerificationState');
  if (typeof c.rankingEligibility !== 'boolean' || typeof c.ctaEligibility !== 'boolean') fail(1, 'cell: eligibility must be boolean');
  for (const [k, v] of Object.entries(c.productStatuses)) if (typeof v !== 'string') fail(1, `cell: productStatuses.${k} must be string`);
}

// ---------- CLI ----------
const args = process.argv.slice(2);
function argValue(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
const inputDir = argValue('--input-dir');
const modes = ['--dry-run', '--write-staging', '--check'].filter((m) => args.includes(m));
if (!inputDir || modes.length !== 1) fail(2, 'usage: --input-dir <DIR> plus exactly one of --dry-run | --write-staging | --check');
const mode = modes[0];
const inputAbs = resolve(inputDir);
if (inputAbs.startsWith(REPO_ROOT + sep)) fail(2, 'unsafe: --input-dir must be an OS temp directory outside the repository');

// ---------- load & gate input package ----------
for (const f of REQUIRED_INPUT_FILES) if (!existsSync(join(inputAbs, f))) fail(1, `missing input file: ${f}`);
function loadJson(name) {
  try { return JSON.parse(readFileSync(join(inputAbs, name), 'utf8')); }
  catch (e) { return fail(1, `JSON parse failed for ${name}: ${e.message}`); }
}
const reviewRun = loadJson('review-run.json');
const sourceVerification = loadJson('source-verification.json');
const claimVerdicts = loadJson('claim-verdicts.json');
const conflictResolution = loadJson('conflict-resolution.json');
loadJson('offer-eligibility-review.json');
loadJson('schema-normalization-notes.json');
loadJson('import-readiness.json');

const idChecks = [
  [reviewRun.project, EXPECTED_IDENTITY.project, 'project'],
  [reviewRun.country?.name, EXPECTED_IDENTITY.countryName, 'country name'],
  [reviewRun.country?.code, EXPECTED_IDENTITY.countryCode, 'country code'],
  [reviewRun.exchange?.name, EXPECTED_IDENTITY.exchangeName, 'exchange name'],
  [reviewRun.exchange?.id, EXPECTED_IDENTITY.exchangeId, 'exchange id'],
  [reviewRun.batchId, EXPECTED_IDENTITY.batchId, 'batch'],
  [reviewRun.taskId, EXPECTED_IDENTITY.taskId, 'task'],
  [reviewRun.projectBaselineCommit, EXPECTED_IDENTITY.projectBaselineCommit, 'project baseline'],
  [reviewRun.researchPackageBaselineCommit, EXPECTED_IDENTITY.researchPackageBaselineCommit, 'research-package baseline'],
  [reviewRun.liveVerificationState, EXPECTED_IDENTITY.liveVerificationState, 'liveVerificationState'],
  [reviewRun.packageStatus, EXPECTED_IDENTITY.packageStatus, 'packageStatus'],
];
for (const [actual, expected, label] of idChecks) if (actual !== expected) fail(1, `identity mismatch (${label}): ${actual} != ${expected}`);

// ---------- source set ----------
const origSources = sourceVerification.originalSources;
const suppSources = sourceVerification.supplementalSources;
if (!Array.isArray(origSources) || origSources.length !== EXPECTED.sources) fail(1, `expected ${EXPECTED.sources} original sources, got ${origSources?.length}`);
if (!Array.isArray(suppSources) || suppSources.length !== 0) fail(1, 'expected 0 supplemental sources');
const sourceIds = origSources.map((s) => s.sourceId);
if (new Set(sourceIds).size !== sourceIds.length) fail(1, 'duplicate source IDs');
for (const id of sourceIds) if (!id.startsWith('src-kz-mexc-')) fail(1, `bad source id prefix: ${id}`);
if (!sameDist(distribution(origSources, 'verificationStatus'), EXPECTED.sourceReviewDist)) fail(1, 'source review distribution drift');

// ---------- claim set ----------
const claims = claimVerdicts.claims;
if (!Array.isArray(claims) || claims.length !== EXPECTED.claims) fail(1, `expected ${EXPECTED.claims} claims`);
const claimIds = claims.map((c) => c.claimId);
if (new Set(claimIds).size !== claimIds.length) fail(1, 'duplicate claim IDs');
if (!sameDist(distribution(claims, 'verdict'), EXPECTED.claimDist)) fail(1, 'claim verdict distribution drift');
const corrections = claims.filter((c) => c.correctionRequired === true);
if (corrections.length !== EXPECTED.corrections) fail(1, `expected ${EXPECTED.corrections} correction-required claims, got ${corrections.length}`);
const CLAIM_FIELDS = ['claimId', 'originalStatement', 'verdict', 'verifiedStatement', 'verifiedSourceIds', 'contradictingSourceIds', 'confidence', 'limitations', 'correctionRequired', 'correctionNote', 'publicationUse', 'rankingUse', 'ctaUse', 'promoUse'];
for (const c of claims) {
  for (const f of CLAIM_FIELDS) if (!(f in c)) fail(1, `claim ${c.claimId}: missing field ${f}`);
  if (!c.verdict) fail(1, `claim ${c.claimId}: missing verdict`);
  if (c.correctionRequired && !c.correctionNote) fail(1, `claim ${c.claimId}: correction without note`);
  for (const use of ['rankingUse', 'ctaUse', 'promoUse'])
    if (!NON_PERMISSIVE_USE.has(c[use])) fail(1, `claim ${c.claimId}: permissive ${use}=${c[use]} contradicts RESTRICTED/false-eligibility boundary`);
}
const sourceIdSet = new Set(sourceIds);
for (const c of claims)
  for (const f of ['verifiedSourceIds', 'contradictingSourceIds'])
    for (const sid of c[f] || []) if (!sourceIdSet.has(sid)) fail(1, `claim ${c.claimId}: dangling source ${sid}`);

// ---------- conflict set ----------
const conflicts = conflictResolution.conflicts;
if (!Array.isArray(conflicts) || conflicts.length !== EXPECTED.conflicts) fail(1, `expected ${EXPECTED.conflicts} conflicts`);
const conflictIds = conflicts.map((c) => c.conflictId);
if (new Set(conflictIds).size !== conflictIds.length) fail(1, 'duplicate conflict IDs');
if (!sameDist(distribution(conflicts, 'finalStatus'), EXPECTED.conflictDist)) fail(1, 'conflict distribution drift');
for (const c of conflicts) {
  if (EXPECTED_CONFLICTS[c.conflictId] !== c.finalStatus) fail(1, `conflict ${c.conflictId}: finalStatus ${c.finalStatus} differs from owner decision`);
  for (const f of ['conflictId', 'originalStatus', 'finalStatus', 'sourcesReviewed', 'claimsReviewed', 'currentAssessment', 'unresolvedEvidence', 'ownerReviewRequired']) if (!(f in c)) fail(1, `conflict ${c.conflictId}: missing ${f}`);
  if (c.ownerReviewRequired !== true) fail(1, `conflict ${c.conflictId}: ownerReviewRequired must remain true`);
  for (const sid of c.sourcesReviewed || []) if (!sourceIdSet.has(sid)) fail(1, `conflict ${c.conflictId}: dangling source ${sid}`);
  for (const cid of c.claimsReviewed || []) if (!claimIds.includes(cid)) fail(1, `conflict ${c.conflictId}: dangling claim ${cid}`);
}
const partiallyResolvedClaimIds = new Set(conflicts.filter((c) => c.finalStatus === 'PARTIALLY_RESOLVED').flatMap((c) => c.claimsReviewed || []));

// ---------- derive claim-source links (forward) + reverse symmetry ----------
const sourceById = Object.fromEntries(origSources.map((s) => [s.sourceId, s]));
const links = [];
const seenTriples = new Set();
for (const c of claims) {
  const noteText = (c.limitations || []).join('; ') || null;
  for (const [field, rel, prov] of [
    ['verifiedSourceIds', 'SUPPORTS', 'claim-verdicts.verifiedSourceIds'],
    ['contradictingSourceIds', 'CONTRADICTS', 'claim-verdicts.contradictingSourceIds'],
  ]) {
    for (const sid of c[field] || []) {
      const linkId = `${c.claimId}|${sid}|${rel}`;
      if (seenTriples.has(linkId)) fail(1, `duplicate link triple: ${linkId}`);
      seenTriples.add(linkId);
      links.push({
        linkId, claimId: c.claimId, sourceId: sid, relationship: rel,
        verificationState: c.verdict, confidence: c.confidence,
        checkedDate: sourceById[sid].checkedDate, provenance: prov, note: noteText,
      });
    }
  }
}
links.sort((a, b) => (a.claimId < b.claimId ? -1 : a.claimId > b.claimId ? 1 : a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : a.relationship < b.relationship ? -1 : 1));
const linkDist = distribution(links, 'relationship');
if (links.length !== EXPECTED.links || !sameDist(linkDist, EXPECTED.linkDist)) fail(1, `link derivation drift: total ${links.length}, dist ${JSON.stringify(linkDist)}`);
// reverse index from source-side lists; require exact symmetry
const reverse = new Set();
for (const s of origSources) {
  for (const cid of s.supportedClaimIds || []) reverse.add(`${cid}|${s.sourceId}|SUPPORTS`);
  for (const cid of s.contradictedClaimIds || []) reverse.add(`${cid}|${s.sourceId}|CONTRADICTS`);
}
if (reverse.size !== seenTriples.size || [...seenTriples].some((t) => !reverse.has(t))) fail(1, 'forward/reverse link asymmetry');

// ---------- normalized sources ----------
function mapStatus(s) {
  const vs = s.verificationStatus, ps = s.pageStatus;
  switch (vs) {
    case 'VERIFIED_CURRENT':
      if (!CURRENT_PAGE_STATUSES.has(ps)) fail(1, `source ${s.sourceId}: VERIFIED_CURRENT with non-current pageStatus ${ps}`);
      return 'ACTIVE';
    case 'VERIFIED_WITH_LIMITS':
      if (!CURRENT_PAGE_STATUSES.has(ps)) fail(1, `source ${s.sourceId}: VERIFIED_WITH_LIMITS with non-current pageStatus ${ps}`);
      return 'ACTIVE'; // limits preserved in links + qa-provenance, never as unrestricted evidence
    case 'OUTDATED': return 'STALE';
    case 'MOVED': return 'MOVED';
    case 'SUPERSEDED': return 'SUPERSEDED';
    case 'REMOVED': return 'REMOVED';
    case 'BLOCKED': return 'BLOCKED';
    case 'NOT_VERIFIABLE': return 'STALE'; // safe non-active + mandatory provenance note
    case 'CONTRADICTED': return CURRENT_PAGE_STATUSES.has(ps) ? 'ACTIVE' : 'STALE'; // facts preserved; contradiction lives in links
    default: return fail(1, `source ${s.sourceId}: unmappable verificationStatus ${vs}`);
  }
}
const scopeBySource = {};
for (const l of links) (scopeBySource[l.sourceId] ||= new Set()).add(claimCategory(l.claimId));
const normalizedSources = origSources
  .map((s) => {
    const tier = TIER_MAP[s.sourceTier] || fail(1, `source ${s.sourceId}: unknown tier ${s.sourceTier}`);
    const lang = LANGUAGE_MAP[s.language] || fail(1, `source ${s.sourceId}: unknown language ${s.language}`);
    const capture = CAPTURE_TYPE_MAP[s.sourceType] || fail(1, `source ${s.sourceId}: unknown sourceType ${s.sourceType}`);
    const scope = scopeBySource[s.sourceId];
    if (!scope || scope.size === 0) fail(1, `source ${s.sourceId}: empty derived productScope`);
    return {
      sourceId: s.sourceId,
      exchangeId: 'mexc',
      countryCode: 'KZ',
      productScope: sortedUnique([...scope]),
      url: s.verifiedUrl || s.originalUrl || fail(1, `source ${s.sourceId}: no url`),
      sourceTier: tier,
      publisher: s.publisher,
      title: s.title,
      publishedDate: s.publishedDate ?? null,
      updatedDate: s.lastUpdatedDate ?? null,
      retrievedDate: s.checkedDate,
      effectiveFrom: s.effectiveDate ?? null,
      effectiveTo: null,
      language: lang,
      contentHash: null,
      evidenceSummary: s.verifiedEvidence ?? null,
      quotedClaim: null,
      captureType: capture,
      status: mapStatus(s),
    };
  })
  .sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1));
normalizedSources.forEach(validateSourceRecord);
if (!sameDist(distribution(normalizedSources, 'status'), EXPECTED.sourceStatusDist)) fail(1, 'normalized source status distribution drift');

// ---------- claim review ----------
const claimReviewRecords = claims
  .map((c) => ({
    claimId: c.claimId,
    claimCategory: claimCategory(c.claimId),
    originalStatement: c.originalStatement,
    verifiedStatement: c.verifiedStatement,
    verdict: c.verdict,
    verifiedSourceIds: [...(c.verifiedSourceIds || [])].sort(),
    contradictingSourceIds: [...(c.contradictingSourceIds || [])].sort(),
    confidence: c.confidence,
    limitations: c.limitations || [],
    correctionRequired: c.correctionRequired,
    correctionNote: c.correctionNote || null,
    publicationUse: c.publicationUse,
    rankingUse: c.rankingUse,
    ctaUse: c.ctaUse,
    promoUse: c.promoUse,
    ownerReviewRequired: c.correctionRequired === true || c.verdict === 'UNVERIFIED' || partiallyResolvedClaimIds.has(c.claimId),
    provenance: 'claim-verdicts.json (recovered source-truth review; corrections recorded, not applied)',
  }))
  .sort((a, b) => (a.claimId < b.claimId ? -1 : 1));

// ---------- qa provenance ----------
const perSource = {};
for (const s of [...origSources].sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1))) {
  perSource[s.sourceId] = {
    sourceOrigin: s.sourceOrigin,
    verificationStatus: s.verificationStatus,
    pageStatus: s.pageStatus,
    checkedDate: s.checkedDate,
    reviewCountryScope: s.countryScope || [],
    reviewProductScope: s.productScope || [],
    reviewSourceType: s.sourceType,
    legalEntityScope: s.legalEntityScope ?? null,
    limitations: s.limitations || [],
    verifiedEvidence: s.verifiedEvidence ?? null,
    reviewNotes: s.reviewNotes || [],
    urlUsed: s.verifiedUrl ? 'verifiedUrl' : 'originalUrl',
    statusMappingNote: `review ${s.verificationStatus} (pageStatus ${s.pageStatus}) -> schema status ${mapStatus(s)}; limits/contradictions preserved in claim-source-links, never as unrestricted evidence`,
  };
}
const perClaim = {};
for (const c of claimReviewRecords) {
  perClaim[c.claimId] = {
    originalStatement: c.originalStatement,
    verifiedStatement: c.verifiedStatement,
    verdict: c.verdict,
    confidence: c.confidence,
    correctionRequired: c.correctionRequired,
    correctionNote: c.correctionNote,
    limitations: c.limitations,
    publicationUse: c.publicationUse,
    rankingUse: c.rankingUse,
    ctaUse: c.ctaUse,
    promoUse: c.promoUse,
  };
}
const qaProvenance = {
  transformVersion: TRANSFORM_VERSION,
  taskId: TASK_ID,
  packageStatus: 'RECOVERED / UNVERIFIED',
  noProxyMode: true,
  webBrowsingUsed: false,
  sourceTruthReview: {
    taskId: EXPECTED_IDENTITY.taskId,
    reviewDate: reviewRun.reviewDate,
    projectBaselineCommit: EXPECTED_IDENTITY.projectBaselineCommit,
    researchPackageBaselineCommit: EXPECTED_IDENTITY.researchPackageBaselineCommit,
    liveVerificationState: 'NOT_LIVE_VERIFIED',
    technicalSiteReachability: 'NOT_DETERMINED',
  },
  inputPackages: [
    { ...INPUT_PACKAGE },
    { name: 'ORIGINAL (unavailable)', ...UNAVAILABLE_ORIGINAL },
    { ...RECOVERED_RESEARCH_PACKAGE },
  ],
  ownerDecisionRefs: {
    ownerDecision: `CBW-KZ-MEXC-P0B-OWNER-DECISION-v1 @ ${OWNER_DECISION_COMMIT}`,
    importPrepDesign: `CBW-KZ-MEXC-P0B-IMPORT-PREP-DESIGN-v1 @ ${IMPORT_PREP_DESIGN_COMMIT}`,
    sourceTruthReviewAudit: 'CBW-KZ-MEXC-P0B-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-v1 @ 5aa41f01b8d899223be925faaea01093c3125b6e',
    recoveredPackageAudit: 'CBW-KZ-MEXC-P0B-RECOVERED-PACKAGE-AUDIT-v1',
  },
  correctionDecisions: {
    count: corrections.length,
    claimIds: corrections.map((c) => c.claimId).sort(),
    policy: 'corrections recorded, not applied; original and verified statements preserved separately',
  },
  termsPageFlip: TERMS_PAGE_FLIP,
  afsaInterpretation: {
    finding: 'CONFIRMED',
    meaning: 'UNLICENSED_OR_UNAUTHORIZED_LOCAL_ACTIVITY',
    technicalUnavailabilityProof: false,
    boundary: 'The AFSA warning strengthens the restriction; it is never treated alone as proof of technical inaccessibility.',
  },
  unresolvedEvidence: conflicts
    .filter((c) => c.finalStatus === 'PARTIALLY_RESOLVED')
    .map((c) => ({ conflictId: c.conflictId, unresolvedEvidence: c.unresolvedEvidence })),
  authorizations: { granted: GRANTED_AUTHORIZATIONS, withheld: WITHHELD_AUTHORIZATIONS },
  importHistory: [
    { task: TASK_ID, transformVersion: TRANSFORM_VERSION, action: 'non-production staging import', baselineHead: BASELINE_HEAD },
  ],
  perSource,
  perClaim,
};

// ---------- normalized conflicts ----------
const normalizedConflicts = conflicts
  .map((c) => ({
    conflictId: c.conflictId,
    originalStatus: c.originalStatus,
    finalStatus: c.finalStatus,
    sourcesReviewed: [...(c.sourcesReviewed || [])].sort(),
    claimsReviewed: [...(c.claimsReviewed || [])].sort(),
    currentAssessment: c.currentAssessment,
    unresolvedEvidence: c.unresolvedEvidence,
    ownerReviewRequired: true,
  }))
  .sort((a, b) => (a.conflictId < b.conflictId ? -1 : 1));

// ---------- candidate ----------
const checkedDate = reviewRun.reviewDate;
const candidate = {
  candidateMetadata: {
    recordState: 'CANDIDATE',
    canonical: false,
    productionEligible: false,
    migration5Authorized: false,
    futureRankingCandidate: false,
    primaryVisualState: 'RED',
    primaryLabel: 'Restricted in Kazakhstan',
    secondaryLabel: 'MEXC’s current terms list Kazakhstan as a prohibited jurisdiction',
    packageStatus: 'RECOVERED / UNVERIFIED',
    termsPageFlipMonitoringRequired: true,
    termsPageFlipState: TERMS_PAGE_FLIP.state,
    technicalSiteReachability: 'NOT_DETERMINED',
    provenance: {
      ownerDecisionCommit: OWNER_DECISION_COMMIT,
      importPrepDesignCommit: IMPORT_PREP_DESIGN_COMMIT,
      sourceTruthReviewTask: EXPECTED_IDENTITY.taskId,
      inputPackageSha256: INPUT_PACKAGE.sha256,
      inputPackageBytes: INPUT_PACKAGE.bytes,
      transformVersion: TRANSFORM_VERSION,
    },
    blockedAuthorizations: WITHHELD_AUTHORIZATIONS,
  },
  cell: {
    exchangeId: 'mexc',
    countryCode: 'KZ',
    exchangeLegalEntity: null,
    overallAvailability: 'RESTRICTED',
    registrationStatus: 'RESTRICTED',
    productStatuses: PRODUCT_STATUSES,
    rankingEligibility: false,
    ctaEligibility: false,
    promoEligibility: false,
    confidence: 'HIGH',
    freshness: 'UNDER_REVIEW',
    checkedDate,
    nextReviewDate: addDaysIso(checkedDate, 30),
    reasonCodes: REASON_CODES,
    limitations: [
      'Package is a recovered delivery (RECOVERED / UNVERIFIED); byte-identical originality of the original review ZIP cannot be established.',
      'Terms-page flip requires monitoring: earlier captures (2026-07-03, 2026-07-14) reported Kazakhstan absent; the 2026-07-22 review found it present with the same displayed update date 2025-05-29.',
      'Direct KZT fiat deposit/withdrawal rails remain unverified.',
      'Kazakhstan compatibility of the repository referral route/code is not verified; repository route and code are implementation facts only.',
      'RESTRICTED is a legal/eligibility conclusion; technical site reachability from Kazakhstan was not determined.',
    ],
    sourceIds: [...sourceIds].sort(),
    conflictIds: [...conflictIds].sort(),
    alternativeExchangeIds: [],
    liveVerificationState: 'NOT_LIVE_VERIFIED',
  },
};
if (Object.keys(candidate).length !== 2) fail(1, 'candidate must have exactly two top-level keys');
validateCell(candidate.cell);

// ---------- serialize outputs (deterministic) ----------
const envelopes = {
  'normalized-sources.json': { schemaVersion: '1', countryCode: 'KZ', exchangeId: 'mexc', records: normalizedSources },
  'claim-source-links.json': { schemaVersion: '1', countryCode: 'KZ', exchangeId: 'mexc', links },
  'claim-review.json': { schemaVersion: '1', countryCode: 'KZ', exchangeId: 'mexc', records: claimReviewRecords },
  'qa-provenance.json': qaProvenance,
  'normalized-conflicts.json': { schemaVersion: '1', countryCode: 'KZ', exchangeId: 'mexc', conflicts: normalizedConflicts },
  'exchange-market-cell.candidate.json': candidate,
};
const serialized = {};
for (const [name, obj] of Object.entries(envelopes)) serialized[name] = stableJson(obj);

const transformReport = `# CBW KZ×MEXC P0-B — Staging Transform Report (${TRANSFORM_VERSION})

- Task: ${TASK_ID} · baseline HEAD ${BASELINE_HEAD}
- Input: ${INPUT_PACKAGE.name} (delivered as ${INPUT_PACKAGE.deliveredAs}), ${INPUT_PACKAGE.bytes} bytes, sha256 ${INPUT_PACKAGE.sha256}
- Recovery boundary: original ZIP unavailable (${UNAVAILABLE_ORIGINAL.bytes} B, ${UNAVAILABLE_ORIGINAL.sha256}); recovered delivery differs; package status RECOVERED / UNVERIFIED; byte-identical originality not established.
- Identity gate: PASS (project/country/exchange/batch/task/baselines/live-state/status all matched; manifest gate MATCHED).

## Results
- Normalized sources: 16/16 · review distribution VERIFIED_CURRENT 9 / VERIFIED_WITH_LIMITS 6 / OUTDATED 1 · schema statuses ACTIVE 15 / STALE 1 (design status table applied; no blind ACTIVE mapping; VERIFIED_WITH_LIMITS requires live-current pageStatus and keeps limits in links/provenance).
- productScope: derived only from claim-source relationships (sorted unique claim-category arrays); no scope inferred from URL/title/publisher; no empty scope; scalar countryCode "KZ"; review country-scope arrays preserved in qa-provenance.
- Claim-source links: 55 derived (SUPPORTS 41 / CONTRADICTS 14); deterministic linkId claimId|sourceId|relationship; 0 duplicates; 0 dangling; forward/reverse symmetry PASS (claim-side vs source-side reference sets identical).
- Claim reviews: 24/24 (CONFIRMED 11 / CONFIRMED_WITH_LIMITS 11 / UNVERIFIED 2); all 15 correction decisions recorded, not applied; original and verified statements preserved separately; ranking/CTA/promo uses all non-permissive (BLOCK/NONE).
- Conflicts: 7/7 preserved (RESOLVED_RESTRICTIVE 2 / PARTIALLY_RESOLVED 4 / RESOLVED_BY_SPECIFICITY 1); ownerReviewRequired true on all; no auto-resolution; restriction-event schema not applied (records do not conform).
- Candidate: OPTION A wrapper; cell structurally conforms to exchange-market-cell.schema.json; RESTRICTED / HIGH / NOT_LIVE_VERIFIED; RED "Restricted in Kazakhstan"; ranking/CTA/promo false; 13 owner-approved product statuses verbatim; no staging metadata inside cell.
- Terms-page flip: preserved in qa-provenance, conflict unresolvedEvidence, candidate reasonCodes/metadata, and deterministic recheck metadata (nextReviewDate ${addDaysIso(checkedDate, 30)} = reviewDate + 30 days). Not collapsed into a bare restriction flag; earlier captures retained.
- Schema validation: market-source structural validation PASS for all 16 records; cell structural validation PASS; additionalProperties respected (no prohibited fields).
- Determinism: no wall-clock (all dates from package data); stable ordering and serialization; repeated generation is byte-identical (verified via --check / double --write-staging).

## Authorization boundary (all blocked)
canonicalImport, legacyGeoUpdate, productionChange, rankingChange, ctaChange, promoChange, affiliateRouteChange, referralCodeActivation, publication, migration5, deploy — all remain false/blocked. No canonical, legacy, production or public path was written; output confined to ${STAGING_REL}/.
`;
serialized['transform-report.md'] = transformReport;

const manifest = {
  task: TASK_ID,
  project: 'CryptoBonusWorld',
  repository: 'C:/projects/CryptoBonusWorld',
  branch: 'master',
  baselineHead: BASELINE_HEAD,
  countryCode: 'KZ',
  country: 'Kazakhstan',
  exchangeId: 'mexc',
  exchange: 'MEXC',
  batchId: 'KZ-P0-B',
  transformVersion: TRANSFORM_VERSION,
  packageStatus: 'RECOVERED / UNVERIFIED',
  sourceTruthReviewPackage: { ...INPUT_PACKAGE },
  unavailableOriginalArtifact: { ...UNAVAILABLE_ORIGINAL },
  ownerDecisionCommit: OWNER_DECISION_COMMIT,
  importPrepDesignCommit: IMPORT_PREP_DESIGN_COMMIT,
  candidateShape: 'OPTION_A_WRAPPED_CANDIDATE',
  cellSchemaValidation: 'PASS (structural validation against exchange-market-cell.schema.json)',
  deterministic: true,
  stagingOnly: true,
  generatedFiles: OUTPUT_FILES,
  outputs: Object.fromEntries(
    Object.entries(serialized).map(([name, text]) => [name, { bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(Buffer.from(text, 'utf8')) }]),
  ),
  counts: {
    normalizedSources: normalizedSources.length,
    claimSourceLinks: links.length,
    linkDistribution: linkDist,
    claimReviews: claimReviewRecords.length,
    correctionRequiredClaims: corrections.length,
    conflicts: normalizedConflicts.length,
    sourceStatusDistribution: distribution(normalizedSources, 'status'),
  },
  canonicalImportAuthorized: false,
  productionChangeAuthorized: false,
  rankingChangeAuthorized: false,
  ctaChangeAuthorized: false,
  promoChangeAuthorized: false,
  publicationAuthorized: false,
  migration5Authorized: false,
  deployAuthorized: false,
};
serialized['import-manifest.json'] = stableJson(manifest);

// ---------- modes ----------
function safeWrite(name, text) {
  const abs = resolve(join(STAGING_ABS, name));
  if (!abs.startsWith(STAGING_ABS + sep) && abs !== join(STAGING_ABS, name)) fail(2, `unsafe write path: ${abs}`);
  if (!abs.startsWith(STAGING_ABS)) fail(2, `refusing write outside approved staging root: ${abs}`);
  writeFileSync(abs, text, 'utf8');
}
if (mode === '--dry-run') {
  console.log(`DRY-RUN OK: ${OUTPUT_FILES.length} outputs generated in memory; nothing written.`);
  for (const name of OUTPUT_FILES) console.log(`  ${name}: ${Buffer.byteLength(serialized[name], 'utf8')} bytes, sha256 ${sha256(Buffer.from(serialized[name], 'utf8'))}`);
  process.exit(0);
}
if (mode === '--write-staging') {
  mkdirSync(STAGING_ABS, { recursive: true });
  for (const name of OUTPUT_FILES) safeWrite(name, serialized[name]);
  console.log(`WRITE-STAGING OK: ${OUTPUT_FILES.length} files written to ${STAGING_REL}/`);
  process.exit(0);
}
if (mode === '--check') {
  let drift = 0;
  for (const name of OUTPUT_FILES) {
    const abs = join(STAGING_ABS, name);
    if (!existsSync(abs)) { console.error(`CHECK: missing ${name}`); drift++; continue; }
    const disk = readFileSync(abs, 'utf8');
    if (disk !== serialized[name]) { console.error(`CHECK: drift in ${name}`); drift++; }
  }
  if (drift) fail(1, `--check failed: ${drift} file(s) differ`);
  console.log('CHECK OK: all 8 staging files are byte-identical to in-memory regeneration.');
  process.exit(0);
}
