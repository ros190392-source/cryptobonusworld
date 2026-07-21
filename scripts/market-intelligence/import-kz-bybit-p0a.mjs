#!/usr/bin/env node
/**
 * CBW KZ×Bybit P0-A — deterministic STAGING import (non-production).
 *
 * Executes the owner-approved deterministic transform
 * (owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_OWNER_DECISION_AND_IMPORT_PREP_v1.json)
 * over the recovered ORIGINAL research package + the source-truth REVIEW package, producing
 * normalized research records and one NON-PRODUCTION exchange-market-cell CANDIDATE under
 * research/market-intelligence/staging/kz/bybit/p0a-v1/.
 *
 * STAGING ONLY: writes nothing outside the approved staging dir; creates no canonical record,
 * no MI cell, no production/ranking/CTA/promo behavior. Deterministic (no wall-clock, no network,
 * no child process, no git); Node built-ins only; package.json unchanged.
 *
 * Usage:
 *   node scripts/market-intelligence/import-kz-bybit-p0a.mjs --input-dir <DIR> --dry-run
 *   node scripts/market-intelligence/import-kz-bybit-p0a.mjs --input-dir <DIR> --write-staging
 *   node scripts/market-intelligence/import-kz-bybit-p0a.mjs --input-dir <DIR> --check
 *
 * Exit codes: 0 success · 1 validation/input error · 2 unsafe mode / overwrite refusal
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STAGING_REL = 'research/market-intelligence/staging/kz/bybit/p0a-v1';
const STAGING_ABS = join(REPO_ROOT, STAGING_REL);
const TRANSFORM_VERSION = 'kz-bybit-p0a-v1';
const OWNER_DECISION_COMMIT = '0fa0791b4a5255b662ed67cf6df6033ed53a55cd';
const OWNER_DECISION_ID = 'CBW-KZ-BYBIT-P0A-OWNER-DECISION-AND-IMPORT-PREP-v1';
const OWNER_REVIEW_COMMIT = 'e084d64c36f68be01881b635e6202aea28165ca3';
const RESHAPE_TASK = 'CBW-KZ-BYBIT-P0A-CANDIDATE-RESHAPE-002';

// Input package identities (for the manifest; the script consumes the extracted --input-dir).
const INPUT_PACKAGES = [
  { name: 'CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip', sha256: 'a6d7d262c47018b55fe07cf42837d69c1d3f14e6e9650ebcdedda328962a4234', role: 'source-truth review package' },
  { name: 'CBW_KZ_BYBIT_P0A_RESEARCH_PACKAGE_v2_RECOVERED.zip', sha256: '7796d015c123e4b1c1dc39724740c13bc001399e2763f5b073d84e867eb3a854', role: 'recovered original research package (inside CBW_KZ_BYBIT_SOURCE_TRUTH_REVIEW_INPUT_v2.zip)' },
];

const SCHEMA_TIER = ['A', 'B', 'C', 'D'];
const SCHEMA_STATUS = ['ACTIVE', 'MOVED', 'REMOVED', 'SUPERSEDED', 'BLOCKED', 'STALE'];
const SCHEMA_CAPTURE = ['HTML', 'PDF', 'SCREENSHOT', 'API', 'DATASET', 'MANUAL_BROWSER', 'NEWS'];

// Owner-approved corrections (verbatim intent from the owner decision record).
const CORRECTIONS = {
  'clm-kz-bybit-entity-003': 'Core Bybit Limited entity applies to the local trading platform, not automatically to every ancillary bybit.kz program.',
  'clm-kz-bybit-registration-002': 'Resident-only wording is incomplete without the newer foreign-national announcement and conflict note.',
  'clm-kz-bybit-offer-001': 'Referral-code entry exists, but global-code compatibility with Bybit Kazakhstan remains unverified.',
  'clm-kz-bybit-offer-002': 'Replace the old "no local amount verified" claim: two separate local programs exist (up to 1,032 USDT local referral; separate 2,500 USDT Kazakhstan campaign prize pool). Never combine; never treat as global advertised maximum; never authorize CTA/promo.',
};
const OFFER_AMOUNTS = { localReferralUpToUsdt: 1032, kazakhstanCampaignPrizePoolUsdt: 2500, combined: false, isGlobalMaximum: false };

// Owner-approved candidate product direction (equal-or-more-conservative than exchange-country-findings).
const PRODUCT_STATUSES = {
  registration: 'AVAILABLE_WITH_LIMITS', kyc: 'AVAILABLE_WITH_LIMITS', spot: 'AVAILABLE',
  derivatives: 'AVAILABLE_WITH_LIMITS', margin: 'AVAILABLE_WITH_LIMITS', p2p: 'AVAILABLE_WITH_LIMITS',
  kzt_p2p: 'AVAILABLE', direct_kzt_deposit: 'AVAILABLE_WITH_LIMITS', direct_kzt_withdrawal: 'AVAILABLE_WITH_LIMITS',
  bank_card_purchase: 'CONFLICTING', bybit_card: 'AVAILABLE_WITH_LIMITS', referral: 'UNKNOWN', promotions: 'AVAILABLE_WITH_LIMITS',
};
const PRODUCT_RATIONALE = {
  registration: 'Local bybit.kz registration confirmed; residency/citizenship scope partially resolved (cf-kz-bybit-001).',
  kyc: 'Mandatory KYC confirmed; accepted-document scope differs (individual vs business).',
  spot: 'Spot confirmed on local bybit.kz materials.',
  derivatives: 'Perps/expiry/options confirmed; user-level KYC/region conditions apply.',
  margin: 'Documented with risk-tier limits (cross/portfolio; not isolated for spot margin).',
  p2p: 'Available but KYC-required — more conservative than ECF AVAILABLE (identity-verification limit).',
  kzt_p2p: 'Dedicated KZT P2P market page confirmed.',
  direct_kzt_deposit: 'KZT bank transfer supported but identity-bound (IIN/BIN match, no third-party) — conservative vs ECF AVAILABLE.',
  direct_kzt_withdrawal: 'KZT bank transfer/IBAN supported but identity-bound — conservative vs ECF AVAILABLE.',
  bank_card_purchase: 'bybit.kz vs bybit.com routing unresolved (cf-kz-bybit-002) — CONFLICTING.',
  bybit_card: 'Local AIFC card docs exist with supported-country/eligibility limits.',
  referral: 'Referral-code entry exists but global-code compatibility UNVERIFIED (clm-kz-bybit-offer-001).',
  promotions: 'Local promo programs exist but campaign-specific eligibility; amounts kept separate; no CTA/promo.',
};
const LIMITATION_AREAS = [
  'registration/residency/citizenship rules remain partially resolved',
  'bybit.kz is the confirmed local route for core trading and KZT rails, but some bybit.com / card / referral routing remains partially resolved',
  'global referral-code compatibility remains unverified',
  'Kazakhstan promotional eligibility is narrower than platform availability',
  'local promotional amounts exist, but they must not be confused with a globally advertised maximum',
  'liveVerificationState remains NOT_LIVE_VERIFIED',
];

// Owner-approved claim-category → productScope map (CBW_KZ_BYBIT_P0A_CANDIDATE_OWNER_REVIEW_v1.json
// controlledDecisions.productScope.claimCategoryToScopeMap). Multi-value where a category spans products.
const CLAIM_CATEGORY_TO_SCOPE = {
  legal_entity: ['entity'], jurisdiction: ['entity'], regulation: ['regulation'],
  registration: ['registration'], kyc: ['kyc'], restrictions: ['restrictions'],
  spot: ['spot'], derivatives: ['derivatives'], margin_and_leverage: ['margin'],
  p2p: ['p2p'], kzt_p2p: ['kzt_p2p'],
  direct_fiat_deposit: ['direct_kzt_deposit'], direct_fiat_withdrawal: ['direct_kzt_withdrawal'],
  payments_restrictions: ['direct_kzt_deposit', 'direct_kzt_withdrawal'],
  cards_and_bank_transfers: ['cards', 'bank_card_purchase'], cards: ['bybit_card', 'cards'],
  earn: ['earn'], other_products: ['other_products'], applications: ['applications'],
  language_and_support: ['language_support'], offer_eligibility: ['referral', 'promotions'],
};
// Relationships that contribute productScope: a source affirmatively speaks to that product area.
// SUPPORTS/LIMITS = verified supported claims (fully / with limits). CONTRADICTS (counter-evidence) and
// CONTEXT (non-verified) are EXCLUDED so a source is never converted into direct positive product support.
const SCOPE_RELATIONSHIPS = new Set(['SUPPORTS', 'LIMITS']);

// exchange-market-cell.schema.json contract (committed; additionalProperties:false). Structural
// contract validation — NOT a third-party JSON-Schema engine.
const CELL_CONTRACT = {
  required: ['exchangeId', 'countryCode', 'overallAvailability', 'registrationStatus', 'productStatuses', 'rankingEligibility', 'ctaEligibility', 'confidence', 'checkedDate', 'sourceIds'],
  props: {
    exchangeId: { type: 'string' },
    countryCode: { type: 'string', len2: true },
    exchangeLegalEntity: { type: ['string', 'null'] },
    overallAvailability: { enum: ['AVAILABLE', 'AVAILABLE_WITH_LIMITS', 'RESTRICTED', 'UNAVAILABLE', 'UNDER_REVIEW', 'CONFLICTING', 'UNKNOWN', 'STALE'] },
    registrationStatus: { type: 'string' },
    productStatuses: { type: 'object', stringValues: true },
    rankingEligibility: { type: 'boolean' },
    ctaEligibility: { type: 'boolean' },
    promoEligibility: { type: ['boolean', 'null'] },
    confidence: { enum: ['LOW', 'MEDIUM', 'HIGH'] },
    freshness: { enum: ['CURRENT', 'DUE_SOON', 'STALE', 'UNDER_REVIEW', 'CONFLICTING'] },
    checkedDate: { type: 'string', date: true },
    nextReviewDate: { type: ['string', 'null'], date: true },
    reasonCodes: { type: 'array', items: 'string' },
    limitations: { type: 'array', items: 'string' },
    sourceIds: { type: 'array', items: 'string' },
    conflictIds: { type: 'array', items: 'string' },
    alternativeExchangeIds: { type: 'array', items: 'string' },
    liveVerificationState: { enum: ['LIVE_VERIFIED', 'NOT_LIVE_VERIFIED', 'NOT_APPLICABLE', 'UNKNOWN'] },
  },
};

/* ---------------- helpers ---------------- */
function err(m) { console.error(`ERROR: ${m}`); process.exit(1); }
function refuse(m) { console.error(`REFUSED: ${m}`); process.exit(2); }
function ser(obj) { return JSON.stringify(obj, null, 2) + '\n'; }
function sha256(s) { return createHash('sha256').update(Buffer.isBuffer(s) ? s : Buffer.from(s, 'utf8')).digest('hex'); }
function readJSON(dir, name) {
  const p = join(dir, name);
  if (!existsSync(p)) err(`missing required input file: ${name} (in --input-dir)`);
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { err(`could not parse ${name}: ${e.message}`); }
}
function normTier(v) {
  if (typeof v !== 'string') return null;
  const t = v.startsWith('TIER_') ? v.slice(5) : v;
  return SCHEMA_TIER.includes(t) ? t : null;
}

