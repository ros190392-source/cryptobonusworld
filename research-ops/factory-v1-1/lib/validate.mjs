// ResearchOps Factory V1.1 — deterministic task validator. Fail-closed.
// Never mutates the task. Returns a structured report.

import { join } from 'node:path';
import {
  exists, readBuf, readText, listFlatFiles, findUnsafeEntries, byteLength, hasBOM, hasCR,
} from './util.mjs';
import {
  STAGE_DIRS, RESEARCH_FILES, RESEARCH_JSON_FILES, MANIFEST_HASHED_FILES,
  ID_COLLECTIONS, CROSSREF_RULES, isState, canTransition,
} from './model.mjs';
import { verifyManifest } from './manifest.mjs';
import { enforceAuthFloor, validateOwnerReceipt } from './authz.mjs';

function mk() {
  const checks = [];
  return {
    checks,
    add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); return ok; },
  };
}

// Read + parse a JSON file, returning [obj, error].
function tryJson(path) {
  try { return [JSON.parse(readText(path)), null]; }
  catch (e) { return [null, e.message]; }
}

// Validate the flat eleven-file research package inside an output dir.
function validatePackage(outDir, R) {
  // inventory
  const flat = listFlatFiles(outDir);
  const flatSet = new Set(flat);
  const expected = new Set(RESEARCH_FILES);
  const missing = RESEARCH_FILES.filter((f) => !flatSet.has(f));
  const extra = flat.filter((f) => !expected.has(f));
  R.add('inventory: exactly 11 canonical files', flat.length === 11 && missing.length === 0 && extra.length === 0,
    `count=${flat.length} missing=[${missing}] extra=[${extra}]`);

  // no unsafe entries
  const unsafe = findUnsafeEntries(outDir);
  R.add('no symlink/executable/non-regular entries', unsafe.length === 0, unsafe.map((u) => `${u.path}:${u.reason}`).join(', '));

  // canonical encoding: no BOM, no CR
  let encOk = true; const encBad = [];
  for (const f of RESEARCH_FILES) {
    const p = join(outDir, f); if (!exists(p)) continue;
    const buf = readBuf(p);
    if (hasBOM(buf)) { encOk = false; encBad.push(`${f}:BOM`); }
    if (hasCR(buf)) { encOk = false; encBad.push(`${f}:CRLF`); }
  }
  R.add('canonical UTF-8 (no BOM) and LF line endings', encOk, encBad.join(', '));

  // JSON parse (9)
  const parsed = {};
  let parseOk = 0;
  for (const f of RESEARCH_JSON_FILES) {
    const p = join(outDir, f);
    if (!exists(p)) { R.add(`json parse: ${f}`, false, 'missing'); continue; }
    const [obj, err] = tryJson(p);
    if (err) { R.add(`json parse: ${f}`, false, err); continue; }
    parsed[f] = obj; parseOk += 1;
  }
  R.add('9/9 JSON files parse', parseOk === RESEARCH_JSON_FILES.length, `${parseOk}/${RESEARCH_JSON_FILES.length}`);

  // MANIFEST
  const mres = verifyManifest(outDir, MANIFEST_HASHED_FILES);
  R.add('MANIFEST byte sizes and SHA-256 match (canonical LF)', mres.ok, mres.errors.join('; '));

  // unique IDs + collect id sets
  const idSets = {};
  for (const c of ID_COLLECTIONS) {
    const obj = parsed[c.file];
    if (!obj) { R.add(`unique ${c.label} IDs`, false, `${c.file} not parsed`); idSets[c.label] = new Set(); continue; }
    const arr = Array.isArray(obj[c.arrayKey]) ? obj[c.arrayKey] : null;
    if (!arr) { R.add(`unique ${c.label} IDs`, false, `${c.file}.${c.arrayKey} not an array`); idSets[c.label] = new Set(); continue; }
    const ids = arr.map((x) => x && x[c.idKey]);
    const bad = ids.filter((x) => typeof x !== 'string' || x.length === 0);
    const set = new Set(ids);
    const unique = bad.length === 0 && set.size === ids.length;
    R.add(`unique ${c.label} IDs`, unique, `count=${ids.length} unique=${set.size} invalid=${bad.length}`);
    idSets[c.label] = set;
  }

  // cross-references
  let xrefOk = true; const xrefBad = [];
  for (const rule of CROSSREF_RULES) {
    const obj = parsed[rule.file];
    if (!obj) { xrefOk = false; xrefBad.push(`${rule.file} not parsed`); continue; }
    const arr = Array.isArray(obj[rule.arrayKey]) ? obj[rule.arrayKey] : [];
    const target = rule.resolvesTo === 'source' ? idSets.source : idSets.claim;
    for (const item of arr) {
      for (const rk of rule.refKeys) {
        const refs = Array.isArray(item?.[rk]) ? item[rk] : [];
        for (const ref of refs) {
          if (!target.has(ref)) { xrefOk = false; xrefBad.push(`${item[rule.ownerIdKey]}.${rk}->${ref}`); }
        }
      }
    }
  }
  R.add('all source and claim cross-references resolve', xrefOk, xrefBad.slice(0, 10).join(', '));

  return { parsed };
}

