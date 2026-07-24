#!/usr/bin/env node
/**
 * CBW KZ×MEXC P0-B — deterministic NON-PRODUCTION canonical promoter.
 *
 * Promotes the owner-authorized (Issue #15 / PR #16) six-file canonical research
 * package for Kazakhstan × MEXC from the tracked staging package + merged
 * canonical previews (Issue #13 / PR #14) into
 * data/market-intelligence/{cells,sources,linkages,provenance,conflicts,bindings}/by-country/kz/mexc.json.
 *
 * NON-PRODUCTION research storage only. No runtime consumer reads these paths;
 * the existing GEO passport remains production truth. This script activates no
 * binding, ranking, CTA, promo, affiliate, publication, MIGRATION_5 or deploy.
 *
 * Deterministic: Node built-ins only; no network, browser, child process, git
 * command, wall-clock-derived output or external API. UTF-8, 2-space JSON, final LF.
 *
 * Usage:
 *   node scripts/market-intelligence/promote-kz-mexc-p0b-canonical.mjs --dry-run
 *   node scripts/market-intelligence/promote-kz-mexc-p0b-canonical.mjs --write-canonical
 *   node scripts/market-intelligence/promote-kz-mexc-p0b-canonical.mjs --check
 *
 * Exit codes: 0 success · 1 validation/reference error · 2 unsafe mode/path/overwrite
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync, mkdtempSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const REPO_ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const STAGING_REL = 'research/market-intelligence/staging/kz/mexc/p0b-v1';
const PREVIEW_REL = `${STAGING_REL}/canonical-preview`;
const DATA_ROOT_REL = 'data/market-intelligence';
const TASK_ID = 'CBW-KZ-MEXC-P0-B-CANONICAL-IMPORT-007';
const BASE_COMMIT = '913ba4c2f38f7d68319e89a2964ff56f49aa19eb';

const LINEAGE = {
  stagingImport: { pr: 9, head: '96d688d4e814f25f1be5f8ef542bfbe3f604c026', merge: '40b68632b9a41118035430cf0fd4e5569f1cd8e0', taskId: 'CBW-KZ-MEXC-P0-B-STAGING-IMPORT-003' },
  eolPrerequisite: { pr: 12, merge: 'a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1', taskId: 'CBW-MI-EOL-PORTABILITY-NORMALIZATION-001' },
  canonicalPathsAndPreviews: { pr: 14, head: 'b604168829357688a8d6651daf743d0f35826a7f', merge: 'd550b43b29871169f4087c75ee2af4289a66c894', taskId: 'CBW-KZ-MEXC-P0-B-CANONICAL-OWNER-DECISIONS-007A' },
  writeAuthorization: { pr: 16, head: 'f4976dccdc75b1ac60e868a09e1ef8c98b7e408e', merge: '913ba4c2f38f7d68319e89a2964ff56f49aa19eb', taskId: 'CBW-KZ-MEXC-P0-B-CANONICAL-WRITE-AUTHORIZATION-007B' },
  thisTask: { taskId: TASK_ID, baseCommit: BASE_COMMIT },
};
const INPUT_PACKAGE = { name: 'CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip', deliveredAs: 'CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1.zip', bytes: 27833, sha256: 'f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f' };
const UNAVAILABLE_ORIGINAL = { bytes: 37001, sha256: '3f0e10d231efc2ce33f77fac85182809197c11bf5b0cf400f32c77bad4774281', status: 'ORIGINAL BYTES UNAVAILABLE' };

const OWNER_DECISIONS = {
  canonicalPaths: { decisionId: 'CBW-KZ-MEXC-P0B-CANONICAL-PATHS-OWNER-DECISION-v1', path: 'owner-ops/market-intelligence/decisions/CBW_KZ_MEXC_P0B_CANONICAL_PATHS_OWNER_DECISION_v1.json' },
  importPrep: { decisionId: 'CBW-KZ-MEXC-P0B-CANONICAL-IMPORT-PREP-v1', path: 'owner-ops/market-intelligence/decisions/CBW_KZ_MEXC_P0B_CANONICAL_IMPORT_PREP_v1.json' },
  writeAuthorization: { decisionId: 'CBW-KZ-MEXC-P0B-CANONICAL-WRITE-AUTHORIZATION-v1', path: 'owner-ops/market-intelligence/decisions/CBW_KZ_MEXC_P0B_CANONICAL_WRITE_AUTHORIZATION_v1.json' },
};

const AUTHORIZATION_STATE = {
  canonicalResearchStorageEligible: true,
  canonicalImportAuthorized: true,
  canonicalCellWriteAuthorized: true,
  canonicalSourcesWriteAuthorized: true,
  canonicalLinkagesWriteAuthorized: true,
  canonicalProvenanceWriteAuthorized: true,
  canonicalConflictsWriteAuthorized: true,
  miGeoBindingWriteAuthorized: true,
  miGeoBindingActivationAuthorized: false,
  productionChangeAuthorized: false,
  productionIntegrationAuthorized: false,
  legacyGeoReplacementAuthorized: false,
  publicationAuthorized: false,
  rankingEligibilityAuthorized: false,
  ctaEligibilityAuthorized: false,
  promoEligibilityAuthorized: false,
  affiliateRoutingActivationAuthorized: false,
  pageOrRouteChangeAuthorized: false,
  migration5Authorized: false,
  deployAuthorized: false,
};

// Canonical output relative paths (atomic six-file package).
const OUTPUTS = {
  'cells': `${DATA_ROOT_REL}/cells/by-country/kz/mexc.json`,
  'sources': `${DATA_ROOT_REL}/sources/by-country/kz/mexc.json`,
  'linkages': `${DATA_ROOT_REL}/linkages/by-country/kz/mexc.json`,
  'provenance': `${DATA_ROOT_REL}/provenance/by-country/kz/mexc.json`,
  'conflicts': `${DATA_ROOT_REL}/conflicts/by-country/kz/mexc.json`,
  'bindings': `${DATA_ROOT_REL}/bindings/by-country/kz/mexc.json`,
};
const CELL_REL = OUTPUTS.cells;

// ---------- helpers ----------
function fail(code, msg) { console.error(`ERROR: ${msg}`); process.exit(code); }
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }
function stableJson(obj) { return JSON.stringify(obj, null, 2) + '\n'; }
function rd(rel) { try { return JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8')); } catch (e) { return fail(1, `read/parse failed: ${rel}: ${e.message}`); } }
function rdText(rel) { try { return readFileSync(join(REPO_ROOT, rel), 'utf8'); } catch (e) { return fail(1, `read failed: ${rel}: ${e.message}`); } }
function distribution(items, key) { const o = {}; for (const it of items) { const v = it[key]; o[v] = (o[v] || 0) + 1; } return o; }

// Minimal structural validators (mirror committed schema constraints; no deps).
const SOURCE_FIELDS = new Set(['sourceId','exchangeId','countryCode','productScope','claimType','url','sourceTier','publisher','title','publishedDate','updatedDate','retrievedDate','effectiveFrom','effectiveTo','language','contentHash','evidenceSummary','quotedClaim','captureType','status']);
const SCHEMA_TIER = ['A','B','C','D'];
const SCHEMA_STATUS = ['ACTIVE','MOVED','REMOVED','SUPERSEDED','BLOCKED','STALE'];
const SCHEMA_CAPTURE = ['HTML','PDF','SCREENSHOT','API','DATASET','MANUAL_BROWSER','NEWS'];
function validateSourceRecord(r) {
  for (const k of Object.keys(r)) if (!SOURCE_FIELDS.has(k)) fail(1, `source ${r.sourceId}: schema-prohibited field ${k}`);
  for (const req of ['sourceId','url','sourceTier','publisher','retrievedDate','status']) if (r[req] === undefined || r[req] === null || r[req] === '') fail(1, `source ${r.sourceId}: missing required ${req}`);
  if (!SCHEMA_TIER.includes(r.sourceTier)) fail(1, `source ${r.sourceId}: bad tier`);
  if (!SCHEMA_STATUS.includes(r.status)) fail(1, `source ${r.sourceId}: bad status`);
  if (r.captureType !== undefined && !SCHEMA_CAPTURE.includes(r.captureType)) fail(1, `source ${r.sourceId}: bad captureType`);
  if (!Array.isArray(r.productScope) || r.productScope.length === 0) fail(1, `source ${r.sourceId}: empty productScope`);
}
const CELL_FIELDS = new Set(['exchangeId','countryCode','exchangeLegalEntity','overallAvailability','registrationStatus','productStatuses','rankingEligibility','ctaEligibility','promoEligibility','confidence','freshness','checkedDate','nextReviewDate','reasonCodes','limitations','sourceIds','conflictIds','alternativeExchangeIds','liveVerificationState']);
function validateCell(c) {
  for (const k of Object.keys(c)) if (!CELL_FIELDS.has(k)) fail(1, `cell: schema-prohibited field ${k}`);
  for (const req of ['exchangeId','countryCode','overallAvailability','registrationStatus','productStatuses','rankingEligibility','ctaEligibility','confidence','checkedDate','sourceIds']) if (c[req] === undefined) fail(1, `cell: missing required ${req}`);
  if (c.countryCode.length !== 2) fail(1, 'cell: countryCode length');
  if (typeof c.rankingEligibility !== 'boolean' || typeof c.ctaEligibility !== 'boolean') fail(1, 'cell: eligibility must be boolean');
}
const BINDING_FIELDS = new Set(['bindingId','exchangeId','countryCode','canonicalRecord','miCellRef','legacyGeoPassportRef','deepPassportRef','migrationPhase','ownership','eligibility','evidencePrecedence','conflictResolution','liveVerificationState','productionStable','ownerApproved','reviewStatus']);
const BINDING_PROHIBITED = ['active','promoSuppressed','existingGeoRemainsProductionTruth','productionRouteUnchanged'];
function validateBinding(b) {
  for (const k of Object.keys(b)) { if (!BINDING_FIELDS.has(k)) fail(1, `binding: schema-prohibited field ${k}`); if (BINDING_PROHIBITED.includes(k)) fail(1, `binding: prohibited top-level field ${k}`); }
  for (const req of ['bindingId','exchangeId','countryCode','canonicalRecord','miCellRef','migrationPhase','ownership','eligibility','productionStable','ownerApproved','reviewStatus']) if (b[req] === undefined) fail(1, `binding: missing required ${req}`);
  if (!['MI_CELL','GEO_LEGACY'].includes(b.canonicalRecord)) fail(1, 'binding: bad canonicalRecord');
  if (b.productionStable !== true) fail(1, 'binding: productionStable must be true');
}

// ---------- build the six canonical objects (deterministic) ----------
function build() {
  const manifest = rd(`${STAGING_REL}/import-manifest.json`);
  const candidate = rd(`${STAGING_REL}/exchange-market-cell.candidate.json`);
  const previewCellText = rdText(`${PREVIEW_REL}/exchange-market-cell.preview.json`);
  const sources = rd(`${STAGING_REL}/normalized-sources.json`);
  const linkages = rd(`${STAGING_REL}/claim-source-links.json`);
  const conflicts = rd(`${STAGING_REL}/normalized-conflicts.json`);
  const claimReview = rd(`${STAGING_REL}/claim-review.json`);
  const qaProvenance = rd(`${STAGING_REL}/qa-provenance.json`);
  const bindingPreview = rd(`${PREVIEW_REL}/mi-geo-binding.preview.json`);

  // 1. cell = candidate.cell (must equal merged preview)
  const cell = candidate.cell;
  validateCell(cell);
  const cellText = stableJson(cell);
  if (cellText !== previewCellText) fail(1, 'cell does not byte-equal merged canonical-preview cell');
  if (cell.overallAvailability !== 'RESTRICTED' || cell.confidence !== 'HIGH' || cell.freshness !== 'UNDER_REVIEW' || cell.liveVerificationState !== 'NOT_LIVE_VERIFIED') fail(1, 'cell posture drift');
  if (cell.rankingEligibility !== false || cell.ctaEligibility !== false || cell.promoEligibility !== false) fail(1, 'cell eligibility must be false');

  // 2/3/4. sources / linkages / conflicts = staging envelopes (byte-identical)
  for (const [obj, rel] of [[sources, `${STAGING_REL}/normalized-sources.json`], [linkages, `${STAGING_REL}/claim-source-links.json`], [conflicts, `${STAGING_REL}/normalized-conflicts.json`]]) {
    if (stableJson(obj) !== rdText(rel)) fail(1, `deterministic re-serialization differs from staging: ${rel}`);
  }
  if (!Array.isArray(sources.records) || sources.records.length !== 16) fail(1, 'sources: expected 16');
  const srcIds = sources.records.map((s) => s.sourceId);
  if (new Set(srcIds).size !== 16) fail(1, 'sources: duplicate sourceId');
  for (let i = 1; i < srcIds.length; i++) if (srcIds[i - 1] > srcIds[i]) fail(1, 'sources: not sorted by sourceId');
  sources.records.forEach(validateSourceRecord);
  const sd = distribution(sources.records, 'status');
  if (sd.ACTIVE !== 15 || sd.STALE !== 1) fail(1, `sources: status distribution ${JSON.stringify(sd)}`);

  if (!Array.isArray(linkages.links) || linkages.links.length !== 55) fail(1, 'linkages: expected 55');
  const linkIds = linkages.links.map((l) => l.linkId);
  if (new Set(linkIds).size !== 55) fail(1, 'linkages: duplicate linkId');
  for (let i = 1; i < linkIds.length; i++) if (linkIds[i - 1] > linkIds[i]) fail(1, 'linkages: not sorted by linkId');
  const triples = new Set();
  for (const l of linkages.links) { const t = `${l.claimId}|${l.sourceId}|${l.relationship}`; if (triples.has(t)) fail(1, `linkages: duplicate triple ${t}`); triples.add(t); }
  const ld = distribution(linkages.links, 'relationship');
  if (ld.SUPPORTS !== 41 || ld.CONTRADICTS !== 14) fail(1, `linkages: relationship distribution ${JSON.stringify(ld)}`);

  if (!Array.isArray(conflicts.conflicts) || conflicts.conflicts.length !== 7) fail(1, 'conflicts: expected 7');
  const confIds = conflicts.conflicts.map((c) => c.conflictId);
  for (let i = 1; i < confIds.length; i++) if (confIds[i - 1] > confIds[i]) fail(1, 'conflicts: not sorted by conflictId');
  if (!conflicts.conflicts.every((c) => c.ownerReviewRequired === true)) fail(1, 'conflicts: ownerReviewRequired must be true for all');

  // cross-references
  const srcIdSet = new Set(srcIds);
  const claimIdSet = new Set(claimReview.records.map((r) => r.claimId));
  for (const l of linkages.links) { if (!claimIdSet.has(l.claimId)) fail(1, `linkage claim unresolved: ${l.claimId}`); if (!srcIdSet.has(l.sourceId)) fail(1, `linkage source unresolved: ${l.sourceId}`); }
  for (const c of conflicts.conflicts) { for (const s of c.sourcesReviewed || []) if (!srcIdSet.has(s)) fail(1, `conflict source unresolved: ${s}`); for (const cl of c.claimsReviewed || []) if (!claimIdSet.has(cl)) fail(1, `conflict claim unresolved: ${cl}`); }
  const cellSrc = [...cell.sourceIds].sort(); const cSrc = [...srcIds].sort();
  if (JSON.stringify(cellSrc) !== JSON.stringify(cSrc)) fail(1, 'cell.sourceIds != canonical source id set');
  const cellConf = [...cell.conflictIds].sort(); const cConf = [...confIds].sort();
  if (JSON.stringify(cellConf) !== JSON.stringify(cConf)) fail(1, 'cell.conflictIds != canonical conflict id set');
  const perSourceKeys = Object.keys(qaProvenance.perSource).sort();
  if (JSON.stringify(perSourceKeys) !== JSON.stringify(cSrc)) fail(1, 'qaProvenance.perSource keys != canonical source ids');
  const corrections = claimReview.records.filter((r) => r.correctionRequired === true).map((r) => r.claimId).sort();
  if (corrections.length !== 15) fail(1, `correctionRequired count ${corrections.length} != 15`);

  // 5. binding = preview with only miCellRef changed
  const binding = { ...bindingPreview, miCellRef: CELL_REL };
  const changed = Object.keys(bindingPreview).filter((k) => JSON.stringify(bindingPreview[k]) !== JSON.stringify(binding[k]));
  if (changed.length !== 1 || changed[0] !== 'miCellRef') fail(1, `binding must differ from preview only in miCellRef (differs: ${changed.join(',')})`);
  validateBinding(binding);
  if (binding.canonicalRecord !== 'GEO_LEGACY' || binding.migrationPhase !== 'MIGRATION_4' || binding.ownerApproved !== false || binding.reviewStatus !== 'PROPOSED') fail(1, 'binding non-active state drift');
  if (binding.eligibility.rankingEligibility !== false || binding.eligibility.ctaEligibility !== false || binding.eligibility.promoEligibility !== false || binding.eligibility.affiliateInfluencesRanking !== false) fail(1, 'binding eligibility drift');
  if (binding.conflictResolution.productionRouteUnchanged !== true) fail(1, 'binding conflictResolution.productionRouteUnchanged must be true');
  if (binding.miCellRef !== CELL_REL) fail(1, 'binding.miCellRef must be the canonical cell path');
  // legacy GEO passport must exist, untouched
  if (!existsSync(join(REPO_ROOT, binding.legacyGeoPassportRef))) fail(1, 'legacy GEO passport reference missing');

  // 6. provenance envelope (deterministic, no wall-clock, no self hash, no future commit)
  const provenance = {
    schemaVersion: '1',
    countryCode: 'KZ',
    exchangeId: 'mexc',
    batchId: 'KZ-P0-B',
    packageStatus: 'RECOVERED / UNVERIFIED',
    liveVerificationState: 'NOT_LIVE_VERIFIED',
    reviewedRecommendation: 'RESTRICTED',
    confidence: 'HIGH',
    lineage: LINEAGE,
    ownerDecisionReferences: OWNER_DECISIONS,
    inputPackages: { recovered: { ...INPUT_PACKAGE }, unavailableOriginal: { ...UNAVAILABLE_ORIGINAL } },
    stagingImportManifest: manifest,
    claimReview: claimReview,
    qaProvenance: qaProvenance,
    authorizationState: AUTHORIZATION_STATE,
    importHistory: [
      { step: 'staging-import', taskId: LINEAGE.stagingImport.taskId, pr: 9, merge: LINEAGE.stagingImport.merge, action: 'deterministic staging import (8 files)' },
      { step: 'eol-prerequisite', taskId: LINEAGE.eolPrerequisite.taskId, pr: 12, merge: LINEAGE.eolPrerequisite.merge, action: 'MI LF portability normalization' },
      { step: 'canonical-paths-and-previews', taskId: LINEAGE.canonicalPathsAndPreviews.taskId, pr: 14, merge: LINEAGE.canonicalPathsAndPreviews.merge, action: 'canonical path decisions + non-canonical previews' },
      { step: 'write-authorization', taskId: LINEAGE.writeAuthorization.taskId, pr: 16, merge: LINEAGE.writeAuthorization.merge, action: 'owner authorization for the atomic six-file write' },
      { step: 'non-production-canonical-first-write', taskId: TASK_ID, baseCommit: BASE_COMMIT, action: 'first write of six non-production canonical research files' },
    ],
  };

  return {
    cells: cellText,
    sources: stableJson(sources),
    linkages: stableJson(linkages),
    conflicts: stableJson(conflicts),
    bindings: stableJson(binding),
    provenance: stableJson(provenance),
  };
}

// ---------- serialize + validate LF/JSON ----------
function serialized() {
  const out = build();
  for (const [k, text] of Object.entries(out)) {
    if (!text.endsWith('\n')) fail(1, `${k}: missing final LF`);
    if (text.includes('\r')) fail(1, `${k}: contains CR`);
    JSON.parse(text); // parse guard
  }
  return out;
}

function absTarget(rel) {
  const abs = resolve(join(REPO_ROOT, rel));
  const dataAbs = resolve(join(REPO_ROOT, DATA_ROOT_REL));
  if (!abs.startsWith(dataAbs + sep)) fail(2, `unsafe canonical target outside data/market-intelligence/: ${abs}`);
  return abs;
}

// ---------- CLI ----------
const args = process.argv.slice(2);
const modes = ['--dry-run', '--write-canonical', '--check'].filter((m) => args.includes(m));
if (modes.length !== 1 || args.some((a) => !['--dry-run', '--write-canonical', '--check'].includes(a))) fail(2, 'usage: exactly one of --dry-run | --write-canonical | --check');
const mode = modes[0];
const KEYS = Object.keys(OUTPUTS);

if (mode === '--dry-run') {
  const out = serialized();
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-mexc-canon-'));
  try {
    for (const k of KEYS) writeFileSync(join(tmp, `${k}.json`), out[k], 'utf8');
    console.log('DRY-RUN OK: 6 canonical outputs generated in OS temp; nothing written to repository.');
    for (const k of KEYS) console.log(`  ${OUTPUTS[k]}: ${Buffer.byteLength(out[k], 'utf8')} bytes, sha256 ${sha256(Buffer.from(out[k], 'utf8'))}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  process.exit(0);
}

if (mode === '--write-canonical') {
  const out = serialized();
  // confirm all six targets absent
  for (const k of KEYS) if (existsSync(absTarget(OUTPUTS[k]))) fail(2, `refusing overwrite: target already exists: ${OUTPUTS[k]}`);
  // generate + validate in temp
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-mexc-canon-'));
  try { for (const k of KEYS) writeFileSync(join(tmp, `${k}.json`), out[k], 'utf8'); }
  catch (e) { rmSync(tmp, { recursive: true, force: true }); fail(1, `temp generation failed: ${e.message}`); }
  // transactional promote with rollback
  const createdFiles = [];
  const createdDirs = [];
  try {
    for (const k of KEYS) {
      const abs = absTarget(OUTPUTS[k]);
      let d = dirname(abs);
      const toMake = [];
      while (!existsSync(d) && d.startsWith(resolve(join(REPO_ROOT, DATA_ROOT_REL)))) { toMake.unshift(d); d = dirname(d); }
      for (const md of toMake) { mkdirSync(md); createdDirs.unshift(md); }
      if (existsSync(abs)) throw new Error(`target appeared mid-write: ${OUTPUTS[k]}`);
      writeFileSync(abs, out[k], { encoding: 'utf8', flag: 'wx' }); // wx = fail if exists
      createdFiles.push(abs);
    }
    // revalidate on disk
    for (const k of KEYS) { const abs = absTarget(OUTPUTS[k]); if (readFileSync(abs, 'utf8') !== out[k]) throw new Error(`post-write mismatch: ${OUTPUTS[k]}`); }
  } catch (e) {
    for (const f of createdFiles) { try { rmSync(f, { force: true }); } catch { /* noop */ } }
    for (const d of createdDirs) { try { if (readdirSync(d).length === 0) rmdirSync(d); } catch { /* noop */ } }
    rmSync(tmp, { recursive: true, force: true });
    fail(1, `write failed, rolled back ${createdFiles.length} file(s): ${e.message}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  console.log(`WRITE-CANONICAL OK: ${KEYS.length} canonical files written under ${DATA_ROOT_REL}/ (non-production).`);
  for (const k of KEYS) console.log(`  ${OUTPUTS[k]}: ${Buffer.byteLength(out[k], 'utf8')} bytes, sha256 ${sha256(Buffer.from(out[k], 'utf8'))}`);
  process.exit(0);
}

if (mode === '--check') {
  const out = serialized();
  let drift = 0;
  for (const k of KEYS) {
    const abs = absTarget(OUTPUTS[k]);
    if (!existsSync(abs)) { console.error(`CHECK: missing ${OUTPUTS[k]}`); drift++; continue; }
    if (readFileSync(abs, 'utf8') !== out[k]) { console.error(`CHECK: drift in ${OUTPUTS[k]}`); drift++; }
  }
  if (drift) fail(1, `--check failed: ${drift} file(s) differ`);
  console.log('CHECK OK: all 6 canonical files are byte-identical to deterministic regeneration.');
  process.exit(0);
}