function parseArgs(argv) {
  const a = { inputDir: null, mode: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--input-dir') a.inputDir = argv[++i];
    else if (t.startsWith('--input-dir=')) a.inputDir = t.slice(12);
    else if (t === '--dry-run') a.mode = a.mode || 'dry-run';
    else if (t === '--write-staging') a.mode = a.mode || 'write-staging';
    else if (t === '--check') a.mode = a.mode || 'check';
    else if (t === '--help' || t === '-h') a.mode = 'help';
    else err(`unknown argument: ${t}`);
  }
  return a;
}

/* ---------------- transform (pure, deterministic) ---------------- */
function build(inputDir) {
  const sreg = readJSON(inputDir, 'source-registry.json');       // original 39
  const sver = readJSON(inputDir, 'source-verification.json');   // review 43
  const cledger = readJSON(inputDir, 'claim-ledger.json');       // original 41
  const cverd = readJSON(inputDir, 'claim-verdicts.json');       // review 41
  const confOrig = readJSON(inputDir, 'conflicts.json');         // original 2
  const confRev = readJSON(inputDir, 'conflict-resolution.json');// review 2

  const sregMap = new Map(sreg.map((s) => [s.sourceId, s]));
  const revClaims = cverd.claims;
  const ledgerMap = new Map(cledger.map((c) => [c.claimId, c]));
  const claimCategory = new Map(cledger.map((c) => [c.claimId, c.category]));
  const claimIds = new Set(revClaims.map((c) => c.claimId));

  // --- normalized market-source records (schema fields only) ---
  const normSources = [];
  const diagnostics = [];
  for (const rv of sver.sources) {
    const o = sregMap.get(rv.sourceId) || {};
    const tier = normTier(rv.sourceTier) || normTier(rv.tier) || normTier(o.sourceTier);
    if (!tier) err(`source ${rv.sourceId}: no resolvable sourceTier in {A,B,C,D}`);
    const status = rv.currentStatus; // from source-truth review currentStatus, NEVER from REVIEWED
    if (!SCHEMA_STATUS.includes(status)) err(`source ${rv.sourceId}: currentStatus "${status}" not in market-source status enum (REVIEWED never mapped to ACTIVE)`);
    const capture = rv.captureType || (o.sourceType ? 'HTML' : null);
    if (!SCHEMA_CAPTURE.includes(capture)) err(`source ${rv.sourceId}: captureType "${capture}" not in enum`);
    const retrieved = rv.checkedDate || o.retrievedDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved || '')) err(`source ${rv.sourceId}: retrievedDate not ISO date`);
    normSources.push({
      sourceId: rv.sourceId,
      exchangeId: 'bybit',
      countryCode: 'KZ',
      url: rv.url,
      sourceTier: tier,
      publisher: rv.publisher,
      title: rv.title ?? null,
      publishedDate: o.publishedDate ?? null,
      updatedDate: null, // no verified official page metadata → null (never fabricate)
      retrievedDate: retrieved,
      effectiveFrom: o.effectiveFrom ?? null,
      effectiveTo: null,
      language: o.language ?? rv.language ?? null,
      contentHash: o.contentHash ?? null,
      captureType: capture,
      status,
    });
  }
  normSources.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const sourceIds = new Set(normSources.map((s) => s.sourceId));

  // --- claim-source links ---
  const relFor = (vs) => ({ CONFIRMED: 'SUPPORTS', CONFIRMED_WITH_LIMITS: 'LIMITS', CONTRADICTED: 'CONTRADICTS' }[vs] || 'CONTEXT');
  const linkMap = new Map(); // key claimId|sourceId
  for (const c of revClaims) {
    for (const sid of (c.verifiedSources || [])) {
      if (!sourceIds.has(sid)) err(`dangling link: claim ${c.claimId} -> unknown source ${sid}`);
      const key = `${c.claimId}|${sid}`;
      linkMap.set(key, { linkId: key, claimId: c.claimId, sourceId: sid, relationship: relFor(c.verificationState), verificationState: c.verificationState, checkedDate: c.checkedDate, provenance: 'claim-verdicts.verifiedSources' });
    }
  }
  for (const s of sver.sources) {
    for (const cid of (s.supportedClaimIds || [])) {
      if (!claimIds.has(cid)) err(`dangling link: source ${s.sourceId} -> unknown claim ${cid}`);
      const key = `${cid}|${s.sourceId}`;
      if (!linkMap.has(key)) linkMap.set(key, { linkId: key, claimId: cid, sourceId: s.sourceId, relationship: 'CONTEXT', verificationState: null, checkedDate: s.checkedDate ?? null, provenance: 'source-verification.supportedClaimIds' });
    }
  }
  const links = [...linkMap.values()].sort((a, b) => (a.claimId + '|' + a.sourceId).localeCompare(b.claimId + '|' + b.sourceId));

  // --- productScope (deterministic, derived from verified supported claim categories) ---
  // For each source: sorted unique union of scope tokens over the categories of the claims it
  // supports (SUPPORTS/LIMITS links). CONTRADICTS/CONTEXT excluded; empty array if none.
  const scopeSets = new Map();
  for (const lk of links) {
    if (!SCOPE_RELATIONSHIPS.has(lk.relationship)) continue;
    const cat = claimCategory.get(lk.claimId);
    const toks = CLAIM_CATEGORY_TO_SCOPE[cat] || [];
    if (!scopeSets.has(lk.sourceId)) scopeSets.set(lk.sourceId, new Set());
    for (const t of toks) scopeSets.get(lk.sourceId).add(t);
  }
  // Rebuild normalized sources with productScope in schema field order (after countryCode).
  const scopedSources = normSources.map((s) => ({
    sourceId: s.sourceId,
    exchangeId: s.exchangeId,
    countryCode: s.countryCode,
    productScope: [...(scopeSets.get(s.sourceId) || [])].sort(),
    // claimType intentionally omitted (optional on market-source; a source spans multiple categories).
    url: s.url,
    sourceTier: s.sourceTier,
    publisher: s.publisher,
    title: s.title,
    publishedDate: s.publishedDate,
    updatedDate: s.updatedDate,
    retrievedDate: s.retrievedDate,
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo,
    language: s.language,
    contentHash: s.contentHash,
    captureType: s.captureType,
    status: s.status,
  }));
  normSources.length = 0;
  normSources.push(...scopedSources);
  const scopeStats = {
    single: scopedSources.filter((s) => s.productScope.length === 1).length,
    multi: scopedSources.filter((s) => s.productScope.length > 1).length,
    empty: scopedSources.filter((s) => s.productScope.length === 0).length,
  };

  // --- QA / provenance ---
  const perSource = normSources.map((ns) => {
    const rv = sver.sources.find((s) => s.sourceId === ns.sourceId);
    const o = sregMap.get(ns.sourceId) || {};
    return {
      sourceId: ns.sourceId,
      originalConfidence: o.confidence ?? null,
      reviewVerificationState: rv.verificationState ?? null,
      reviewNotes: rv.notes ?? null,
      originalLimitations: o.limitations ?? null,
      originalSourceType: o.sourceType ?? null,
      isSupplemental: ns.sourceId.startsWith('sup-'),
    };
  });
  const perClaim = revClaims.map((c) => {
    const o = ledgerMap.get(c.claimId) || {};
    return {
      claimId: c.claimId,
      originalConfidence: o.confidence ?? null,
      currentConfidence: c.confidence ?? null,
      originalProposedStatus: o.proposedStatus ?? null,
      currentStatus: c.currentStatus ?? null,
      verificationState: c.verificationState,
      limitations: c.limitations ?? null,
      correctionRequired: !!c.correctionRequired,
      correctionNote: c.correctionNote ?? null,
      changedSinceResearch: !!c.correctionRequired || c.verificationState !== 'CONFIRMED',
    };
  }).sort((a, b) => a.claimId.localeCompare(b.claimId));

  const qa = {
    transformVersion: TRANSFORM_VERSION,
    packageStatus: 'RECOVERED / UNVERIFIED',
    reviewedRecommendation: 'AVAILABLE_WITH_LIMITS',
    confidence: 'MEDIUM',
    liveVerificationState: 'NOT_LIVE_VERIFIED',
    ownerDecisionRef: { decisionId: OWNER_DECISION_ID, commit: OWNER_DECISION_COMMIT },
    inputPackages: INPUT_PACKAGES,
    correctionsApplied: Object.entries(CORRECTIONS).map(([claimId, intent]) => ({ claimId, correctionIntent: intent })),
    offerAmounts: { ...OFFER_AMOUNTS, note: 'Two separate local programs. Never combined. Not the global advertised maximum. No CTA/promo authorized.' },
    perSource,
    perClaim,
    note: 'confidence and limitations are preserved here (not in normalized market-source records, which are schema-constrained); nothing was silently discarded.',
  };

  // --- normalized conflicts (merge original + review; never auto-resolved) ---
  const revConfMap = new Map(confRev.conflicts.map((c) => [c.conflictId, c]));
  const normConflicts = confOrig.map((oc) => {
    const rc = revConfMap.get(oc.conflictId) || {};
    return {
      conflictId: oc.conflictId,
      issue: oc.issue,
      status: rc.status || 'PARTIALLY_RESOLVED',
      confidence: rc.confidence ?? null,
      autoResolved: false,
      affectedClaimIds: oc.affectedClaimIds || [],
      sourcesReviewed: rc.sourcesReviewed || oc.sourceIds || [],
      legalEntityComparison: oc.legalEntityComparison ?? null,
      dateComparison: oc.dateComparison ?? null,
      sourceTierComparison: oc.sourceTierComparison ?? null,
      currentAssessment: oc.currentAssessment ?? null,
      reviewedResolution: rc.currentResolution ?? null,
      routingMatrix: rc.routingMatrix ?? null,
      netAssessment: rc.netAssessment ?? null,
      unresolvedEvidence: oc.evidenceNeeded ?? null,
      ownerReviewRequired: true,
    };
  }).sort((a, b) => a.conflictId.localeCompare(b.conflictId));

  // --- exchange-market-cell CANDIDATE — OPTION A wrapper: candidateMetadata + schema-valid cell ---
  const checkedDate = cverd.checkedDate || '2026-07-21';
  // cell: EXACT exchange-market-cell.schema.json instance — only schema-permitted fields, no staging metadata.
  const cell = {
    exchangeId: 'bybit',
    countryCode: 'KZ',
    exchangeLegalEntity: 'Bybit Limited (AIFC / AFSA AFSA-A-LA-2024-0027)',
    overallAvailability: 'AVAILABLE_WITH_LIMITS',
    registrationStatus: 'AVAILABLE_WITH_LIMITS',
    productStatuses: { ...PRODUCT_STATUSES },
    rankingEligibility: false,
    ctaEligibility: false,
    promoEligibility: false,
    confidence: 'MEDIUM',
    freshness: 'CURRENT',
    checkedDate,
    nextReviewDate: '2026-08-21',
    reasonCodes: ['LOCAL_AIFC_LICENSED', 'REGISTRATION_SCOPE_PARTIAL', 'ROUTING_PARTIAL', 'OFFER_ELIGIBILITY_UNVERIFIED', 'NOT_LIVE_VERIFIED'],
    limitations: LIMITATION_AREAS.slice(),
    sourceIds: normSources.map((s) => s.sourceId),
    conflictIds: normConflicts.map((c) => c.conflictId),
    alternativeExchangeIds: [],
    liveVerificationState: 'NOT_LIVE_VERIFIED',
  };
  // candidateMetadata: staging-only fields (approved in the owner-review decision) — kept OUTSIDE cell.
  const candidateMetadata = {
    recordState: 'CANDIDATE',
    canonical: false,
    productionEligible: false,
    migration5Authorized: false,
    futureRankingCandidate: true,
    presentation: { primaryState: 'GREEN', primaryLabel: 'Available', secondaryState: 'AMBER', secondaryLabel: 'Some limits apply' },
    productStatusRationale: { ...PRODUCT_RATIONALE },
    offerAmounts: { ...OFFER_AMOUNTS },
    provenance: {
      ownerImportPrepDecisionCommit: OWNER_DECISION_COMMIT,
      ownerReviewDecisionCommit: OWNER_REVIEW_COMMIT,
      sourceTruthReviewPackageStatus: 'RECOVERED / UNVERIFIED',
      transformVersion: TRANSFORM_VERSION,
    },
  };
  const candidate = { candidateMetadata, cell };

  return { normSources, links, qa, normConflicts, candidate, scopeStats, counts: { sources: normSources.length, links: links.length, conflicts: normConflicts.length, corrections: Object.keys(CORRECTIONS).length } };
}

