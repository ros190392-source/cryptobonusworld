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
import { canTransition, isValidTaskId } from '../lib/model.mjs';
import { validateOwnerReceipt, enforceAuthFloor } from '../lib/authz.mjs';
import { buildManifest } from '../lib/manifest.mjs';
import { checkChangedFileBoundary, parseNameStatus } from '../lib/boundary.mjs';
import { writeCanonical, writeJson } from '../lib/util.mjs';

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
function setState(taskDir, state, extra = {}) {
  const p = join(taskDir, 'TASK_STATE.json'); const o = JSON.parse(readFileSync(p, 'utf8'));
  o.state = state; Object.assign(o, extra); writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}
const nameStatus = (rows) => parseNameStatus(rows.map(([s, p]) => `${s}\t${p}`).join('\n'));

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
    writeJson(join(t, '70-validation', 'VALIDATION.json'), { outcome: 'VALIDATED_FOR_OWNER_MERGE_REVIEW' });
    check('C2d valid pkg + VALIDATED with 70-validation artifact consistent', validateTask(t, {}).ok); }

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
  { const r = checkChangedFileBoundary(nameStatus([['M', 'research-ops/factory-v1-1/lib/util.mjs'], ['M', '.github/workflows/cbw-researchops-factory-validate.yml']])); check('C5h factory-governance boundary ok', r.ok && r.mode === 'FACTORY_GOVERNANCE'); }
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

  for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }
  console.log(`\nFIXTURES: ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.log('FAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
  process.exit(0);
}

run();
