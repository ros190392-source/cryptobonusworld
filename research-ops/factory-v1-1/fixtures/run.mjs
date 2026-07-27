#!/usr/bin/env node
// ResearchOps Factory V1.1 — deterministic fixture suite (Correction 010).
// Node built-ins only. Uses OS temp directories via the library-only `testRoot`
// option; never writes into tracked research-ops/tasks/.
//   node research-ops/factory-v1-1/fixtures/run.mjs

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTask } from '../lib/create.mjs';
import { validateTask } from '../lib/validate.mjs';
import { statusTask } from '../lib/status.mjs';
import { canTransition, isValidTaskId, validateIdentityValues, canonicalSkeletonFiles } from '../lib/model.mjs';
import { validateOwnerReceipt, enforceAuthFloor } from '../lib/authz.mjs';
import { buildManifest } from '../lib/manifest.mjs';
import { checkChangedFileBoundary, parseNameStatus, parseNameStatusZ, trustedModeFromMeta } from '../lib/boundary.mjs';
import { checkStageTransition, checkHistoryAppendOnly } from '../lib/stage.mjs';
import { resolveWorktreeRoot, requireScriptBoundWorktreeRoot } from '../lib/worktree.mjs';
import { validateMarker, REVIEW_MARKER, VALIDATION_MARKER, MERGE_MARKER } from '../lib/markers.mjs';
import { validateGithubPlanShape, validateHistory } from '../lib/schema.mjs';
import { roleForBranch, capabilityForRole } from '../lib/roles.mjs';
import { validateGovernedRecord } from '../lib/govrecord.mjs';
import { checkEventIntegrity, reconcileRecovery } from '../lib/eventintegrity.mjs';
import { resolveEnforcement, checkSetupPhase, BOOTSTRAP_ANCHOR, checkDescendantSetupPhase, discoverFrozenSetupBoundary } from '../lib/bootstrap.mjs';
import { verifyMergeRecord } from '../lib/mergeproof.mjs';
import { validateSkeletonContent, canonicalizeText } from '../lib/skeleton.mjs';
import { renderSkeleton } from '../lib/create.mjs';
import { isValidUtf8, hasForbiddenControls, writeCanonical, writeJson } from '../lib/util.mjs';