// structural contract validation (no committed JSON Schema validator dependency)
function validateSources(normSources) {
  const problems = [];
  const req = ['sourceId', 'url', 'sourceTier', 'publisher', 'retrievedDate', 'status'];
  const seen = new Set();
  for (const s of normSources) {
    for (const k of req) if (s[k] === undefined || s[k] === null || s[k] === '') problems.push(`${s.sourceId}: missing required ${k}`);
    if (!SCHEMA_TIER.includes(s.sourceTier)) problems.push(`${s.sourceId}: tier ${s.sourceTier} not in enum`);
    if (!SCHEMA_STATUS.includes(s.status)) problems.push(`${s.sourceId}: status ${s.status} not in enum`);
    if (s.captureType && !SCHEMA_CAPTURE.includes(s.captureType)) problems.push(`${s.sourceId}: captureType invalid`);
    if (seen.has(s.sourceId)) problems.push(`duplicate sourceId ${s.sourceId}`);
    seen.add(s.sourceId);
  }
  return problems;
}

// Structural contract validation of candidate.cell against exchange-market-cell.schema.json
// (committed; additionalProperties:false). NOT a third-party JSON-Schema engine.
function validateCell(cell) {
  const problems = [];
  if (cell === null || typeof cell !== 'object' || Array.isArray(cell)) return ['cell is not an object'];
  const typeOk = (v, t) => {
    const ts = Array.isArray(t) ? t : [t];
    return ts.some((x) =>
      (x === 'null' && v === null) ||
      (x === 'string' && typeof v === 'string') ||
      (x === 'boolean' && typeof v === 'boolean') ||
      (x === 'object' && v !== null && typeof v === 'object' && !Array.isArray(v)) ||
      (x === 'array' && Array.isArray(v)));
  };
  for (const k of CELL_CONTRACT.required) if (!(k in cell)) problems.push(`missing required cell.${k}`);
  for (const [k, v] of Object.entries(cell)) {
    const spec = CELL_CONTRACT.props[k];
    if (!spec) { problems.push(`cell.${k}: additional property not permitted (additionalProperties:false)`); continue; }
    if (spec.enum) { if (!spec.enum.includes(v)) problems.push(`cell.${k}: "${v}" not in enum`); continue; }
    if (spec.type && !typeOk(v, spec.type)) { problems.push(`cell.${k}: wrong type (expected ${spec.type})`); continue; }
    if (spec.len2 && (typeof v !== 'string' || v.length !== 2)) problems.push(`cell.${k}: must be length-2 string`);
    if (spec.date && typeof v === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) problems.push(`cell.${k}: not ISO date`);
    if (spec.items === 'string' && Array.isArray(v) && !v.every((x) => typeof x === 'string')) problems.push(`cell.${k}: array items must be strings`);
    if (spec.stringValues && v && typeof v === 'object' && !Object.values(v).every((x) => typeof x === 'string')) problems.push(`cell.${k}: object values must be strings`);
  }
  return problems;
}