// Main entry. opts: { toState, ownerReceiptPath, changedFilesPath, requirePackage }
export function validateTask(taskDir, opts = {}) {
  const R = mk();

  R.add('task directory exists', exists(taskDir), taskDir);
  if (!exists(taskDir)) return finalize(R, opts, null);

  // structure
  for (const d of STAGE_DIRS) {
    R.add(`stage dir present: ${d}`, exists(join(taskDir, d)));
  }

  // TASK_STATE.json
  const statePath = join(taskDir, 'TASK_STATE.json');
  let state = null; let taskState = null;
  if (!exists(statePath)) {
    R.add('TASK_STATE.json present', false);
  } else {
    R.add('TASK_STATE.json present', true);
    const [obj, err] = tryJson(statePath);
    if (err) R.add('TASK_STATE.json parses', false, err);
    else {
      taskState = obj; state = obj.state;
      R.add('TASK_STATE.json parses', true);
      R.add('state is a canonical enum value', isState(state), String(state));
      if (opts.toState) {
        R.add(`transition ${state} -> ${opts.toState} is allowed`, canTransition(state, opts.toState));
      }
    }
  }

  // no unsafe entries anywhere in the task
  const unsafe = findUnsafeEntries(taskDir);
  R.add('task has no symlink/executable/non-regular entries', unsafe.length === 0, unsafe.map((u) => `${u.path}:${u.reason}`).join(', '));

  // owner receipt (exception path)
  let ownerMergeAllowed = false;
  if (opts.ownerReceiptPath) {
    if (!exists(opts.ownerReceiptPath)) {
      R.add('owner receipt file exists', false, opts.ownerReceiptPath);
    } else {
      const [rc, err] = tryJson(opts.ownerReceiptPath);
      if (err) R.add('owner receipt parses', false, err);
      else {
        const v = validateOwnerReceipt(rc, taskState?.taskId);
        R.add('owner receipt is a valid research-record merge receipt', v.ok, v.errors.join('; '));
        ownerMergeAllowed = v.mergeAuthorized;
      }
    }
  }

  // package (auto-detect or forced): present when any canonical research file exists.
  const outDir = join(taskDir, '20-research-output');
  const packagePresent = RESEARCH_FILES.some((f) => exists(join(outDir, f)));
  let pkg = null;
  if (opts.requirePackage || packagePresent) {
    pkg = validatePackage(outDir, R);
  }

  // authorization floor over TASK_STATE + research authorization-bearing JSON
  const authTargets = [];
  if (taskState) authTargets.push(['TASK_STATE.json', taskState]);
  if (pkg) {
    for (const f of ['research-run.json', 'import-readiness.json', 'offer-eligibility-review.json']) {
      if (pkg.parsed[f]) authTargets.push([f, pkg.parsed[f]]);
    }
  }
  let authOk = true; const authBad = [];
  for (const [name, obj] of authTargets) {
    const res = enforceAuthFloor(obj, { ownerMergeAllowed });
    if (!res.ok) { authOk = false; authBad.push(`${name}: ${res.violations.join(', ')}`); }
  }
  R.add('authorization floor holds (all false unless valid owner receipt)', authOk, authBad.join(' | '));

  // append-only changed-file boundary (optional)
  if (opts.changedFilesPath) {
    if (!exists(opts.changedFilesPath)) {
      R.add('changed-files list exists', false, opts.changedFilesPath);
    } else {
      const changed = readText(opts.changedFilesPath).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      const bres = checkAppendOnlyBoundary(changed, taskState?.taskId, opts.taskPrefix);
      R.add('append-only changed-file boundary holds', bres.ok, bres.violations.join(', '));
    }
  }

  return finalize(R, opts, state);
}

// Pure boundary check: every changed path must live under the task's own tree
// (or the factory tree) — no escaping into production/master-owned areas.
export function checkAppendOnlyBoundary(changedFiles, taskId, taskPrefix) {
  const violations = [];
  const allowed = [
    taskPrefix || (taskId ? `research-ops/tasks/${taskId}/` : 'research-ops/tasks/'),
    'research-ops/factory-v1-1/',
    '.github/workflows/',
  ];
  const forbidden = ['research-ops-pilot/tasks/', 'src/', 'public/', 'data/market-intelligence/'];
  for (const f of changedFiles) {
    const p = f.replace(/\\/g, '/');
    if (p.includes('..')) { violations.push(`${p}: traversal`); continue; }
    if (forbidden.some((fp) => p.startsWith(fp))) { violations.push(`${p}: forbidden area`); continue; }
    if (!allowed.some((ap) => p.startsWith(ap))) { violations.push(`${p}: outside task/factory boundary`); }
  }
  return { ok: violations.length === 0, violations };
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