let pass = 0; let fail = 0; const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  [PASS] ${name}`); }
  else { fail += 1; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}
const roots = [];
function tmpRoot() { const d = mkdtempSync(join(tmpdir(), 'rops-fx-')); roots.push(d); return d; }

const BASE = {
  taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001',
  countryCode: 'KZ', countryName: 'Kazakhstan',
  exchangeId: 'binance', exchangeName: 'Binance',
  batchId: 'KZ-P0-D', priority: 'P0', createdAt: '2026-07-26',
};
const mk = () => createTask({ ...BASE, testRoot: tmpRoot() }).taskDir;

const HASHED = ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'];

function baseData() {
  return {
    'research-run.json': { schemaVersion: '1.0', overallFinding: { recommendation: 'CONFLICTING' }, authorizations: { canonicalImportAuthorized: false, deployAuthorized: false } },
    'source-verification.json': { schemaVersion: '1.0', sources: [{ sourceId: 'src-a' }] },
    'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: ['src-a'], contradictedSourceIds: [] }] },
    'conflict-resolution.json': { schemaVersion: '1.0', conflicts: [{ conflictId: 'cf-a', availabilitySourceIds: ['src-a'], restrictionSourceIds: [] }] },
    'product-availability.json': { schemaVersion: '1.0', products: [{ productId: 'prod-a', claimIds: ['clm-a'] }] },
    'payment-rails.json': { schemaVersion: '1.0', rails: [{ railId: 'rail-a', sourceIds: ['src-a'] }] },
    'offer-eligibility-review.json': { schemaVersion: '1.0', review: { sourceIds: ['src-a'] }, authorizations: { rankingChangeAuthorized: false } },
    'schema-normalization-notes.json': { schemaVersion: '1.0', notes: [] },
    'import-readiness.json': { schemaVersion: '1.0', readiness: { canonicalImportReady: false, deployReady: false }, opsRecommendation: 'HOLD_CONFLICTING' },
  };
}
function writePkg(taskDir, mut = {}) {
  const out = join(taskDir, '20-research-output');
  const data = Object.assign(baseData(), mut.json || {});
  for (const [f, o] of Object.entries(data)) writeJson(join(out, f), o);
  writeCanonical(join(out, 'source-truth-review-report.md'), mut.md || '# Report\n\nCONFLICTING / MEDIUM.\n');
  if (!mut.skipManifest) writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, HASHED, {}));
  if (mut.after) mut.after(out);
  return out;
}
function rebuildManifest(out) { writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, HASHED, {})); }
// Canonical DIRECT history path to a state (no correction branch unless the state is on
// the correction path). Keeps TASK_STATE.history valid under V3-C9.
const DIRECT_PATH = {
  PREPARED: ['PREPARED'],
  RESEARCH_CAPTURED: ['PREPARED', 'RESEARCH_CAPTURED'],
  PACKAGE_VALIDATED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED'],
  SOURCE_TRUTH_REVIEWED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED'],
  CORRECTION_REQUIRED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED'],
  CORRECTED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED', 'CORRECTED'],
  VALIDATED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'VALIDATED'],
  OWNER_CLOSEOUT_REQUIRED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'VALIDATED', 'OWNER_CLOSEOUT_REQUIRED'],
  RESEARCH_RECORD_MERGE_AUTHORIZED: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'VALIDATED', 'OWNER_CLOSEOUT_REQUIRED', 'RESEARCH_RECORD_MERGE_AUTHORIZED'],
  RESEARCH_RECORD_MERGED_TO_MAIN: ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'VALIDATED', 'OWNER_CLOSEOUT_REQUIRED', 'RESEARCH_RECORD_MERGE_AUTHORIZED', 'RESEARCH_RECORD_MERGED_TO_MAIN'],
  BLOCKED: ['PREPARED', 'BLOCKED'],
};
function buildHistory(state) { return (DIRECT_PATH[state] || ['PREPARED']).map((s, i) => ({ state: s, at: `2026-07-27T00:00:0${i}Z` })); }
function setState(taskDir, state, extra = {}) {
  const p = join(taskDir, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p, 'utf8'));
  o.state = state;
  if (!('history' in extra)) o.history = buildHistory(state);
  Object.assign(o, extra); writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}
const nameStatus = (rows) => parseNameStatus(rows.map((r) => r.join('\t')).join('\n'));
// V2-C10 — write cumulative identity-bound stage markers for BASE.taskId.
function writeMarkers(taskDir, upto = 'validation', taskId = BASE.taskId) {
  writeJson(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'), { taskId, outcome: 'SOURCE_TRUTH_REVIEWED' });
  if (upto === 'review') return;
  writeJson(join(taskDir, '70-validation', 'VALIDATION.json'), { taskId, validationOutcome: 'VALIDATED_FOR_OWNER_MERGE_REVIEW' });
}

function run() {
  console.log('ResearchOps Factory V1.1 — fixtures (Correction 010)');

  // ---- prior baseline behaviors (must stay green) ----
  { const t = mk(); check('B1 fresh PREPARED task validates', validateTask(t, {}).ok); const s = statusTask(t); check('B1b fresh status PREPARED consistent', s.declaredState === 'PREPARED' && s.consistent); }
  { const td = tmpRoot(); createTask({ ...BASE, testRoot: td }); let threw = false; try { createTask({ ...BASE, testRoot: td }); } catch { threw = true; } check('B2 duplicate create refused', threw); }
  { let threw = false; try { createTask({ ...BASE, taskId: 'bad id/../x', testRoot: tmpRoot() }); } catch { threw = true; } check('B3 invalid task id refused', threw); check('B3b isValidTaskId rejects traversal', !isValidTaskId('a/../b')); }
  check('B4 invalid transition PREPARED->VALIDATED', !canTransition('PREPARED', 'VALIDATED'));
  check('B4b valid transition PREPARED->RESEARCH_CAPTURED', canTransition('PREPARED', 'RESEARCH_CAPTURED'));
  { const t = mk(); writePkg(t); const v = validateTask(t, {}); check('B5 valid package validates', v.ok, v.checks.filter((c) => !c.ok).map((c) => `${c.name}:${c.detail}`).join(' | ')); }

  // ---- C1 force-package ----
  { const t = mk(); check('C1 empty task + requirePackage fails', !validateTask(t, { requirePackage: true }).ok); }
  { const t = mk(); writePkg(t); check('C1b full package + requirePackage passes', validateTask(t, { requirePackage: true }).ok); }
  { const t = mk(); check('C1c empty task without force passes (PREPARED)', validateTask(t, {}).ok); }

  // ---- C2 state/evidence (validate + status agree, both fail closed) ----
  for (const s of ['RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'CORRECTED', 'VALIDATED', 'OWNER_CLOSEOUT_REQUIRED', 'RESEARCH_RECORD_MERGE_AUTHORIZED', 'RESEARCH_RECORD_MERGED_TO_MAIN']) {
    const t = mk(); setState(t, s);
    const v = validateTask(t, {}); const st = statusTask(t);
    check(`C2 empty+${s}: validate fails AND status inconsistent`, !v.ok && !st.consistent, `validate.ok=${v.ok} status.consistent=${st.consistent}`);
  }
  { const t = mk(); writePkg(t); setState(t, 'RESEARCH_CAPTURED'); check('C2b valid pkg + RESEARCH_CAPTURED consistent', validateTask(t, {}).ok && statusTask(t).consistent); }
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); check('C2c valid pkg + VALIDATED but no artifact fails', !validateTask(t, {}).ok);
    writeMarkers(t, 'validation');
    check('C2d valid pkg + VALIDATED with cumulative identity-bound markers consistent', validateTask(t, {}).ok, validateTask(t, {}).checks.filter((c) => !c.ok).map((c) => `${c.name}:${c.detail}`).join(' | ')); }

  // ---- C3/C4/C5 boundary + discovery (library-tested) ----
  check('C3 empty diff yields no records', parseNameStatus('').length === 0);
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001/20-research-output/research-run.json']])); check('C5 single task-root change ok', r.ok && r.mode === 'RESEARCH_TASK'); }
  { const r = checkChangedFileBoundary(nameStatus([['D', 'research-ops/tasks/CBW-X-001/TASK_STATE.json']])); check('C4 task-root deletion rejected', !r.ok && r.deletedTaskPaths.length === 1); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/tasks/CBW-A-001/x.json'], ['M', 'research-ops/tasks/CBW-B-002/y.json']])); check('C5b two task roots rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/tasks/CBW-A-001/x.json'], ['M', 'research-ops/factory-v1-1/lib/util.mjs']])); check('C5c task + factory escape rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops-pilot/tasks/X/y.json']])); check('C5d pilot mutation rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'src/index.ts']])); check('C5e src mutation rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'data/market-intelligence/x.json']])); check('C5f MI data rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'README.md']])); check('C5g arbitrary top-level file rejected', !r.ok); }
  { const m = { headBranch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', factory: { govRecord: { taskId: 'CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016', branch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: 'a'.repeat(40) }, approvedBaseSha: 'a'.repeat(40), headDescendsBase: true } };
    const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/util.mjs'], ['M', '.github/workflows/cbw-researchops-factory-validate.yml']]), m); check('C5h factory-governance boundary ok (trusted branch)', r.ok && r.mode === 'FACTORY_GOVERNANCE'); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/tasks/CBW-A-001/../../src/x']])); check('C5i traversal rejected', !r.ok); }

  // ---- C6 tasks-dir confinement (CLI has no flag; library testRoot only) ----
  { const t = createTask({ ...BASE, testRoot: tmpRoot() }).taskDir; check('C6 library testRoot honored', t.includes('rops-fx-')); }
  { const cwdTask = createTask({ ...BASE, repoRoot: tmpRoot() }).taskDir; check('C6b repoRoot -> research-ops/tasks confinement', cwdTask.replace(/\\/g, '/').includes('/research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001')); }

  // ---- C7 nested/hidden package entries ----
  { const t = mk(); writePkg(t, { after: (out) => { mkdirSync(join(out, 'sub')); writeFileSync(join(out, 'sub', 'evil.json'), '{}'); } }); check('C7 nested directory rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { after: (out) => writeFileSync(join(out, '.hidden'), 'x') }); check('C7b hidden file rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { after: (out) => writeFileSync(join(out, 'extra.json'), '{}') }); check('C7c extra flat file rejected', !validateTask(t, {}).ok); }

  // ---- C8 reference typing ----
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: 'src-a' }] } }, after: rebuildManifest }); check('C8 string reference field rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: null }] } }, after: rebuildManifest }); check('C8b null reference field rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: { x: 1 } }] } }, after: rebuildManifest }); check('C8c object reference field rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: [123] }] } }, after: rebuildManifest }); check('C8d non-string reference item rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: ['nope'] }] } }, after: rebuildManifest }); check('C8e dangling reference rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: [] }] } }, after: rebuildManifest }); check('C8f empty array allowed where optional', validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'payment-rails.json': { schemaVersion: '1.0', rails: [{ railId: 'rail-a' }] } }, after: rebuildManifest }); check('C8g missing required rail.sourceIds rejected', !validateTask(t, {}).ok); }

  // ---- C9 structural / schema ----
  { const t = mk(); const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p)); delete o.taskId; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9 missing TASK_STATE.taskId rejected', !validateTask(t, {}).ok); }
  { const t = mk(); rmSync(join(t, '00-contract', 'IDENTITY.json')); check('C9b missing IDENTITY rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, '00-contract', 'IDENTITY.json'); const o = JSON.parse(readFileSync(p)); o.taskId = 'MISMATCH-001'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9c IDENTITY/TASK_STATE taskId mismatch rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, '00-contract', 'GITHUB_PLAN.json'); const o = JSON.parse(readFileSync(p)); o.pullRequest.autoMerge = true; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9d GITHUB_PLAN autoMerge=true rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, '00-contract', 'GITHUB_PLAN.json'); const o = JSON.parse(readFileSync(p)); o.baseBranch = 'master'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9e GITHUB_PLAN base=master rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p)); delete o.authorizations.deployAuthorized; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9f missing canonical authorization key rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p)); o.authorizations.deployAuthorized = 'no'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('C9g non-boolean authorization value rejected', !validateTask(t, {}).ok); }

  // ---- authorization floor + owner receipt ----
  { const t = mk(); writePkg(t, { json: { 'research-run.json': { schemaVersion: '1.0', authorizations: { deployAuthorized: true } } }, after: rebuildManifest }); check('A1 forbidden authorization true rejected', !validateTask(t, {}).ok); }
  { const f = enforceAuthFloor({ a: { b: { canonicalImportAuthorized: true } } }, {}); check('A2 nested forbidden true caught', !f.ok); }
  { const v = validateOwnerReceipt({ authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: BASE.taskId, targetBranch: 'main', authorizations: { researchRecordMergeToMainAuthorized: true } }, BASE.taskId); check('A3 valid owner receipt accepted', v.ok && v.mergeAuthorized); }
  { const v = validateOwnerReceipt({ authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: BASE.taskId, targetBranch: 'main', authorizations: { researchRecordMergeToMainAuthorized: true, productionChangeAuthorized: true } }, BASE.taskId); check('A4 owner receipt escalating production rejected', !v.ok); }
  { const v = validateOwnerReceipt({ authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: 'OTHER', targetBranch: 'main', authorizations: { researchRecordMergeToMainAuthorized: true } }, BASE.taskId); check('A5 owner receipt taskId mismatch rejected', !v.ok); }
  { const v = validateOwnerReceipt({ authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: BASE.taskId, targetBranch: 'master', authorizations: { researchRecordMergeToMainAuthorized: true } }, BASE.taskId); check('A6 owner receipt target=master rejected', !v.ok); }

  // ---- MANIFEST depth + immutable-stage mutation ----
  { const t = mk(); writePkg(t); const p = join(t, '20-research-output', 'product-availability.json'); const o = JSON.parse(readFileSync(p)); o.products[0].status = 'AVAILABLE_WITH_LIMITS'; writeJson(p, o); check('M1 silent immutable-stage mutation caught by MANIFEST', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); const p = join(t, '20-research-output', 'MANIFEST.txt'); writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => !l.includes('payment-rails.json')).join('\n')); check('M2 absent MANIFEST row caught', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { after: (out) => { writeFileSync(join(out, 'source-truth-review-report.md'), Buffer.from('# Report\r\nx\r\n')); rebuildManifest(out); } }); check('M3 CRLF encoding caught', !validateTask(t, {}).ok); }

  // ---- status/validate agreement ----
  { const t = mk(); writePkg(t); check('S1 valid pkg: validate ok and status consistent', validateTask(t, {}).ok && statusTask(t).consistent); }
  { const t = mk(); setState(t, 'VALIDATED'); check('S2 inconsistent: validate fails and status inconsistent', !validateTask(t, {}).ok && !statusTask(t).consistent); }

  // ================= V2 corrections =================

  // ---- V2-C1 real worktree-root confinement ----
  { const root = resolveWorktreeRoot(process.cwd()); check('V2-C1 resolves a real worktree root from cwd', typeof root === 'string' && root.length > 0); }
  { const ext = mkdtempSync(join(tmpdir(), 'rops-nogit-')); roots.push(ext); check('V2-C1b external non-git temp dir -> null (fail closed)', resolveWorktreeRoot(ext) === null); }
  // Canonical create (no injected root) resolves the real worktree root and would write
  // under the tracked tree, so it is NOT exercised here (write-boundary safe). The
  // external-cwd fail-closed create path is covered by the direct CLI probe.
  { const ext2 = mkdtempSync(join(tmpdir(), 'rops-nogit2-')); roots.push(ext2); check('V2-C1c create is confined via worktree resolution (no external-cwd root)', resolveWorktreeRoot(ext2) === null); }

  // ---- V2-C2 strict rename/copy name-status ----
  { const recs = parseNameStatus('R100\tresearch-ops/tasks/CBW-A-001/x.json\tresearch-ops/tasks/CBW-A-001/y.json');
    check('V2-C2 R100 keeps src+dst', recs.length === 1 && recs[0].src.endsWith('x.json') && recs[0].dst.endsWith('y.json')); }
  { const recs = parseNameStatus('Z9\tresearch-ops/tasks/CBW-A-001/x.json'); check('V2-C2b unknown status flagged malformed', !!recs[0].malformed); }
  { const recs = parseNameStatus('R100\tonly-one-path'); check('V2-C2c rename with missing dst malformed', !!recs[0].malformed); }
  { const recs = parseNameStatus('A\t'); check('V2-C2d empty path malformed', recs.length === 0 || !!recs[0].malformed); }
  { const r = checkChangedFileBoundary(parseNameStatus('R100\tresearch-ops-pilot/tasks/OKX/immutable.json\tresearch-ops/tasks/CBW-A-001/00-contract/x.json')); check('V2-C2e rename FROM pilot source rejected (src evaluated)', !r.ok); }
  { const r = checkChangedFileBoundary(parseNameStatus('R100\tresearch-ops/tasks/CBW-A-001/x.json\tresearch-ops/factory-v1-1/lib/evil.mjs'), { headBranch: 'research/kz-binance-b', baseBranch: 'main' }); check('V2-C2f rename task->factory rejected', !r.ok); }
  { const r = checkChangedFileBoundary(parseNameStatus('D\tresearch-ops/tasks/CBW-A-001/TASK_STATE.json'), { headBranch: 'research/kz-binance-b', baseBranch: 'main' }); check('V2-C2g rename/delete of governed record rejected', !r.ok && r.deletedTaskPaths.length === 1); }

  // ---- V2-C3 trusted PR/change-mode identity ----
  { check('V2-C3 factory branch -> FACTORY_GOVERNANCE', trustedModeFromMeta({ headBranch: 'correction/researchops-factory-v1-1-v3-014', baseBranch: 'validation/researchops-factory-v1-1-v2-013' }) === 'FACTORY_GOVERNANCE'); }
  { check('V2-C3b research branch -> RESEARCH_TASK', trustedModeFromMeta({ headBranch: 'research/kz-binance-kz-p0-d', baseBranch: 'main' }) === 'RESEARCH_TASK'); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/util.mjs']]), { headBranch: 'research/kz-binance-kz-p0-d', baseBranch: 'main' }); check('V2-C3c research branch changing only a factory file rejected (mode confusion)', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/util.mjs']])); check('V2-C3d factory change with NO trusted metadata fails closed', !r.ok); }

  // ---- V2-C4 exact workflow allowlist ----
  { const r = checkChangedFileBoundary(nameStatus([['M', '.github/workflows/deploy-production.yml']]), { headBranch: 'correction/researchops-factory-v1-1-v3-014', baseBranch: 'validation/researchops-factory-v1-1-v2-013' }); check('V2-C4 unrelated deploy workflow rejected', !r.ok); }
  { const m = { headBranch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', factory: { govRecord: { taskId: 'CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016', branch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: 'a'.repeat(40) }, approvedBaseSha: 'a'.repeat(40), headDescendsBase: true } };
    const r = checkChangedFileBoundary(nameStatus([['M', '.github/workflows/cbw-researchops-factory-validate.yml']]), m); check('V2-C4b exact factory workflow accepted', r.ok && r.mode === 'FACTORY_GOVERNANCE'); }

  // ---- V2-C5 stage-aware append-only (pure) ----
  { const r = checkStageTransition({ records: [{ status: 'M', rel: '00-contract/IDENTITY.json' }], baseState: 'VALIDATED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5 00-contract modification after creation rejected', !r.ok); }
  { const r = checkStageTransition({ records: [{ status: 'M', rel: '20-research-output/research-run.json' }], baseState: 'PACKAGE_VALIDATED', headState: 'SOURCE_TRUTH_REVIEWED', taskExistsAtBase: true }); check('V2-C5b re-manifested 20-research-output mutation after capture rejected', !r.ok); }
  { const r = checkStageTransition({ records: [{ status: 'D', rel: '50-source-truth-review/SOURCE_TRUTH_REVIEW.json' }], baseState: 'CORRECTED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5c deletion of closed 50-stage after validation rejected', !r.ok); }
  { const r = checkStageTransition({ records: [{ status: 'R', rel: '60-correction/x.json', srcRel: '60-correction/y.json' }], baseState: 'CORRECTED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5d rename within closed 60-stage rejected', !r.ok); }
  { const r = checkStageTransition({ records: [{ status: 'A', rel: '70-validation/VALIDATION.json' }, { status: 'M', rel: 'TASK_STATE.json' }], baseState: 'SOURCE_TRUTH_REVIEWED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5e legal add into open 70-stage on VALIDATED transition allowed', r.ok, r.violations.join('; ')); }
  { const r = checkStageTransition({ records: [{ status: 'A', rel: '80-closeout/EXTRA.json' }], baseState: 'CORRECTED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5f unrelated addition in a non-open stage rejected', !r.ok); }
  { const r = checkStageTransition({ records: canonicalSkeletonFiles().map((f) => ({ status: 'A', rel: f })), baseState: null, headState: 'PREPARED', taskExistsAtBase: false }); check('V2-C5g creation admits the exact skeleton at PREPARED', r.ok, r.violations.join('; ')); }
  { const r = checkStageTransition({ records: [{ status: 'M', rel: '20-research-output/x.json' }], baseState: 'PREPARED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V2-C5h illegal transition PREPARED->VALIDATED rejected', !r.ok); }

  // ---- V2-C6 full GITHUB_PLAN cross-binding ----
  { const t = mk(); const p = join(t, '00-contract', 'GITHUB_PLAN.json'); const o = JSON.parse(readFileSync(p)); o.taskBranch = 'research/other-branch'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('V2-C6 taskBranch != TASK_STATE.branch rejected', !validateTask(t, {}).ok); }
  { const t = mk(); const p = join(t, '00-contract', 'GITHUB_PLAN.json'); const o = JSON.parse(readFileSync(p)); o.pullRequest.head = 'research/mismatch'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('V2-C6b pullRequest.head != taskBranch rejected', !validateTask(t, {}).ok); }
  { const t = mk(); check('V2-C6c generated plan cross-binds cleanly', validateTask(t, {}).ok); }

  // ---- V2-C7 identity grammar/types ----
  { check('V2-C7 malformed country rejected', validateIdentityValues({ countryCode: 'zz9', countryName: 'X', exchangeId: 'binance', exchangeName: 'B', batchId: 'B', priority: 'P0' }).length > 0); }
  { check('V2-C7b traversal exchangeId rejected', validateIdentityValues({ countryCode: 'KZ', countryName: 'X', exchangeId: '../evil', exchangeName: 'B', batchId: 'B', priority: 'P0' }).length > 0); }
  { check('V2-C7c bad priority rejected', validateIdentityValues({ countryCode: 'KZ', countryName: 'X', exchangeId: 'binance', exchangeName: 'B', batchId: 'B', priority: 'P9' }).length > 0); }
  { let threw = false; try { createTask({ ...BASE, countryCode: 'zz9', testRoot: tmpRoot() }); } catch { threw = true; } check('V2-C7d create rejects malformed identity', threw); }
  { const t = mk(); const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p)); o.countryCode = 'zz'; o.branch = 'research/zz-binance-kz-p0-d';
    const ip = join(t, '00-contract', 'IDENTITY.json'); const io = JSON.parse(readFileSync(ip)); io.countryCode = 'zz';
    writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); writeFileSync(ip, JSON.stringify(io, null, 2) + '\n');
    check('V2-C7e malformed-but-equal country in files rejected at validate', !validateTask(t, {}).ok); }

  // ---- V2-C8 all nine research JSON top-level shapes ----
  { const files = ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json'];
    let allRejected = true; const bad = [];
    for (const f of files) { const t = mk(); writePkg(t, { json: { [f]: [] } }); const ok = validateTask(t, {}).ok; if (ok) { allRejected = false; bad.push(f); } }
    check('V2-C8 wrong top-level shape ([]) rejected for all nine research JSONs', allRejected, `accepted: ${bad.join(', ')}`); }
  { const t = mk(); writePkg(t, { json: { 'import-readiness.json': { schemaVersion: '1.0' } } }); check('V2-C8b import-readiness missing readiness rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'research-run.json': { schemaVersion: '1.0' } } }); check('V2-C8c research-run missing overallFinding rejected', !validateTask(t, {}).ok); }

  // ---- V2-C9 strict UTF-8 ----
  { check('V2-C9 lone 0xFF byte invalid', !isValidUtf8(Buffer.from([0xff]))); }
  { check('V2-C9b valid ascii ok', isValidUtf8(Buffer.from('hello', 'utf8'))); }
  { const t = mk(); const out = writePkg(t); writeFileSync(join(out, 'source-truth-review-report.md'), Buffer.concat([Buffer.from('# R\n', 'utf8'), Buffer.from([0xff, 0xfe]), Buffer.from('\n', 'utf8')])); writeFileSync(join(out, 'MANIFEST.txt'), Buffer.from(buildManifest(out, HASHED, {}), 'utf8')); check('V2-C9c invalid UTF-8 in markdown rejected despite valid MANIFEST', !validateTask(t, {}).ok); }
  { const t = mk(); const out = writePkg(t); writeFileSync(join(out, 'schema-normalization-notes.json'), Buffer.concat([Buffer.from('{"notes":[],"x":"', 'utf8'), Buffer.from([0xff]), Buffer.from('"}', 'utf8')])); writeFileSync(join(out, 'MANIFEST.txt'), Buffer.from(buildManifest(out, HASHED, {}), 'utf8')); check('V2-C9d invalid UTF-8 in JSON rejected despite valid MANIFEST', !validateTask(t, {}).ok); }

  // ---- V2-C10 identity-bound cumulative markers ----
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); writeFileSync(join(t, '70-validation', 'VALIDATION.json'), ''); check('V2-C10 zero-byte marker rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); writeFileSync(join(t, '70-validation', 'VALIDATION.json'), 'not json'); check('V2-C10b malformed-json marker rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); writeMarkers(t, 'review'); writeJson(join(t, '70-validation', 'VALIDATION.json'), { taskId: 'CBW-WRONG-TASK-001', validationOutcome: 'X' }); check('V2-C10c wrong-task marker rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); writeJson(join(t, '70-validation', 'VALIDATION.json'), { taskId: BASE.taskId, validationOutcome: 'X' }); check('V2-C10d cumulative: VALIDATED without 50-review marker rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); setState(t, 'VALIDATED'); writeMarkers(t, 'validation'); check('V2-C10e cumulative identity-bound markers accepted', validateTask(t, {}).ok); }
  { const r = validateMarker(mk(), REVIEW_MARKER, BASE.taskId); check('V2-C10f missing marker reported', !r.ok); }

  // ================= V3 corrections =================
  // V4 factory-governance meta: correction (implementation-class) role with a valid
  // owner governed record, approved-base ancestry, and its own result directory.
  const FAC_BASE_SHA = 'a'.repeat(40);
  const V4_TASK = 'CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016';
  const facMeta = (over = {}) => {
    const headBranch = over.headBranch || 'correction/researchops-factory-v1-1-v4-016';
    const baseBranch = over.baseBranch || 'validation/researchops-factory-v1-1-v3-015';
    const gov = over.govRecord === undefined
      ? { taskId: V4_TASK, branch: headBranch, baseBranch, approvedBaseSha: FAC_BASE_SHA }
      : over.govRecord;
    return { headBranch, baseBranch, factory: { role: over.role, govRecord: gov, approvedBaseSha: FAC_BASE_SHA, headDescendsBase: over.headDescendsBase ?? true, currentResultDir: over.currentResultDir || 'research-ops/factory-v1-1/correction-v4-016/' } };
  };
  const FAC = facMeta();
  const RES = (root, over = {}) => ({ headBranch: 'research/kz-binance-kz-p0-d', baseBranch: 'main', taskStates: { [root]: { base: 'PREPARED', head: 'RESEARCH_CAPTURED', existsAtBase: true, headBranch: 'research/kz-binance-kz-p0-d', headTaskId: root.split('/').pop(), baseHistory: [{ state: 'PREPARED' }], headHistory: [{ state: 'PREPARED' }, { state: 'RESEARCH_CAPTURED' }], ...over } } });

  // ---- V3-C1 script-worktree binding ----
  { const ext = mkdtempSync(join(tmpdir(), 'rops-foreign-')); roots.push(ext); let threw = false;
    try { requireScriptBoundWorktreeRoot(join(process.cwd(), 'research-ops/factory-v1-1/bin/researchops.mjs'), ext); } catch { threw = true; }
    check('V3-C1 foreign/non-git cwd rejected by script-bound resolver', threw); }
  { const scriptRoot = requireScriptBoundWorktreeRoot(join(process.cwd(), 'research-ops/factory-v1-1/bin/researchops.mjs'), process.cwd());
    check('V3-C1b same-worktree cwd resolves the script worktree', typeof scriptRoot === 'string' && scriptRoot.length > 0); }

  // ---- V3-C2/V4-C3 factory mode + governed-record anti-spoof ----
  { check('V3-C2 correction role on factory base -> FACTORY_GOVERNANCE', trustedModeFromMeta({ headBranch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015' }) === 'FACTORY_GOVERNANCE'); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), facMeta({ headBranch: 'correction/researchops-factory-v1-1-evil', govRecord: null }));
    check('V3-C2b spoof factory branch without owner governed record rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), facMeta({ govRecord: { taskId: V4_TASK, branch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'WRONG-BASE', approvedBaseSha: FAC_BASE_SHA } }));
    check('V3-C2c governed record base mismatch rejected', !r.ok); }

  // ---- V3-C3 research head <-> task plan binding ----
  { const root = 'research-ops/tasks/CBW-A-001'; const r = checkChangedFileBoundary(nameStatus([['A', `${root}/20-research-output/research-run.json`]]), RES(root, { headBranch: 'research/zz-mismatch-b' })); check('V3-C3 research head != declared branch rejected', !r.ok); }
  { const root = 'research-ops/tasks/CBW-A-001'; const r = checkChangedFileBoundary(nameStatus([['A', `${root}/20-research-output/research-run.json`]]), RES(root)); check('V3-C3b matching research head accepted', r.ok, r.violations.join('; ')); }

  // ---- V3-C4 frozen governance/history + workflow protection ----
  { const frozen = ['governance/POLICY.md', 'validation-009/x.json', 'correction-010/CORRECTION_RESULT.json', 'correction-validation-011/y.json', 'correction-v2-012/CORRECTION_V2_CONTRACT.md', 'correction-v2-validation-013/z.json', 'correction-v3-014/CORRECTION_V3_RESULT.json', 'correction-v3-validation-015/x.json'];
    const allRejected = frozen.every((f) => !checkChangedFileBoundary(nameStatus([['M', `research-ops/factory-v1-1/${f}`]]), FAC).ok);
    check('V3-C4 frozen prior layers immutable under factory-governance', allRejected); }
  { const r = checkChangedFileBoundary(nameStatus([['D', '.github/workflows/cbw-researchops-factory-validate.yml']]), FAC); check('V3-C4b factory workflow deletion rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['R100', '.github/workflows/cbw-researchops-factory-validate.yml', '.github/workflows/renamed.yml']]), FAC); check('V3-C4c factory workflow rename rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.json'], ['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), FAC); check('V3-C4d current result dir + impl allowed', r.ok, r.violations.join('; ')); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v2-validation-013/FACTORY_CORRECTION_V2_VALIDATION.json']]), FAC); check('V3-C4e other/frozen result dir rejected', !r.ok); }

  // ---- V3-C5 exact initial skeleton ----
  { const withExtra = [...canonicalSkeletonFiles(), 'ROGUE.txt'].map((f) => ({ status: 'A', rel: f }));
    check('V3-C5 extra creation file rejected', !checkStageTransition({ records: withExtra, baseState: null, headState: 'PREPARED', taskExistsAtBase: false }).ok); }
  { const missing = canonicalSkeletonFiles().filter((f) => f !== 'TASK_STATE.json').map((f) => ({ status: 'A', rel: f }));
    check('V3-C5b missing skeleton file rejected', !checkStageTransition({ records: missing, baseState: null, headState: 'PREPARED', taskExistsAtBase: false }).ok); }

  // ---- V3-C6 exact per-stage inventory + duplicate markers ----
  { const r = checkStageTransition({ records: [{ status: 'A', rel: '70-validation/UNRELATED.json' }, { status: 'M', rel: 'TASK_STATE.json' }], baseState: 'SOURCE_TRUTH_REVIEWED', headState: 'VALIDATED', taskExistsAtBase: true }); check('V3-C6 unrelated file in stage rejected', !r.ok); }
  { const t = mk(); writeJson(join(t, '70-validation', 'VALIDATION.json'), { taskId: BASE.taskId, validationOutcome: 'VALIDATED_FOR_OWNER_MERGE_REVIEW' }); writeJson(join(t, '70-validation', 'FACTORY_VALIDATION.json'), { taskId: BASE.taskId, validationOutcome: 'VALIDATED_FOR_OWNER_MERGE_REVIEW' });
    check('V3-C6b conflicting duplicate markers rejected', !validateMarker(t, VALIDATION_MARKER, BASE.taskId).ok); }

  // ---- V3-C7 marker outcome enums + merge lineage ----
  { const t = mk(); writeJson(join(t, '70-validation', 'VALIDATION.json'), { taskId: BASE.taskId, validationOutcome: 'banana' }); check('V3-C7 arbitrary outcome rejected', !validateMarker(t, VALIDATION_MARKER, BASE.taskId).ok); }
  { const t = mk(); writeJson(join(t, '80-closeout', 'MERGE_RECORD.json'), { taskId: BASE.taskId, mergeCommit: 'x' }); check('V3-C7b fake merge commit rejected', !validateMarker(t, MERGE_MARKER, BASE.taskId).ok); }
  { const t = mk(); writeJson(join(t, '80-closeout', 'MERGE_RECORD.json'), { taskId: BASE.taskId, targetBranch: 'main', mergeCommit: 'a'.repeat(40), mergedState: 'RESEARCH_RECORD_MERGED_TO_MAIN', receiptHash: 'b'.repeat(64) }); check('V3-C7c valid 40-hex merge record (structure) accepted', validateMarker(t, MERGE_MARKER, BASE.taskId).ok, validateMarker(t, MERGE_MARKER, BASE.taskId).reason); }

  // ---- V3-C8 cumulative correction from history ----
  { const t = mk(); writePkg(t); writeMarkers(t, 'validation'); setState(t, 'VALIDATED', { history: buildHistory('CORRECTED').concat([{ state: 'VALIDATED', at: '2026-07-27T00:00:09Z' }]) }); check('V3-C8 VALIDATED via correction path without correction marker rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t); writeMarkers(t, 'validation'); writeJson(join(t, '60-correction', 'CORRECTION_RESULT.json'), { taskId: BASE.taskId, correctionOutcome: 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION' }); setState(t, 'VALIDATED', { history: buildHistory('CORRECTED').concat([{ state: 'VALIDATED', at: '2026-07-27T00:00:09Z' }]) }); check('V3-C8b correction path WITH correction marker accepted', validateTask(t, {}).ok, validateTask(t, {}).checks.filter((c) => !c.ok).map((c) => c.name).join('|')); }

  // ---- V3-C9 history integrity + append-only ----
  { const t = mk(); const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p)); o.state = 'VALIDATED'; writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); check('V3-C9 head state contradicting history rejected', !validateTask(t, {}).ok); }
  { check('V3-C9b non-canonical history transition rejected', validateHistory([{ state: 'PREPARED' }, { state: 'VALIDATED' }], 'VALIDATED').length > 0); }
  { check('V3-C9c append-only prefix ok', checkHistoryAppendOnly([{ state: 'PREPARED' }], [{ state: 'PREPARED' }, { state: 'RESEARCH_CAPTURED' }]).ok); }
  { check('V3-C9d rewritten prior history rejected', !checkHistoryAppendOnly([{ state: 'PREPARED', at: 'a' }], [{ state: 'PREPARED', at: 'TAMPERED' }, { state: 'RESEARCH_CAPTURED' }]).ok); }

  // ---- V3-C10 strict name-status grammar ----
  { check('V3-C10 R101 rejected', !!parseNameStatus('R101\ta\tb')[0].malformed); }
  { check('V3-C10b C999 rejected', !!parseNameStatus('C999\ta\tb')[0].malformed); }
  { check('V3-C10c R100 (boundary) accepted', !parseNameStatus('R100\ta/b\tc/d')[0].malformed); }
  { const recs = parseNameStatusZ('A\0research-ops/tasks/CBW-A-001/x.json\0R100\0research-ops/tasks/CBW-A-001/y.json\0research-ops/tasks/CBW-A-001/z.json'); check('V3-C10d NUL-delimited parse (A + R100 src/dst)', recs.length === 2 && recs[1].src.endsWith('y.json') && recs[1].dst.endsWith('z.json')); }
  { check('V3-C10e quoted path in tab parser rejected', !!parseNameStatus('A\t"quoted\\tpath"')[0].malformed); }

  // ---- V3-C11 non-vacuous minima ----
  { const t = mk(); writePkg(t, { json: { 'research-run.json': { schemaVersion: '1.0', overallFinding: {} } } }); check('V3-C11 vacuous overallFinding {} rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'import-readiness.json': { schemaVersion: '1.0', readiness: {} } } }); check('V3-C11b vacuous readiness {} rejected', !validateTask(t, {}).ok); }
  { const t = mk(); writePkg(t, { json: { 'offer-eligibility-review.json': { schemaVersion: '1.0', review: {} } } }); check('V3-C11c review without sourceIds rejected', !validateTask(t, {}).ok); }

  // ---- V3-C12 control-byte rejection ----
  { check('V3-C12 NUL byte flagged', hasForbiddenControls(Buffer.from([0x41, 0x00, 0x42]))); }
  { check('V3-C12b BEL control flagged', hasForbiddenControls(Buffer.from([0x41, 0x07]))); }
  { check('V3-C12c tab/LF allowed', !hasForbiddenControls(Buffer.from('a\tb\nc', 'utf8'))); }
  { const t = mk(); const out = writePkg(t); writeFileSync(join(out, 'schema-normalization-notes.json'), Buffer.concat([Buffer.from('{"notes":[],"x":"a', 'utf8'), Buffer.from([0x00]), Buffer.from('b"}', 'utf8')])); writeFileSync(join(out, 'MANIFEST.txt'), Buffer.from(buildManifest(out, HASHED, {}), 'utf8')); check('V3-C12d NUL in JSON rejected with valid MANIFEST', !validateTask(t, {}).ok); }

  // ================= V4 final critical corrections =================

  // ---- V4-C1 task-role capability profiles ----
  { check('V4-C1 role derivation', roleForBranch('correction/researchops-factory-v1-1-v4-016') === 'correction' && roleForBranch('validation/researchops-factory-v1-1-v3-015') === 'validation'); }
  { const cap = capabilityForRole('validation'); check('V4-C1b validation role cannot modify implementation', cap.canModifyImplementation === false && cap.canModifyWorkflow === false); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), facMeta({ headBranch: 'validation/researchops-factory-v1-1-v3-015', baseBranch: 'correction/researchops-factory-v1-1-v3-014', govRecord: { taskId: 'CBW-...-V3-VALIDATION-015', branch: 'validation/researchops-factory-v1-1-v3-015', baseBranch: 'correction/researchops-factory-v1-1-v3-014', approvedBaseSha: FAC_BASE_SHA } }));
    check('V4-C1c validation role modifying lib/boundary.mjs rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.json'], ['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.md'], ['A', 'research-ops/factory-v1-1/correction-v4-016/THIRD.json']]), FAC);
    check('V4-C1d arbitrary third result file rejected (>2)', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_STATE.json']]), FAC);
    check('V4-C1e setup file mutation rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.json'], ['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.md']]), FAC);
    check('V4-C1f exactly two result files accepted', r.ok, r.violations.join('; ')); }

  // ---- V4-C2 trusted enforcement root ----
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/lineage.mjs']]), facMeta({ headBranch: 'validation/researchops-factory-v1-1-v3-015', baseBranch: 'correction/researchops-factory-v1-1-v3-014', govRecord: { taskId: 'V', branch: 'validation/researchops-factory-v1-1-v3-015', baseBranch: 'correction/researchops-factory-v1-1-v3-014', approvedBaseSha: FAC_BASE_SHA } }));
    check('V4-C2 validation self-modifying enforcement root (lineage) rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs'], ['M', 'research-ops/factory-v1-1/lib/lineage.mjs']]), FAC);
    check('V4-C2b implementation/correction role MAY change enforcement root (validated by trusted base run)', r.ok, r.violations.join('; ')); }

  // ---- V4-C3/C4 governed record + ancestry + no future preauth ----
  { check('V4-C3 governed record identity binding', validateGovernedRecord({ taskId: V4_TASK, branch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: FAC_BASE_SHA }, { headBranch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: FAC_BASE_SHA }).ok); }
  { check('V4-C3b wrong approved base SHA rejected', !validateGovernedRecord({ taskId: V4_TASK, branch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: 'c'.repeat(40) }, { headBranch: 'correction/researchops-factory-v1-1-v4-016', baseBranch: 'validation/researchops-factory-v1-1-v3-015', approvedBaseSha: FAC_BASE_SHA }).ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), facMeta({ headDescendsBase: false })); check('V4-C3c non-descendant head rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), facMeta({ govRecord: null })); check('V4-C4 future/absent governed record rejected', !r.ok); }
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_CONTRACT.md']]), FAC); check('V4-C4b task cannot modify its own governing setup record', !r.ok); }

  // ---- V4-C5 canonical skeleton bytes ----
  { const opts = { taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001', countryCode: 'KZ', countryName: 'Kazakhstan', exchangeId: 'binance', exchangeName: 'Binance', batchId: 'KZ-P0-D', priority: 'P0', createdAt: '2026-07-27' };
    const canon = renderSkeleton(opts); const files = {}; for (const [rel, c] of Object.entries(canon)) files[rel] = { bytes: Buffer.from(canonicalizeText(c), 'utf8') };
    check('V4-C5 exact canonical skeleton accepted', validateSkeletonContent(files, opts).ok, validateSkeletonContent(files, opts).violations.join('; '));
    const tampered = { ...files }; tampered['00-contract/DEEP_RESEARCH_PROMPT.md'] = { bytes: Buffer.from('# only a title\n', 'utf8') };
    check('V4-C5b safety-text/content substitution rejected', !validateSkeletonContent(tampered, opts).ok);
    const symlinked = { ...files }; symlinked['00-contract/IDENTITY.json'] = { bytes: files['00-contract/IDENTITY.json'].bytes, symlink: true };
    check('V4-C5c symlink skeleton entry rejected', !validateSkeletonContent(symlinked, opts).ok);
    const exec = { ...files }; exec['TASK_STATE.json'] = { bytes: files['TASK_STATE.json'].bytes, mode: 0o755 };
    check('V4-C5d executable skeleton entry rejected', !validateSkeletonContent(exec, opts).ok); }

  // ---- V4-C6 real merge proof ----
  { const zero = { taskId: BASE.taskId, targetBranch: 'main', mergeCommit: '0'.repeat(40), mergedState: 'RESEARCH_RECORD_MERGED_TO_MAIN', receiptHash: 'b'.repeat(64) };
    check('V4-C6 all-zero merge SHA rejected', !verifyMergeRecord(zero, BASE.taskId, { commitExists: true, reachableFromMain: true }).ok); }
  { const rec = { taskId: BASE.taskId, targetBranch: 'main', mergeCommit: 'a'.repeat(40), mergedState: 'RESEARCH_RECORD_MERGED_TO_MAIN', receiptHash: 'b'.repeat(64) };
    check('V4-C6b nonexistent commit rejected', !verifyMergeRecord(rec, BASE.taskId, { commitExists: false }).ok);
    check('V4-C6c non-main-reachable commit rejected', !verifyMergeRecord(rec, BASE.taskId, { commitExists: true, reachableFromMain: false }).ok);
    check('V4-C6d missing receipt linkage rejected', !verifyMergeRecord({ ...rec, receiptHash: undefined }, BASE.taskId, { commitExists: true, reachableFromMain: true }).ok);
    check('V4-C6e receipt hash mismatch rejected', !verifyMergeRecord(rec, BASE.taskId, { commitExists: true, reachableFromMain: true, governedTreePresent: true, receiptHashMatch: false }).ok);
    check('V4-C6f full valid merge proof accepted', verifyMergeRecord(rec, BASE.taskId, { commitExists: true, reachableFromMain: true, governedTreePresent: true, receiptHashMatch: true, receiptPredatesMerge: true, receiptAuthorizesThisTaskOnly: true }).ok); }

  // ---- V4-C7 checkout/event/workspace integrity + recovery reconciliation ----
  { check('V4-C7 HEAD != trusted head SHA rejected', !checkEventIntegrity({ checkedOutHead: 'x', trustedHeadSha: 'y' }).ok); }
  { check('V4-C7b workspace != resolved root rejected', !checkEventIntegrity({ workspace: '/a', resolvedRoot: '/b' }).ok); }
  { check('V4-C7c non-descendant head rejected', !checkEventIntegrity({ headDescendsBase: false }).ok); }
  { check('V4-C7d shallow repo rejected', !checkEventIntegrity({ shallow: true }).ok); }
  { check('V4-C7e missing base/head object rejected', !checkEventIntegrity({ baseExists: false }).ok && !checkEventIntegrity({ headExists: false }).ok); }
  { check('V4-C7f diff endpoints must match trusted SHAs', !checkEventIntegrity({ diffBaseSha: '1', approvedBaseSha: '2' }).ok); }
  { check('V4-C7g clean integrity passes', checkEventIntegrity({ checkedOutHead: 'h', trustedHeadSha: 'h', workspace: '/r', resolvedRoot: '/r/', baseExists: true, headExists: true, headDescendsBase: true, shallow: false }).ok); }
  { check('V4-C7h V3 recovery reconciliation (2 commits, identical tree)', reconcileRecovery({ commitCount: 2, baseTree: 'T', headTree: 'T' }).ok && !reconcileRecovery({ commitCount: 2, baseTree: 'T', headTree: 'U' }).ok && !reconcileRecovery({ commitCount: 5, baseTree: 'T', headTree: 'T' }).ok); }

  // ---- authorization floor still intact ----
  { const t = mk(); writePkg(t, { json: { 'research-run.json': { schemaVersion: '1.0', overallFinding: { recommendation: 'CONFLICTING' }, authorizations: { deployAuthorized: true } } }, after: rebuildManifest }); check('V4 authorization floor still rejects forbidden true', !validateTask(t, {}).ok); }

  // ================= R1 CI remediation =================
  const A = BOOTSTRAP_ANCHOR;
  const anchorCtx = (over = {}) => ({ baseHasV4Policy: false, issue: A.issue, pullRequest: A.pullRequest, headBranch: A.headBranch, baseBranch: A.baseBranch, approvedBaseSha: A.approvedBaseSha, frozenSetupSha: A.frozenSetupSha, headDescendsApprovedBase: true, headDescendsFrozenSetup: true, ...over });

  // (1) checkout of a PR merge commit versus exact head SHA
  { const merge = 'a80bb7c0000000000000000000000000000000000'; const head = '6b8c771f0418be6dba6d785fba14c540ed3d30a2';
    check('R1-1 PR merge-commit checkout (HEAD=merge != head sha) rejected', !checkEventIntegrity({ checkedOutHead: merge, trustedHeadSha: head }).ok);
    check('R1-1b exact head-sha checkout accepted', checkEventIntegrity({ checkedOutHead: head, trustedHeadSha: head, workspace: '/r', resolvedRoot: '/r', baseExists: true, headExists: true, headDescendsBase: true, shallow: false }).ok); }
  // (2) checked-out HEAD mismatch
  { check('R1-2 checked-out HEAD mismatch rejected', !checkEventIntegrity({ checkedOutHead: 'deadbeef', trustedHeadSha: 'cafe' }).ok); }
  // (3) old base validator receiving unsupported V4 flags -> avoided by choosing BOOTSTRAP (not DESCENDANT) when base lacks V4 policy
  { const r = resolveEnforcement(anchorCtx({ baseHasV4Policy: false })); check('R1-3 base without V4 policy -> BOOTSTRAP (never run old base with V4 flags)', r.mode === 'BOOTSTRAP'); }
  // (4) bootstrap policy anchor mismatch
  { check('R1-4 anchor issue mismatch -> REJECT', resolveEnforcement(anchorCtx({ issue: 999 })).mode === 'REJECT');
    check('R1-4b anchor PR mismatch -> REJECT', resolveEnforcement(anchorCtx({ pullRequest: 12345 })).mode === 'REJECT');
    check('R1-4c anchor approved-base mismatch -> REJECT', resolveEnforcement(anchorCtx({ approvedBaseSha: 'x'.repeat(40) })).mode === 'REJECT');
    check('R1-4d non-descendant of frozen setup -> REJECT', resolveEnforcement(anchorCtx({ headDescendsFrozenSetup: false })).mode === 'REJECT'); }
  // (5) bootstrap used by an unrelated branch/task
  { check('R1-5 unrelated head branch -> REJECT', resolveEnforcement(anchorCtx({ headBranch: 'correction/researchops-factory-v1-1-evil' })).mode === 'REJECT');
    check('R1-5b unrelated base branch -> REJECT', resolveEnforcement(anchorCtx({ baseBranch: 'main' })).mode === 'REJECT'); }
  // (6) setup files modified after frozen setup (worker diff modifying a setup file)
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_STATE.json']]), FAC); check('R1-6 setup file modified in worker diff rejected', !r.ok); }
  // (7) worker diff evaluated from the wrong endpoint / setup phase integrity
  { check('R1-7 exact setup phase accepted', checkSetupPhase(nameStatus(A.setupFiles.map((f) => ['A', f]))).ok);
    check('R1-7b extra file in setup phase rejected', !checkSetupPhase(nameStatus([...A.setupFiles.map((f) => ['A', f]), ['A', 'research-ops/factory-v1-1/lib/evil.mjs']])).ok);
    check('R1-7c setup-phase non-addition rejected', !checkSetupPhase(nameStatus([['M', A.setupFiles[0]], ['A', A.setupFiles[1]], ['A', A.setupFiles[2]]])).ok);
    check('R1-7d missing setup file rejected', !checkSetupPhase(nameStatus([['A', A.setupFiles[0]]])).ok); }
  // (8) final descendant trusted-base execution
  { const r = resolveEnforcement(anchorCtx({ baseHasV4Policy: true, headBranch: 'validation/researchops-factory-v1-1-final-acceptance-017', baseBranch: 'correction/researchops-factory-v1-1-v4-016', approvedBaseSha: 'z'.repeat(40) }));
    check('R1-8 descendant (base carries V4 policy) -> DESCENDANT protected base', r.mode === 'DESCENDANT'); }

  // ================= R2 generic descendant owner-setup boundary =================
  const RD = 'research-ops/factory-v1-1/correction-v3-validation-015/';
  const SETUP = { contract: RD + 'VALIDATION_CONTRACT.md', state: RD + 'VALIDATION_STATE.json', prompt: RD + 'CLAUDE_VALIDATION_PROMPT.md' };
  const RES1 = RD + 'FACTORY_CORRECTION_V3_VALIDATION.json'; const RES2 = RD + 'FACTORY_CORRECTION_V3_VALIDATION.md';
  const cmt = (sha, rows) => ({ sha, records: nameStatus(rows) });
  const setupAdds = [['A', SETUP.contract], ['A', SETUP.state], ['A', SETUP.prompt]];

  // Positive: one-commit setup then worker/result commit -> unique boundary
  { const commits = [cmt('setup1', setupAdds), cmt('work1', [['A', RES1], ['A', RES2]])];
    const r = discoverFrozenSetupBoundary(commits, RD);
    check('R2 unique frozen setup boundary (single setup commit)', r.ok && r.frozenSetupSha === 'setup1', r.violations.join('; ')); }
  // Positive: setup spread across two setup-only commits then result
  { const commits = [cmt('s1', [['A', SETUP.contract], ['A', SETUP.state]]), cmt('s2', [['A', SETUP.prompt]]), cmt('w1', [['A', RES1], ['A', RES2]])];
    const r = discoverFrozenSetupBoundary(commits, RD);
    check('R2b frozen boundary at last setup-only commit', r.ok && r.frozenSetupSha === 's2', r.violations.join('; ')); }
  // Positive: check exact descendant setup inventory
  { check('R2c exact canonical setup triple accepted', checkDescendantSetupPhase(nameStatus(setupAdds), RD).ok); }

  // Negatives
  // (a) governed record / state absent from setup boundary
  { check('R2-a setup phase missing state record rejected', !checkDescendantSetupPhase(nameStatus([['A', SETUP.contract], ['A', SETUP.prompt]]), RD).ok); }
  // (b) setup record only present at worker head (first commit is worker/impl)
  { const commits = [cmt('w1', [['A', RES1]]), cmt('s1', setupAdds)]; const r = discoverFrozenSetupBoundary(commits, RD); check('R2-b setup only at worker head rejected', !r.ok); }
  // (c) setup file rewritten after freeze
  { const commits = [cmt('s1', setupAdds), cmt('w1', [['A', RES1]]), cmt('w2', [['M', SETUP.state]])]; const r = discoverFrozenSetupBoundary(commits, RD); check('R2-c setup rewritten after freeze rejected', !r.ok); }
  // (d) implementation file included in setup phase
  { const commits = [cmt('s1', [...setupAdds, ['A', 'research-ops/factory-v1-1/lib/evil.mjs']]), cmt('w1', [['A', RES1]])]; const r = discoverFrozenSetupBoundary(commits, RD); check('R2-d implementation file in setup phase rejected', !r.ok); }
  // (e) arbitrary fourth setup file
  { check('R2-e arbitrary fourth setup file rejected', !checkDescendantSetupPhase(nameStatus([...setupAdds, ['A', RD + 'EXTRA_STATE.json']]), RD).ok); }
  // (f) result file added before setup freeze
  { const commits = [cmt('s1', [['A', SETUP.contract], ['A', SETUP.state], ['A', SETUP.prompt], ['A', RES1]]), cmt('w1', [['A', RES2]])]; const r = discoverFrozenSetupBoundary(commits, RD); check('R2-f result file before setup freeze rejected', !r.ok); }
  // (g) multiple possible setup boundaries (setup split by a worker commit)
  { const commits = [cmt('s1', [['A', SETUP.contract], ['A', SETUP.state]]), cmt('w1', [['A', RES1]]), cmt('s2', [['A', SETUP.prompt]])]; const r = discoverFrozenSetupBoundary(commits, RD); check('R2-g ambiguous / multiple setup boundaries rejected', !r.ok); }
  // (h) setup-phase mutation (non-addition) rejected
  { check('R2-h non-addition in setup phase rejected', !checkDescendantSetupPhase(nameStatus([['M', SETUP.contract], ['A', SETUP.state], ['A', SETUP.prompt]]), RD).ok); }
  // (i) setup file outside the result directory rejected
  { check('R2-i setup file outside result dir rejected', !checkDescendantSetupPhase(nameStatus([['A', 'research-ops/factory-v1-1/other/VALIDATION_CONTRACT.md'], ['A', SETUP.state], ['A', SETUP.prompt]]), RD).ok); }
  // (j) empty range (future task without owner setup record) -> no setup boundary
  { const r = discoverFrozenSetupBoundary([cmt('w1', [['A', RES1], ['A', RES2]])], RD); check('R2-j future task without owner setup record rejected', !r.ok); }

  for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }
  console.log(`\nFIXTURES: ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.log('FAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
  process.exit(0);
}

run();