function buildOutputs(built) {
  // content files first (deterministic serialization)
  const files = {};
  files['normalized-sources.json'] = ser(built.normSources);
  files['claim-source-links.json'] = ser(built.links);
  files['qa-provenance.json'] = ser(built.qa);
  files['normalized-conflicts.json'] = ser(built.normConflicts);
  files['exchange-market-cell.candidate.json'] = ser(built.candidate);
  // transform report (references counts + file hashes, not the manifest → acyclic)
  const contentHashes = Object.fromEntries(Object.entries(files).map(([n, c]) => [n, { bytes: Buffer.byteLength(c, 'utf8'), sha256: sha256(c) }]));
  files['transform-report.md'] = buildReport(built, contentHashes);
  // manifest last (references all above + the script)
  const withReport = { ...contentHashes, 'transform-report.md': { bytes: Buffer.byteLength(files['transform-report.md'], 'utf8'), sha256: sha256(files['transform-report.md']) } };
  const scriptRel = 'scripts/market-intelligence/import-kz-bybit-p0a.mjs';
  const scriptAbs = fileURLToPath(import.meta.url);
  const scriptBuf = readFileSync(scriptAbs);
  const generatedFiles = { [scriptRel]: { bytes: scriptBuf.length, sha256: sha256(scriptBuf) } };
  for (const [n, h] of Object.entries(withReport)) generatedFiles[`${STAGING_REL}/${n}`] = h;
  files['import-manifest.json'] = ser({
    task: RESHAPE_TASK,
    project: 'CryptoBonusWorld',
    repository: 'C:/projects/CryptoBonusWorld',
    branch: 'master',
    baselineHead: OWNER_REVIEW_COMMIT,
    countryCode: 'KZ',
    exchangeId: 'bybit',
    batchId: 'KZ-P0-A',
    transformVersion: TRANSFORM_VERSION,
    packageStatus: 'RECOVERED / UNVERIFIED',
    ownerImportPrepDecisionCommit: OWNER_DECISION_COMMIT,
    ownerReviewDecisionCommit: OWNER_REVIEW_COMMIT,
    candidateShape: 'OPTION_A_WRAPPED_CANDIDATE',
    cellSchemaValidation: 'PASS (structural contract vs exchange-market-cell.schema.json)',
    productScopeApplied: true,
    claimTypeOnSources: false,
    scopeStats: built.scopeStats,
    inputPackages: INPUT_PACKAGES,
    generatedFiles,
    counts: built.counts,
    stagingOnly: true,
    canonicalImportAuthorized: false,
    productionChangeAuthorized: false,
    migration5Authorized: false,
    rankingEligibilityAuthorized: false,
    ctaEligibilityAuthorized: false,
    promoEligibilityAuthorized: false,
  });
  return files;
}

