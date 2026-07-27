// ResearchOps Factory V1.1 — deterministic task validator. Fail-closed.
// Never mutates the task. Returns a structured report.

import { join } from 'node:path';
import { exists, readText, findUnsafeEntries } from './util.mjs';
import { STAGE_DIRS, isState, canTransition } from './model.mjs';
import { enforceAuthFloor, validateOwnerReceipt } from './authz.mjs';
import { validatePackageDir, researchPackagePresent } from './package.mjs';
import { deriveEvidence, checkStateConsistency } from './evidence.mjs';
import { validateTaskStateShape, validateIdentityShape, validateGithubPlanShape } from './schema.mjs';
import { parseNameStatus, checkChangedFileBoundary } from './boundary.mjs';

function mk() {
  const checks = [];
  return { checks, add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); return ok; } };
}

function tryJson(path) {
  try { return [JSON.parse(readText(path)), null]; }
  catch (e) { return [null, e.message]; }
}

// opts: { toState, ownerReceiptPath, changedFilesPath, changedStatusPath, requirePackage }
export function validateTask(taskDir, opts = {}) {
  const R = mk();

  R.add('task directory exists', exists(taskDir), taskDir);
  if (!exists(taskDir)) return finalize(R, opts, null);

  for (const d of STAGE_DIRS) R.add(`stage dir present: ${d}`, exists(join(taskDir, d)));

  // TASK_STATE.json + C9 structural shape
  const statePath = join(taskDir, 'TASK_STATE.json');
  let state = null; let taskState = null;
  if (!exists(statePath)) {
    R.add('TASK_STATE.json present', false);
  } else {
    R.add('TASK_STATE.json present', true);
    const [obj, err] = tryJson(statePath);
    if (err) { R.add('TASK_STATE.json parses', false, err); }
    else {
      taskState = obj; state = obj.state;
      R.add('TASK_STATE.json parses', true);
      const shapeErrors = validateTaskStateShape(obj);
      R.add('TASK_STATE.json structural shape (C9)', shapeErrors.length === 0, shapeErrors.slice(0, 8).join('; '));
      R.add('state is a canonical enum value', isState(state), String(state));
      if (opts.toState) R.add(`transition ${state} -> ${opts.toState} is allowed`, canTransition(state, opts.toState));
    }
  }

  // C9 — IDENTITY.json + GITHUB_PLAN.json
  const identPath = join(taskDir, '00-contract', 'IDENTITY.json');
  if (!exists(identPath)) R.add('00-contract/IDENTITY.json present', false);
  else {
    const [ident, err] = tryJson(identPath);
    if (err) R.add('IDENTITY.json parses', false, err);
    else {
      R.add('IDENTITY.json parses', true);
      const ie = validateIdentityShape(ident, taskState);
      R.add('IDENTITY.json shape and taskId/identity consistency (C9)', ie.length === 0, ie.slice(0, 8).join('; '));
    }
  }
  const planPath = join(taskDir, '00-contract', 'GITHUB_PLAN.json');
  if (!exists(planPath)) R.add('00-contract/GITHUB_PLAN.json present', false);
  else {
    const [plan, err] = tryJson(planPath);
    if (err) R.add('GITHUB_PLAN.json parses', false, err);
    else {
      R.add('GITHUB_PLAN.json parses', true);
      const ge = validateGithubPlanShape(plan, taskState);
      R.add('GITHUB_PLAN.json shape (draft/base/autoMerge/mergeAuthorized) (C9)', ge.length === 0, ge.slice(0, 8).join('; '));
    }
  }

  // no unsafe entries anywhere in the task
  const unsafe = findUnsafeEntries(taskDir);
  R.add('task has no symlink/executable/non-regular entries', unsafe.length === 0, unsafe.map((u) => `${u.path}:${u.reason}`).join(', '));

  // owner receipt (exception path)
  let ownerMergeAllowed = false;
  if (opts.ownerReceiptPath) {
    if (!exists(opts.ownerReceiptPath)) R.add('owner receipt file exists', false, opts.ownerReceiptPath);
    else {
      const [rc, err] = tryJson(opts.ownerReceiptPath);
      if (err) R.add('owner receipt parses', false, err);
      else {
        const v = validateOwnerReceipt(rc, taskState?.taskId);
        R.add('owner receipt is a valid research-record merge receipt', v.ok, v.errors.join('; '));
        ownerMergeAllowed = v.mergeAuthorized;
      }
    }
  }

  // package (C1 forced or auto-detected). C1: --require-package forces the check even when empty.
  const outDir = join(taskDir, '20-research-output');
  const packagePresent = researchPackagePresent(outDir);
  let pkg = null;
  if (opts.requirePackage && !packagePresent) {
    R.add('required package present (--require-package)', false, '20-research-output/ has no research files');
  } else if (opts.requirePackage || packagePresent) {
    pkg = validatePackageDir(outDir, R);
  }

  // authorization floor
  const authTargets = [];
  if (taskState) authTargets.push(['TASK_STATE.json', taskState]);
  if (pkg) for (const f of ['research-run.json', 'import-readiness.json', 'offer-eligibility-review.json']) if (pkg.parsed[f]) authTargets.push([f, pkg.parsed[f]]);
  let authOk = true; const authBad = [];
  for (const [name, obj] of authTargets) {
    const res = enforceAuthFloor(obj, { ownerMergeAllowed });
    if (!res.ok) { authOk = false; authBad.push(`${name}: ${res.violations.join(', ')}`); }
  }
  R.add('authorization floor holds (all false unless valid owner receipt)', authOk, authBad.join(' | '));

  // C2 — declared state must be consistent with on-disk evidence (fail-closed)
  if (taskState) {
    const evidence = deriveEvidence(taskDir);
    const cons = checkStateConsistency(state, taskState, evidence, taskDir);
    R.add('declared state is consistent with on-disk evidence (C2)', cons.consistent, cons.reason);
  }

  // C5 — append-only changed-file boundary (name-status preferred)
  if (opts.changedStatusPath || opts.changedFilesPath) {
    const p = opts.changedStatusPath || opts.changedFilesPath;
    if (!exists(p)) R.add('changed-files list exists', false, p);
    else {
      const text = readText(p);
      const records = opts.changedStatusPath ? parseNameStatus(text) : text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((path) => ({ status: 'M', dst: path, paths: [path] }));
      const bmeta = {};
      if (opts.headBranch) bmeta.headBranch = opts.headBranch;
      if (opts.baseBranch) bmeta.baseBranch = opts.baseBranch;
      const bres = checkChangedFileBoundary(records, bmeta);
      R.add(`append-only changed-file boundary holds (mode=${bres.mode})`, bres.ok, bres.violations.slice(0, 10).join(', '));
    }
  }

  return finalize(R, opts, state);
}

function finalize(R, opts, state) {
  const failed = R.checks.filter((c) => !c.ok);
  return {
    taskDir: opts.taskDir,
    state,
    ok: failed.length === 0,
    total: R.checks.length,
    passed: R.checks.length - failed.length,
    failed: failed.length,
    checks: R.checks,
  };
}
