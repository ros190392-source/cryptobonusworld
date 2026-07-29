#!/usr/bin/env node
// ResearchOps Factory V1.1 — deterministic fixture suite (Correction 010).
// Node built-ins only. Uses OS temp directories via the library-only `testRoot`
// option; never writes into tracked research-ops/tasks/.
//   node research-ops/factory-v1-1/fixtures/run.mjs

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTask } from '../lib/create.mjs';
import { validateTask } from '../lib/validate.mjs';
import { statusTask } from '../lib/status.mjs';
import { canTransition, isValidTaskId, validateIdentityValues, canonicalSkeletonFiles, RESEARCH_FILES } from '../lib/model.mjs';
import { resolveMutationChain, scopeSegmentDiff, gitAccessors } from '../lib/taskhistory.mjs';
import { materializeAndValidate, checkIdentityProjection, validateHistoricalChain, stateRequiresPackage } from '../lib/taskhistoryvalidate.mjs';
import { execFileSync } from 'node:child_process';
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

  // ================= Correction 021 — research-task CI routing =================
  // The published workflow must route a canonical research/** task PR through a
  // RESEARCH_TASK path (protected-base check-boundary over the exact base->head diff, NO
  // owner setup-boundary discovery) and fail closed on every escape. These assert the
  // exact CLI-level invariants the workflow routing relies on, plus governance/bootstrap
  // non-regression.
  const RT_ROOT = 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
  const RT_META = { headBranch: 'research/kz-binance-kz-p0-d', baseBranch: 'main' };
  const rtSkeleton = canonicalSkeletonFiles().map((f) => ['A', `${RT_ROOT}/${f}`]);
  // (1) canonical research branch selects the research-task mode
  { check('021-1 canonical research/** on main -> RESEARCH_TASK', trustedModeFromMeta(RT_META) === 'RESEARCH_TASK'); }
  // (2) the EXACT pilot PR #69 skeleton diff is accepted as RESEARCH_TASK with the task root emitted
  { const r = checkChangedFileBoundary(nameStatus(rtSkeleton), RT_META);
    check('021-2 exact pilot skeleton diff -> RESEARCH_TASK BOUNDARY OK', r.ok && r.mode === 'RESEARCH_TASK' && r.taskRoots.length === 1 && r.taskRoots[0] === RT_ROOT, r.violations.join('; ')); }
  // (3) research routing needs no owner setup directory (a pure task diff passes)
  { const r = checkChangedFileBoundary(nameStatus([['A', `${RT_ROOT}/20-research-output/research-run.json`]]), RT_META);
    check('021-3 research routing independent of setup-boundary discovery', r.ok && r.mode === 'RESEARCH_TASK', r.violations.join('; ')); }
  // (4) a research branch modifying the factory workflow fails closed
  { const r = checkChangedFileBoundary(nameStatus([['A', `${RT_ROOT}/TASK_STATE.json`], ['M', '.github/workflows/cbw-researchops-factory-validate.yml']]), RT_META);
    check('021-4 research branch touching factory workflow rejected', !r.ok); }
  // (5) a research branch mixing factory-governance + task files fails closed
  { const r = checkChangedFileBoundary(nameStatus([['A', `${RT_ROOT}/TASK_STATE.json`], ['M', 'research-ops/factory-v1-1/lib/boundary.mjs']]), RT_META);
    check('021-5 research branch mixing factory + task files rejected', !r.ok); }
  // (6) a research branch changing only a factory file (mode confusion) fails closed
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/util.mjs']]), RT_META);
    check('021-6 research branch changing only a factory file rejected', !r.ok); }
  // (7) spoof / noncanonical research branch identities are not trusted as research-task
  { check('021-7 uppercase research branch not RESEARCH_TASK', trustedModeFromMeta({ headBranch: 'research/Evil', baseBranch: 'main' }) === null);
    check('021-7b nested research branch not RESEARCH_TASK', trustedModeFromMeta({ headBranch: 'research/a/b', baseBranch: 'main' }) === null);
    check('021-7c research branch on non-main base not RESEARCH_TASK', trustedModeFromMeta({ headBranch: 'research/kz-binance-kz-p0-d', baseBranch: 'develop' }) === null); }
  // (8) research head must bind to the task's declared branch identity
  { const root = 'research-ops/tasks/CBW-A-001'; const okr = checkChangedFileBoundary(nameStatus([['A', `${root}/20-research-output/research-run.json`]]), RES(root));
    const badr = checkChangedFileBoundary(nameStatus([['A', `${root}/20-research-output/research-run.json`]]), RES(root, { headBranch: 'research/spoof-x' }));
    check('021-8 matching research identity accepted', okr.ok, okr.violations.join('; '));
    check('021-8b spoof research head != declared branch rejected', !badr.ok); }
  // (9) factory-governance branches still require a unique frozen setup boundary (non-regression)
  { const commits = [cmt('s1', setupAdds), cmt('w1', [['A', RES1], ['A', RES2]])]; const r = discoverFrozenSetupBoundary(commits, RD);
    check('021-9 governance descendant still needs unique frozen setup', r.ok && r.frozenSetupSha === 's1', r.violations.join('; '));
    check('021-9b governance with no setup boundary still rejected', !discoverFrozenSetupBoundary([cmt('w1', [['A', RES1]])], RD).ok); }
  // (10) the pinned one-time V4 bootstrap anchor behavior is unchanged (non-regression)
  { check('021-10 exact V4 anchor -> BOOTSTRAP', resolveEnforcement(anchorCtx()).mode === 'BOOTSTRAP');
    check('021-10b anchor mismatch -> REJECT', resolveEnforcement(anchorCtx({ issue: 999 })).mode === 'REJECT');
    check('021-10c base carries V4 -> DESCENDANT preserved', resolveEnforcement(anchorCtx({ baseHasV4Policy: true })).mode === 'DESCENDANT'); }

  // ================= Correction 022 — Git-empty PREPARED output-dir validation =================
  // On a fresh checkout git cannot restore an empty 20-research-output/ directory. A PREPARED
  // task with stages[20-research-output]=EMPTY and no package evidence must validate; every
  // other condition must fail closed. The exception is STATE- and EVIDENCE-bound, never merely
  // path-bound.
  const dropOut = (t) => { rmSync(join(t, '20-research-output'), { recursive: true, force: true }); return t; };
  const editState = (t, fn) => { const p = join(t, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p, 'utf8')); fn(o); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); return t; };
  // (1) canonical PREPARED fresh-checkout tree with only the output dir absent -> valid
  { const t = dropOut(mk()); const v = validateTask(t, {}); check('022-1 PREPARED git-empty output dir absent -> valid', v.ok, v.checks.filter((c) => !c.ok).map((c) => `${c.name}:${c.detail}`).join(' | ')); }
  // (2) same tree with --require-package -> invalid
  { const t = dropOut(mk()); check('022-2 git-empty output + --require-package fails', !validateTask(t, { requirePackage: true }).ok); }
  // (3) RESEARCH_CAPTURED with output dir absent -> invalid
  { const t = mk(); setState(t, 'RESEARCH_CAPTURED'); dropOut(t); check('022-3 RESEARCH_CAPTURED missing output dir fails', !validateTask(t, {}).ok); }
  // (4) a later lifecycle state with output dir absent -> invalid
  { const t = mk(); setState(t, 'VALIDATED'); dropOut(t); check('022-4 later state missing output dir fails', !validateTask(t, {}).ok); }
  // (5) PREPARED but the output stage marker is not exactly EMPTY -> invalid
  { const t = editState(dropOut(mk()), (o) => { o.stages['20-research-output'] = 'PRESENT'; }); check('022-5 PREPARED wrong output stage marker fails', !validateTask(t, {}).ok); }
  // (6) missing TASK_STATE with output dir absent -> invalid
  { const t = dropOut(mk()); rmSync(join(t, 'TASK_STATE.json')); check('022-6 missing TASK_STATE + absent output fails', !validateTask(t, {}).ok); }
  // (7) malformed TASK_STATE with output dir absent -> invalid
  { const t = dropOut(mk()); writeFileSync(join(t, 'TASK_STATE.json'), '{ not json'); check('022-7 malformed TASK_STATE + absent output fails', !validateTask(t, {}).ok); }
  // (8) structurally invalid TASK_STATE (missing required key) with output dir absent -> invalid
  { const t = editState(dropOut(mk()), (o) => { delete o.authorizations; }); check('022-8 structurally invalid TASK_STATE + absent output fails', !validateTask(t, {}).ok); }
  // (9) another stage directory also missing -> invalid
  { const t = dropOut(mk()); rmSync(join(t, '10-input'), { recursive: true, force: true }); check('022-9 another missing stage dir fails', !validateTask(t, {}).ok); }
  // (10) partial research-package evidence present -> invalid
  { const t = mk(); dropOut(t); mkdirSync(join(t, '20-research-output')); writeFileSync(join(t, '20-research-output', 'research-run.json'), '{"schemaVersion":"1.0"}'); check('022-10 partial package evidence fails', !validateTask(t, {}).ok); }
  // (11) complete exact eleven-file package remains valid
  { const t = mk(); writePkg(t); check('022-11 complete 11-file package still valid', validateTask(t, {}).ok); }
  // (12) canonical create output (output dir present) remains valid
  { const t = mk(); check('022-12 canonical create output still valid', validateTask(t, {}).ok); }
  // (13) exception is state-bound: a noncanonical state string with output dir absent -> invalid
  { const t = editState(dropOut(mk()), (o) => { o.state = 'NOT_A_STATE'; }); check('022-13 noncanonical state + absent output fails', !validateTask(t, {}).ok); }

  // ===================================================================================
  // R030 — research-task stage-base CI correction: trusted task mutation-chain (Layer B).
  // Pure topology on synthetic deterministic graphs + boundary integration. Never trusts
  // commit messages, HEAD^, comments or environment SHAs — only first-parent topology and
  // task-root tree identity.
  // ===================================================================================
  {
    // R031-B — typed accessors: commitParents / treeOid distinguish VALUE / ABSENCE / ERROR.
    const G = (nodes) => ({
      commitParents: (s) => (nodes[s] ? { ok: true, parents: nodes[s].parents } : { ok: false, error: `missing ${s}` }),
      treeOid: (s) => { const n = nodes[s]; if (!n) return { ok: false, error: `missing ${s}` }; return n.tree === null ? { ok: true, present: false } : { ok: true, present: true, oid: n.tree }; },
    });
    { const g = { C0: { parents: [], tree: null }, C1: { parents: ['C0'], tree: 'T1' } };
      const r = resolveMutationChain({ headSha: 'C1', ...G(g) });
      check('030-1 initial creation resolves single ABSENT->intro segment', r.ok && r.segments.length === 1 && r.segments[0].introduction && r.segments[0].baseSha === 'C0', (r.violations || []).join('; ')); }
    const cap = { C0: { parents: [], tree: null }, C1: { parents: ['C0'], tree: 'T1' }, C2: { parents: ['C1'], tree: 'T2' } };
    { const r = resolveMutationChain({ headSha: 'C2', ...G(cap) });
      check('030-2 capture resolves intro + capture (base=C1,head=C2)', r.ok && r.segments.length === 2 && !r.segments[1].introduction && r.segments[1].baseSha === 'C1' && r.segments[1].headSha === 'C2', (r.violations || []).join('; ')); }
    { const g = { ...cap, M: { parents: [], tree: null }, C3: { parents: ['C2', 'M'], tree: 'T2' } };
      const r = resolveMutationChain({ headSha: 'C3', ...G(g) });
      check('030-3 unchanged main-sync merge creates no segment', r.ok && r.segments.length === 2 && r.segments[1].headSha === 'C2'); }
    { const g = { ...cap, M: { parents: [], tree: null }, C4: { parents: ['C2', 'M'], tree: 'T9' } };
      const r = resolveMutationChain({ headSha: 'C4', ...G(g) });
      check('030-4 root-changing merge fails closed', !r.ok && r.violations.some((v) => /merge/.test(v))); }
    { const g = { ...cap, C5: { parents: ['C2'], tree: 'T2' } };
      const r = resolveMutationChain({ headSha: 'C5', ...G(g) });
      check('030-5 arbitrary HEAD^ not trusted (base resolves to real predecessor C1)', r.ok && r.segments[r.segments.length - 1].baseSha === 'C1'); }
    { const g = { C0: { parents: [], tree: null }, C1: { parents: ['C0'], tree: 'T1' }, C2: { parents: ['C1'], tree: null }, C3: { parents: ['C2'], tree: 'T3' } };
      const r = resolveMutationChain({ headSha: 'C3', ...G(g) });
      check('030-6 task-root re-introduction / parallel history fails closed', !r.ok); }
    { const r = resolveMutationChain({ headSha: 'C0', ...G({ C0: { parents: [], tree: null } }) });
      check('030-7 root absent at head fails closed', !r.ok); }
    { const g = { C0: { parents: [], tree: null }, C1: { parents: ['C0'], tree: 'T1' }, U1: { parents: ['C1'], tree: 'T1' }, U2: { parents: ['U1'], tree: 'T1' }, C2: { parents: ['U2'], tree: 'T2' } };
      const r = resolveMutationChain({ headSha: 'C2', ...G(g) });
      check('030-8 unrelated commits between segments are skipped', r.ok && r.segments.length === 2 && r.segments[0].introduction && r.segments[1].baseSha === 'U2', (r.violations || []).join('; ')); }
  }
  {
    const ROOT = 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
    const RID = 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
    const HB = 'research/kz-binance-kz-p0-d';
    const skel = canonicalSkeletonFiles();
    const introRecs = skel.map((f) => ({ status: 'A', rel: f }));
    const capRecs = () => [...RESEARCH_FILES.map((f) => ({ status: 'A', rel: `20-research-output/${f}` })), { status: 'M', rel: 'TASK_STATE.json' }];
    const cumulative = () => nameStatus([...skel.map((f) => ['A', `${ROOT}/${f}`]), ...RESEARCH_FILES.map((f) => ['A', `${ROOT}/20-research-output/${f}`])]);
    const seg = (o) => Object.assign({ baseSha: 'b', headSha: 'h', introduction: false, baseState: 'PREPARED', headState: 'RESEARCH_CAPTURED', baseHistory: [{ state: 'PREPARED' }], headHistory: [{ state: 'PREPARED' }, { state: 'RESEARCH_CAPTURED' }], records: capRecs() }, o);
    const introSeg = (o) => Object.assign({ baseSha: null, headSha: 'i', introduction: true, baseState: null, headState: 'PREPARED', baseHistory: null, headHistory: [{ state: 'PREPARED' }], records: introRecs }, o);
    const chainMeta = (segments, over = {}, headState = 'RESEARCH_CAPTURED') => ({ headBranch: HB, baseBranch: 'main', taskStates: { [ROOT]: Object.assign({ base: null, head: headState, existsAtBase: false, headBranch: HB, headTaskId: RID, mutationChain: { ok: true, segments, headTreeMatchesFinal: true } }, over) } });
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg()])); check('030-9 progressed capture chain passes boundary', r.ok, r.violations.join('; ')); }
    { const r = checkChangedFileBoundary(nameStatus(skel.map((f) => ['A', `${ROOT}/${f}`])), chainMeta([introSeg()], {}, 'PREPARED')); check('030-10 initial PREPARED creation chain passes', r.ok, r.violations.join('; ')); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg({ headState: 'VALIDATED' })], {}, 'VALIDATED')); check('030-11 skipped state fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg({ baseHistory: [{ state: 'PREPARED' }], headHistory: [{ state: 'REWRITTEN' }, { state: 'RESEARCH_CAPTURED' }] })])); check('030-12 rewritten history fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg({ baseHistory: [{ state: 'PREPARED' }, { state: 'X' }], headHistory: [{ state: 'PREPARED' }] })])); check('030-13 truncated history fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg({ records: [...capRecs(), { status: 'M', rel: '00-contract/IDENTITY.json' }] })])); check('030-14 earlier-stage mutation fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg({ records: [...capRecs(), { status: 'A', rel: '20-research-output/EXTRA.json' }] })])); check('030-15 extra twelfth output file fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg({ headState: 'RESEARCH_CAPTURED' }), seg()])); check('030-16 introduction not at PREPARED fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg({ records: introRecs.slice(1) }), seg()])); check('030-17 incomplete skeleton at creation fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg()], { mutationChain: { ok: true, segments: [introSeg(), seg()], headTreeMatchesFinal: false } })); check('030-18 head tree mismatch fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([], { mutationChain: { ok: false, segments: [], violations: ['root-changing merge commit X: fail closed'], headTreeMatchesFinal: false } })); check('030-19 unresolved chain fails closed', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg()], { headBranch: 'research/zz-wrong-b' })); check('030-20 branch mismatch fails', !r.ok); }
    { const r = checkChangedFileBoundary(cumulative(), chainMeta([introSeg(), seg()], { headTaskId: 'CBW-OTHER-999' })); check('030-21 task id/root mismatch fails', !r.ok); }
    { const recs = nameStatus([...skel.map((f) => ['A', `${ROOT}/${f}`]), ['A', 'research-ops/tasks/CBW-OTHER-002/TASK_STATE.json']]); const r = checkChangedFileBoundary(recs, chainMeta([introSeg(), seg()])); check('030-22 two task roots fail', !r.ok); }
    { const recs = nameStatus([...skel.map((f) => ['A', `${ROOT}/${f}`]), ['M', 'research-ops/factory-v1-1/lib/util.mjs']]); const r = checkChangedFileBoundary(recs, chainMeta([introSeg(), seg()])); check('030-23 mixed research/factory paths fail', !r.ok); }
    { const t = mk(); writePkg(t); rmSync(join(t, '20-research-output', 'payment-rails.json'), { force: true }); check('030-24 missing output file fails validation', !validateTask(t, {}).ok); }
    { check('030-25 authorization floor unchanged (forbidden true rejected, all-false ok)', !enforceAuthFloor({ authorizations: { deployAuthorized: true } }, {}).ok && enforceAuthFloor({ authorizations: { deployAuthorized: false } }, {}).ok); }
  }

  // ===================================================================================
  // R031 — owner-audit remediation: explicit segment-diff result (A), typed Git access
  // (B), full canonical historical validation of every mutation head + immutable identity
  // projection (C). Pure synthetic coverage + one real temporary-Git integration fixture.
  // ===================================================================================
  {
    const ROOT = 'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
    // ---- Remediation A: explicit segment-diff result ----
    { const r = scopeSegmentDiff({ ok: false }, ROOT, parseNameStatusZ); check('031-A1 segment diff command failure blocks (DIFF_FAILED)', !r.ok && r.errorCode === 'DIFF_FAILED'); }
    { const r = scopeSegmentDiff({ ok: true, out: 'X somepath ' }, ROOT, parseNameStatusZ); check('031-A2 malformed segment diff blocks (MALFORMED_DIFF)', !r.ok && r.errorCode === 'MALFORMED_DIFF'); }
    { const r = scopeSegmentDiff({ ok: true, out: '' }, ROOT, parseNameStatusZ); check('031-A3 empty successful diff is ok and distinguishable', r.ok && Array.isArray(r.records) && r.records.length === 0); }
    { const r = scopeSegmentDiff({ ok: true, out: `A ${ROOT}/TASK_STATE.json ` }, ROOT, parseNameStatusZ); check('031-A4 valid diff scopes root-relative records', r.ok && r.records.length === 1 && r.records[0].rel === 'TASK_STATE.json'); }

    // ---- Remediation B: typed Git access (VALUE / ABSENCE / ACCESS_ERROR) ----
    const nodes = { C0: { parents: [], tree: null }, C1: { parents: ['C0'], tree: 'T1' }, C2: { parents: ['C1'], tree: 'T2' } };
    const good = () => ({
      commitParents: (s) => (nodes[s] ? { ok: true, parents: nodes[s].parents } : { ok: false, error: 'x' }),
      treeOid: (s) => { const n = nodes[s]; if (!n) return { ok: false, error: 'x' }; return n.tree === null ? { ok: true, present: false } : { ok: true, present: true, oid: n.tree }; },
    });
    { const acc = good(); acc.commitParents = (s) => (s === 'C1' ? { ok: false, error: 'boom' } : good().commitParents(s)); const r = resolveMutationChain({ headSha: 'C2', ...acc }); check('031-B1 first-parent access error fails closed', !r.ok && r.violations.some((v) => /access error reading parents/.test(v))); }
    { const acc = good(); acc.treeOid = (s) => (s === 'C1' ? { ok: false, error: 'boom' } : good().treeOid(s)); const r = resolveMutationChain({ headSha: 'C2', ...acc }); check('031-B2 tree lookup access error fails closed', !r.ok && r.violations.some((v) => /access error reading task-root tree/.test(v))); }
    { const acc = good(); acc.commitParents = () => ({ ok: true, parents: 'notarray' }); const r = resolveMutationChain({ headSha: 'C2', ...acc }); check('031-B3 malformed parent list fails closed', !r.ok && r.violations.some((v) => /malformed parent list/.test(v))); }
    { const acc = good(); acc.commitParents = (s) => (s === 'C2' ? { ok: false } : good().commitParents(s)); const r = resolveMutationChain({ headSha: 'C2', ...acc }); check('031-B4 parent-count access error fails closed', !r.ok); }
    { const acc = gitAccessors(() => ({ ok: false, out: '' }), ROOT); check('031-B5 gitAccessors runner failure -> access error', acc.commitParents('x').ok === false && acc.treeOid('x').ok === false); }
    { const acc = gitAccessors(() => ({ ok: true, out: '' }), ROOT); const t = acc.treeOid('x'); check('031-B6 gitAccessors empty ls-tree -> legitimate absence', t.ok === true && t.present === false); }
    { const acc = gitAccessors(() => ({ ok: true, out: `040000 tree ${'a'.repeat(40)}\t${ROOT}\n` }), ROOT); const t = acc.treeOid('x'); check('031-B7 gitAccessors tree line -> present oid', t.ok && t.present && t.oid === 'a'.repeat(40)); }
    { const acc = gitAccessors(() => ({ ok: true, out: `100644 blob ${'a'.repeat(40)}\tfoo\n` }), ROOT); check('031-B8 gitAccessors non-tree at root -> access error', acc.treeOid('x').ok === false); }
    { const acc = gitAccessors(() => ({ ok: true, out: 'deadbeef p1 p2\n' }), ROOT); const p = acc.commitParents('x'); check('031-B9 gitAccessors parents parsed (count=2)', p.ok && p.parents.length === 2); }

    // ---- Remediation C: historical validation + identity projection (injected deps) ----
    const goodState = { schemaVersion: '1.0.0', factoryVersion: '1.1', taskId: 'CBW-A-001', project: 'CryptoBonusWorld', countryCode: 'KZ', exchangeId: 'binance', batchId: 'KZ-P0-D', priority: 'P0', createdAt: '2026-07-28', branch: 'research/kz-binance-kz-p0-d', requiredResearchInventory: ['research-run.json'] };
    const okReport = { ok: true, total: 30, passed: 30, failed: 0, checks: [] };
    const failReport = (name) => ({ ok: false, total: 30, passed: 29, failed: 1, checks: [{ name, ok: false }] });
    const baseDeps = (over = {}) => Object.assign({ mkdtemp: () => '/tmp/mat', worktreeAdd: () => {}, worktreeRemove: () => {}, pathJoin: (a, b) => `${a}/${b}`, existsFn: () => true, readStateFn: () => 'RESEARCH_CAPTURED', validateTaskFn: () => okReport }, over);
    for (const fld of ['taskId', 'branch', 'countryCode', 'exchangeId', 'batchId', 'priority', 'project', 'createdAt', 'schemaVersion', 'requiredResearchInventory']) {
      const head = { ...goodState, [fld]: fld === 'requiredResearchInventory' ? ['x'] : 'MUTATED' };
      const r = checkIdentityProjection(goodState, head, 'shaX');
      check(`031-C-id ${fld} transient mutation blocked`, !r.ok && r.violations.some((v) => v.includes(fld)));
    }
    { const r = checkIdentityProjection(goodState, { ...goodState }, 'shaX'); check('031-C-id0 identical identity projection ok', r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps() }); check('031-C1 valid historical head ok', r.ok && r.violations.length === 0); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('authorization floor holds (all false unless valid owner receipt)') }) }); check('031-C2 transient authorization violation caught before final head', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('required package present (--require-package)') }) }); check('031-C3 RESEARCH_CAPTURED with missing files caught', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('MANIFEST byte sizes and SHA-256 match (canonical LF)') }) }); check('031-C4 historical manifest/hash mismatch caught', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('IDENTITY.json shape and taskId/identity consistency (C9)') }) }); check('031-C5 invalid historical IDENTITY binding caught', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('GITHUB_PLAN.json shape (draft/base/autoMerge/mergeAuthorized) (C9)') }) }); check('031-C6 invalid historical GITHUB_PLAN binding caught', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('TASK_STATE.json structural shape (C9)') }) }); check('031-C7 malformed historical TASK_STATE caught', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ worktreeAdd: () => { throw new Error('add failed'); } }) }); check('031-C8 temporary materialization failure blocks', !r.ok && r.violations.some((v) => /materialization/.test(v))); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => { throw new Error('boom'); } }) }); check('031-C9 historical validator exception blocks', !r.ok && r.violations.some((v) => /threw/.test(v))); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ readStateFn: () => { throw new Error('bad'); } }) }); check('031-C10 unreadable historical TASK_STATE blocks', !r.ok && r.violations.some((v) => /unreadable/.test(v))); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ existsFn: () => false }) }); check('031-C11 missing historical task root blocks', !r.ok); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ worktreeRemove: () => { throw new Error('locked'); } }) }); check('031-C12 cleanup failure recorded and blocks', !r.ok && !!r.cleanupError); }
    { const r = materializeAndValidate({ sha: 's', taskRoot: ROOT, deps: baseDeps({ validateTaskFn: () => failReport('C2'), worktreeRemove: () => { throw new Error('locked'); } }) }); check('031-C13 cleanup failure never turns a failed validation into success', !r.ok && !!r.cleanupError); }
    { check('031-C14 stateRequiresPackage: PREPARED/BLOCKED no, RESEARCH_CAPTURED yes', !stateRequiresPackage('PREPARED') && !stateRequiresPackage('BLOCKED') && stateRequiresPackage('RESEARCH_CAPTURED')); }
    { const heads = [{ sha: 'i', introduction: true, fullState: goodState }, { sha: 'a', introduction: false, fullState: goodState }, { sha: 'b', introduction: false, fullState: goodState }];
      let call = 0; const deps = baseDeps(); deps.validateTaskFn = () => { call += 1; return call === 2 ? failReport('required package present (--require-package)') : okReport; };
      const r = validateHistoricalChain({ heads, taskRoot: ROOT, deps });
      check('031-C15 same-state repair: incomplete intermediate head blocks whole chain', !r.ok && r.violations.length > 0); }
    { const heads = [{ sha: 'i', introduction: true, fullState: goodState }, { sha: 'm', introduction: false, fullState: { ...goodState, countryCode: 'RU' } }];
      const r = validateHistoricalChain({ heads, taskRoot: ROOT, deps: baseDeps() });
      check('031-C16 transient identity mutation blocked by historical chain', !r.ok && r.violations.some((v) => /countryCode/.test(v))); }

    // ---- Real temporary Git repository integration: historical validation across commits ----
    { let ok = false; let detail = '';
      const tmp = mkdtempSync(join(tmpdir(), 'rops-gitint-')); roots.push(tmp);
      try {
        const g = (args) => execFileSync('git', args, { cwd: tmp, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
        g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't']); g(['config', 'commit.gpgsign', 'false']); g(['config', 'core.autocrlf', 'false']);
        const created = createTask({ ...BASE, testRoot: tmp });
        const taskRootRel = created.taskDir.slice(tmp.length + 1).replace(/\\/g, '/');
        g(['add', '-A']); g(['commit', '-q', '-m', 'prepared']);
        const prepSha = g(['rev-parse', 'HEAD']).trim();
        writePkg(created.taskDir);
        const st = JSON.parse(readFileSync(join(created.taskDir, 'TASK_STATE.json')));
        st.state = 'RESEARCH_CAPTURED'; st.stages['20-research-output'] = 'PRESENT'; st.history.push({ state: 'RESEARCH_CAPTURED', at: '2026-07-29' });
        writeFileSync(join(created.taskDir, 'TASK_STATE.json'), `${JSON.stringify(st, null, 2)}\n`);
        g(['add', '-A']); g(['commit', '-q', '-m', 'captured']);
        const capSha = g(['rev-parse', 'HEAD']).trim();
        const deps = {
          mkdtemp: () => mkdtempSync(join(tmpdir(), 'rops-hist-')),
          worktreeAdd: (dir, sha) => execFileSync('git', ['-c', 'core.autocrlf=false', 'worktree', 'add', '--detach', dir, sha], { cwd: tmp, stdio: ['ignore', 'ignore', 'pipe'] }),
          worktreeRemove: (dir) => { execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: tmp, stdio: ['ignore', 'ignore', 'pipe'] }); },
          pathJoin: (a, b) => join(a, b), existsFn: (p) => existsSync(p),
          readStateFn: (taskDir) => JSON.parse(readFileSync(join(taskDir, 'TASK_STATE.json'))).state,
          validateTaskFn: (taskDir, opts) => validateTask(taskDir, opts),
        };
        const rPrep = materializeAndValidate({ sha: prepSha, taskRoot: taskRootRel, deps });
        const rCap = materializeAndValidate({ sha: capSha, taskRoot: taskRootRel, deps });
        ok = rPrep.ok && rCap.ok;
        detail = `prep=${JSON.stringify(rPrep.summary)}/${rPrep.violations.join('|')} cap=${JSON.stringify(rCap.summary)}/${rCap.violations.join('|')}`;
        try { g(['worktree', 'prune']); } catch { /* ignore */ }
      } catch (e) { detail = `exception: ${e.message}`; }
      check('031-INT real git historical validation across PREPARED + RESEARCH_CAPTURED', ok, detail); }
  }

  for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }
  console.log(`\nFIXTURES: ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.log('FAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
  process.exit(0);
}

run();