function buildReport(built, hashes) {
  const cell = built.candidate.cell;
  const meta = built.candidate.candidateMetadata;
  const L = [];
  L.push('# CBW KZ × Bybit P0-A — Staging Import Transform Report');
  L.push('');
  L.push(`- Transform version: \`${TRANSFORM_VERSION}\` · task \`${RESHAPE_TASK}\` · staging-only · deterministic · RECOVERED / UNVERIFIED`);
  L.push(`- Owner import-prep decision: \`${OWNER_DECISION_COMMIT}\` · owner-review decision: \`${OWNER_REVIEW_COMMIT}\``);
  L.push(`- Normalized sources: **${built.counts.sources}** (39 original + 4 supplemental) · claim-source links: **${built.counts.links}** · conflicts: **${built.counts.conflicts}** · corrections applied: **${built.counts.corrections}**`);
  L.push('');
  L.push('## Reshape (owner-approved fixes applied)');
  L.push('- Candidate shape changed to **OPTION A** — top-level keys are exactly `candidateMetadata` + `cell`.');
  L.push('- `candidate.cell` conforms to the committed **exchange-market-cell.schema.json** contract (structural contract validation; `additionalProperties:false` respected — no staging metadata inside `cell`).');
  L.push('- Staging metadata (recordState / canonical / presentation / productStatusRationale / offerAmounts / provenance …) remains **outside** `cell`, in `candidateMetadata`.');
  L.push(`- \`productScope\` arrays applied to normalized market-source records (single: **${built.scopeStats.single}**, multi: **${built.scopeStats.multi}**, empty: **${built.scopeStats.empty}**); derived from claim categories of SUPPORTS/LIMITS links only (CONTRADICTS/CONTEXT excluded).`);
  L.push('- `claimType` remains **off** market-source records (optional field omitted; category lives in linkage).');
  L.push('- `updatedDate` policy unchanged: official verified page date only, else `null` (all 43 = `null`).');
  L.push('- Entity/domain routing remains **unflattened** (full routingMatrix stays in `normalized-conflicts` + `qa-provenance`; cell carries only status + reasonCodes + conflictIds).');
  L.push('- All **13** product statuses unchanged. Canonical import remains **blocked**.');
  L.push('');
  L.push('## MI-cell candidate (non-production, OPTION A)');
  L.push(`candidateMetadata.recordState \`${meta.recordState}\` · canonical **${meta.canonical}** · productionEligible **${meta.productionEligible}** · migration5Authorized **${meta.migration5Authorized}** · futureRankingCandidate **${meta.futureRankingCandidate}**`);
  L.push(`cell.overallAvailability **${cell.overallAvailability}** · confidence **${cell.confidence}** · liveVerificationState **${cell.liveVerificationState}**`);
  L.push(`cell.rankingEligibility **${cell.rankingEligibility}** · ctaEligibility **${cell.ctaEligibility}** · promoEligibility **${cell.promoEligibility}**`);
  L.push('Presentation (candidateMetadata): primary **GREEN** "Available" + secondary **AMBER** "Some limits apply".');
  L.push('');
  L.push('### Product statuses (kept separate; never flattened into overall)');
  for (const [k, v] of Object.entries(cell.productStatuses)) L.push(`- \`${k}\`: **${v}** — ${meta.productStatusRationale[k]}`);
  L.push('');
  L.push('### Offer amounts (kept separate; not a global maximum; no CTA/promo)');
  L.push(`- local referral: up to **1,032 USDT** · Kazakhstan campaign prize pool: **2,500 USDT** · combined: **false**`);
  L.push('');
  L.push('## Conflicts (preserved, never auto-resolved)');
  for (const cf of built.normConflicts) L.push(`- \`${cf.conflictId}\`: **${cf.status}** — ${cf.issue}`);
  L.push('');
  L.push('## Corrections applied (owner-approved)');
  for (const [id, intent] of Object.entries(CORRECTIONS)) L.push(`- \`${id}\`: ${intent}`);
  L.push('');
  L.push('## Generated staging file hashes');
  for (const [n, h] of Object.entries(hashes)) L.push(`- \`${n}\`: ${h.bytes} B · sha256 \`${h.sha256}\``);
  L.push('');
  L.push('## Authorizations (all withheld)');
  L.push('import / canonical record / MI cell / ranking / CTA / promo / production change / MIGRATION_5 — **all false**. Staging only.');
  L.push('');
  return L.join('\n') + '\n';
}

