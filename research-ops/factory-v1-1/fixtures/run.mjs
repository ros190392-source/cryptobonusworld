#!/usr/bin/env node
// ResearchOps Factory V1.1 — deterministic fixture suite. Node built-ins only.
// Uses OS temp directories; never writes into tracked research-ops/tasks/.
//   node research-ops/factory-v1-1/fixtures/run.mjs

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTask } from '../lib/create.mjs';
import { validateTask, checkAppendOnlyBoundary } from '../lib/validate.mjs';
import { statusTask } from '../lib/status.mjs';
import { canTransition } from '../lib/model.mjs';
import { validateOwnerReceipt } from '../lib/authz.mjs';
import { buildManifest } from '../lib/manifest.mjs';
import { writeCanonical, writeJson, sha256Hex } from '../lib/util.mjs';

let pass = 0; let fail = 0; const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  [PASS] ${name}`); }
  else { fail += 1; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}

function tmp() { return mkdtempSync(join(tmpdir(), 'rops-fx-')); }

const BASE = {
  taskId: 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001',
  countryCode: 'KZ', countryName: 'Kazakhstan',
  exchangeId: 'binance', exchangeName: 'Binance',
  batchId: 'KZ-P0-D', priority: 'P0', createdAt: '2026-07-26',
};

// Build a valid eleven-file research package under <taskDir>/20-research-output.
function writeValidPackage(taskDir) {
  const out = join(taskDir, '20-research-output');
  const sv = { schemaVersion: '1.0', sources: [{ sourceId: 'src-a', url: 'https://x', publisher: 'X', title: 'T', sourceTier: 'A', confidence: 'HIGH', limitations: [] }] };
  const cv = { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', statement: 'S', status: 'SUPPORTED', supportedSourceIds: ['src-a'], contradictedSourceIds: [], confidence: 'HIGH', limitations: [] }] };
  const cf = { schemaVersion: '1.0', conflicts: [{ conflictId: 'cf-a', status: 'RETAINED-CONFLICTING', availabilitySourceIds: ['src-a'], restrictionSourceIds: ['src-a'], outcome: { recommendation: 'CONFLICTING', confidence: 'MEDIUM' } }] };
  const pa = { schemaVersion: '1.0', products: [{ productId: 'prod-spot', status: 'CONFLICTING', confidence: 'LOW', claimIds: ['clm-a'] }] };
  const pr = { schemaVersion: '1.0', rails: [{ railId: 'rail-x', status: 'UNKNOWN', confidence: 'LOW', sourceIds: ['src-a'] }] };
  const oer = { schemaVersion: '1.0', review: { kazakhstanOfferEligibility: 'UNKNOWN', sourceIds: ['src-a'] }, authorizations: { rankingChangeAuthorized: false, ctaChangeAuthorized: false } };
  const snn = { schemaVersion: '1.0', notes: [] };
  const rr = { schemaVersion: '1.0', runId: 'r1', overallFinding: { recommendation: 'CONFLICTING', confidence: 'MEDIUM' }, authorizations: { canonicalImportAuthorized: false, productionChangeAuthorized: false, deployAuthorized: false } };
  const ir = { schemaVersion: '1.0', readiness: { canonicalImportReady: false, productionReady: false, deployReady: false }, opsRecommendation: 'HOLD_CONFLICTING' };
  writeJson(join(out, 'research-run.json'), rr);
  writeJson(join(out, 'source-verification.json'), sv);
  writeJson(join(out, 'claim-verdicts.json'), cv);
  writeJson(join(out, 'conflict-resolution.json'), cf);
  writeJson(join(out, 'product-availability.json'), pa);
  writeJson(join(out, 'payment-rails.json'), pr);
  writeJson(join(out, 'offer-eligibility-review.json'), oer);
  writeJson(join(out, 'schema-normalization-notes.json'), snn);
  writeJson(join(out, 'import-readiness.json'), ir);
  writeCanonical(join(out, 'source-truth-review-report.md'), '# Report\n\nOverall CONFLICTING / MEDIUM.\n');
  const hashed = ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'];
  writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, hashed, { Task: BASE.taskId }));
  return out;
}

function run() {
  const roots = [];
  const newTasksDir = () => { const d = tmp(); roots.push(d); return d; };

  console.log('ResearchOps Factory V1.1 — fixtures');

  // 1. valid freshly created task
  {
    const td = newTasksDir();
    const res = createTask({ ...BASE, tasksDir: td });
    const rep = validateTask(res.taskDir, {});
    check('1 valid freshly created task validates', rep.ok, rep.checks.filter((c) => !c.ok).map((c) => c.name).join(','));
    const st = statusTask(res.taskDir);
    check('1b fresh task status = PREPARED, consistent', st.declaredState === 'PREPARED' && st.consistent, `${st.declaredState}/${st.consistent}`);
  }

  // 2. duplicate task refusal
  {
    const td = newTasksDir();
    createTask({ ...BASE, tasksDir: td });
    let threw = false;
    try { createTask({ ...BASE, tasksDir: td }); } catch { threw = true; }
    check('2 duplicate create is refused', threw);
  }

  // 3. invalid task ID / path traversal
  {
    const td = newTasksDir();
    let threwId = false;
    try { createTask({ ...BASE, taskId: 'bad id/../escape', tasksDir: td }); } catch { threwId = true; }
    check('3 invalid task id / traversal is refused', threwId);
    const b = checkAppendOnlyBoundary(['research-ops/tasks/T/../../src/x.ts'], 'T');
    check('3b boundary rejects traversal path', !b.ok);
  }

  // 4. invalid state transition
  {
    check('4 invalid transition PREPARED->VALIDATED rejected', !canTransition('PREPARED', 'VALIDATED'));
    check('4b valid transition PREPARED->RESEARCH_CAPTURED allowed', canTransition('PREPARED', 'RESEARCH_CAPTURED'));
    const td = newTasksDir();
    const res = createTask({ ...BASE, tasksDir: td });
    const rep = validateTask(res.taskDir, { toState: 'VALIDATED' });
    check('4c validate flags illegal target transition', !rep.ok);
  }

  // valid package baseline for 5-14
  const mkTask = () => { const td = newTasksDir(); const res = createTask({ ...BASE, tasksDir: td }); writeValidPackage(res.taskDir); return res.taskDir; };

  // baseline valid package
  {
    const t = mkTask();
    const rep = validateTask(t, {});
    check('0 valid package validates', rep.ok, rep.checks.filter((c) => !c.ok).map((c) => `${c.name}:${c.detail}`).join(' | '));
  }

  // 5. missing research file
  {
    const t = mkTask();
    rmSync(join(t, '20-research-output', 'payment-rails.json'));
    const rep = validateTask(t, {});
    check('5 missing research file fails', !rep.ok);
  }

  // 6. extra research file
  {
    const t = mkTask();
    writeCanonical(join(t, '20-research-output', 'extra.json'), '{}\n');
    const rep = validateTask(t, {});
    const inv = rep.checks.find((c) => c.name.startsWith('inventory'));
    check('6 extra research file fails inventory', !rep.ok && inv && !inv.ok);
  }

  // 7. malformed JSON
  {
    const t = mkTask();
    writeFileSync(join(t, '20-research-output', 'claim-verdicts.json'), '{ not json');
    const rep = validateTask(t, {});
    check('7 malformed JSON fails', !rep.ok);
  }

  // 8. manifest byte mismatch
  {
    const t = mkTask();
    // append a byte to a hashed file without updating MANIFEST -> size+hash mismatch
    const p = join(t, '20-research-output', 'schema-normalization-notes.json');
    writeFileSync(p, readFileSync(p, 'utf8') + '\n');
    const rep = validateTask(t, {});
    const man = rep.checks.find((c) => c.name.startsWith('MANIFEST'));
    check('8 manifest byte mismatch fails', !rep.ok && man && !man.ok);
  }

  // 9. manifest hash mismatch (same byte length, different content)
  {
    const t = mkTask();
    const p = join(t, '20-research-output', 'source-truth-review-report.md');
    const cur = readFileSync(p, 'utf8');
    const swapped = cur.replace('CONFLICTING', 'CONFLICTINX'); // same length
    check('9pre same length', swapped.length === cur.length);
    writeFileSync(p, swapped);
    const rep = validateTask(t, {});
    const man = rep.checks.find((c) => c.name.startsWith('MANIFEST'));
    check('9 manifest hash mismatch fails', !rep.ok && man && !man.ok);
  }

  // 10. duplicate IDs
  {
    const t = mkTask();
    const out = join(t, '20-research-output');
    const sv = JSON.parse(readFileSync(join(out, 'source-verification.json'), 'utf8'));
    sv.sources.push({ ...sv.sources[0] }); // duplicate sourceId
    writeJson(join(out, 'source-verification.json'), sv);
    writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'], {}));
    const rep = validateTask(t, {});
    const idc = rep.checks.find((c) => c.name === 'unique source IDs');
    check('10 duplicate source IDs fails', !rep.ok && idc && !idc.ok);
  }

  // 11. dangling source reference
  {
    const t = mkTask();
    const out = join(t, '20-research-output');
    const cv = JSON.parse(readFileSync(join(out, 'claim-verdicts.json'), 'utf8'));
    cv.claims[0].supportedSourceIds = ['src-does-not-exist'];
    writeJson(join(out, 'claim-verdicts.json'), cv);
    writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'], {}));
    const rep = validateTask(t, {});
    const x = rep.checks.find((c) => c.name.startsWith('all source and claim cross-references'));
    check('11 dangling source reference fails', !rep.ok && x && !x.ok);
  }

  // 12. dangling claim reference
  {
    const t = mkTask();
    const out = join(t, '20-research-output');
    const pa = JSON.parse(readFileSync(join(out, 'product-availability.json'), 'utf8'));
    pa.products[0].claimIds = ['clm-nope'];
    writeJson(join(out, 'product-availability.json'), pa);
    writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'], {}));
    const rep = validateTask(t, {});
    const x = rep.checks.find((c) => c.name.startsWith('all source and claim cross-references'));
    check('12 dangling claim reference fails', !rep.ok && x && !x.ok);
  }

  // 13. forbidden authorization true
  {
    const t = mkTask();
    const out = join(t, '20-research-output');
    const rr = JSON.parse(readFileSync(join(out, 'research-run.json'), 'utf8'));
    rr.authorizations.deployAuthorized = true;
    writeJson(join(out, 'research-run.json'), rr);
    writeCanonical(join(out, 'MANIFEST.txt'), buildManifest(out, ['research-run.json', 'source-verification.json', 'claim-verdicts.json', 'conflict-resolution.json', 'product-availability.json', 'payment-rails.json', 'offer-eligibility-review.json', 'schema-normalization-notes.json', 'import-readiness.json', 'source-truth-review-report.md'], {}));
    const rep = validateTask(t, {});
    const a = rep.checks.find((c) => c.name.startsWith('authorization floor'));
    check('13 forbidden authorization true fails', !rep.ok && a && !a.ok);
  }

  // 14. mutation of an immutable stage (research file changed, manifest not updated)
  {
    const t = mkTask();
    const p = join(t, '20-research-output', 'product-availability.json');
    const pa = JSON.parse(readFileSync(p, 'utf8'));
    pa.products[0].status = 'AVAILABLE_WITH_LIMITS'; // silent mutation
    writeJson(p, pa);
    const rep = validateTask(t, {});
    const man = rep.checks.find((c) => c.name.startsWith('MANIFEST'));
    check('14 immutable-stage mutation detected via manifest', !rep.ok && man && !man.ok);
  }

  // 15. valid owner research-record merge receipt
  {
    const receipt = { authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: BASE.taskId, targetBranch: 'main', authorizations: { researchRecordMergeToMainAuthorized: true } };
    const v = validateOwnerReceipt(receipt, BASE.taskId);
    check('15 valid owner receipt accepted', v.ok && v.mergeAuthorized, v.errors.join(','));
    // and validate integrates it: a task whose TASK_STATE flips merge flag true is OK with receipt
    const t = mkTask();
    const sp = join(t, 'TASK_STATE.json');
    const ts = JSON.parse(readFileSync(sp, 'utf8'));
    ts.authorizations.researchRecordMergeToMainAuthorized = true;
    writeJson(sp, ts);
    const td2 = roots[roots.length - 1];
    const recPath = join(td2, 'receipt.json');
    writeJson(recPath, receipt);
    const repNoReceipt = validateTask(t, {});
    check('15b merge flag true WITHOUT receipt fails', !repNoReceipt.ok);
    const repWithReceipt = validateTask(t, { ownerReceiptPath: recPath });
    const a = repWithReceipt.checks.find((c) => c.name.startsWith('authorization floor'));
    check('15c merge flag true WITH valid receipt passes floor', a && a.ok, a ? a.detail : 'no floor check');
  }

  // 16. receipt that improperly authorizes production
  {
    const receipt = { authorizationType: 'RESEARCH_RECORD_MERGE_TO_MAIN', taskId: BASE.taskId, targetBranch: 'main', authorizations: { researchRecordMergeToMainAuthorized: true, productionChangeAuthorized: true } };
    const v = validateOwnerReceipt(receipt, BASE.taskId);
    check('16 receipt authorizing production is rejected', !v.ok && !v.mergeAuthorized);
  }

  // cleanup
  for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }

  console.log(`\nFIXTURES: ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.log('FAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
  process.exit(0);
}

run();