/* ---------------- main ---------------- */
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'help' || !args.mode) {
    if (!args.mode) refuse('a mode is required: --dry-run | --write-staging | --check');
  }
  if (!args.inputDir) err('--input-dir <DIR> is required');
  if (!existsSync(args.inputDir)) err(`--input-dir not found: ${args.inputDir}`);

  const built = build(args.inputDir);
  const sourceProblems = validateSources(built.normSources);
  const cellProblems = validateCell(built.candidate.cell);
  const problems = [...sourceProblems, ...cellProblems];
  const files = buildOutputs(built);

  if (args.mode === 'dry-run') {
    process.stdout.write(`DRY-RUN · sources=${built.counts.sources} links=${built.counts.links} conflicts=${built.counts.conflicts} corrections=${built.counts.corrections}\n`);
    process.stdout.write(`productScope: single=${built.scopeStats.single} multi=${built.scopeStats.multi} empty=${built.scopeStats.empty}\n`);
    process.stdout.write(`sourceStructuralValidation: ${sourceProblems.length === 0 ? 'PASS' : 'FAIL (' + sourceProblems.length + ')'}\n`);
    process.stdout.write(`cellStructuralValidation (vs exchange-market-cell.schema.json contract): ${cellProblems.length === 0 ? 'PASS' : 'FAIL (' + cellProblems.length + ')'}\n`);
    for (const p of cellProblems) process.stdout.write(`  CELL: ${p}\n`);
    for (const n of Object.keys(files)) process.stdout.write(`  would write ${STAGING_REL}/${n} (${Buffer.byteLength(files[n], 'utf8')} B, sha ${sha256(files[n]).slice(0, 12)})\n`);
    process.exit(problems.length === 0 ? 0 : 1);
  }

  if (args.mode === 'check') {
    let mism = 0;
    for (const [n, content] of Object.entries(files)) {
      const p = join(STAGING_ABS, n);
      if (!existsSync(p)) { console.error(`CHECK: missing ${STAGING_REL}/${n}`); mism++; continue; }
      if (readFileSync(p, 'utf8') !== content) { console.error(`CHECK: differs ${STAGING_REL}/${n}`); mism++; }
    }
    if (mism) { console.error(`CHECK FAILED (${mism})`); process.exit(1); }
    console.log('CHECK OK — staging files match regenerated output.');
    process.exit(0);
  }

  // write-staging
  if (problems.length) { for (const p of problems) console.error(`VALIDATION: ${p}`); err('structural validation failed; refusing to write'); }
  mkdirSync(STAGING_ABS, { recursive: true });
  for (const [n, content] of Object.entries(files)) writeFileSync(join(STAGING_ABS, n), content, 'utf8');
  console.log(`WROTE ${Object.keys(files).length} staging files under ${STAGING_REL}/ (sources=${built.counts.sources}, links=${built.counts.links}, conflicts=${built.counts.conflicts}).`);
  process.exit(0);
}

main();
