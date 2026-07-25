// ResearchOps Factory V1.1 — deterministic status derivation.

import { join } from 'node:path';
import { exists, readText } from './util.mjs';
import { STATES, isState, RESEARCH_FILES } from './model.mjs';
import { validateTask } from './validate.mjs';

// Derive an evidence-backed status. Never claims a later state than the
// on-disk evidence supports.
export function statusTask(taskDir) {
  const statePath = join(taskDir, 'TASK_STATE.json');
  const out = {
    taskDir,
    declaredState: null,
    evidenceState: 'UNKNOWN',
    packagePresent: false,
    packageValid: false,
    consistent: false,
    notes: [],
  };
  if (!exists(taskDir)) { out.notes.push('task directory missing'); return out; }
  if (!exists(statePath)) { out.notes.push('TASK_STATE.json missing'); return out; }

  let ts;
  try { ts = JSON.parse(readText(statePath)); }
  catch (e) { out.notes.push(`TASK_STATE.json parse error: ${e.message}`); return out; }
  out.declaredState = ts.state;
  if (!isState(ts.state)) out.notes.push(`declared state not canonical: ${ts.state}`);

  const outDir = join(taskDir, '20-research-output');
  out.packagePresent = RESEARCH_FILES.some((f) => exists(join(outDir, f)));

  const v = validateTask(taskDir, {});
  out.packageValid = out.packagePresent && v.ok;

  // Evidence-backed state ceiling.
  if (!out.packagePresent) {
    out.evidenceState = 'PREPARED';
  } else if (out.packageValid) {
    out.evidenceState = 'PACKAGE_VALIDATED';
  } else {
    out.evidenceState = 'RESEARCH_CAPTURED';
    out.notes.push('research files present but package validation failed');
  }

  // Consistency: declared state may not exceed evidence when package-dependent.
  const rank = (s) => Math.max(0, STATES.indexOf(s));
  const declaredRank = rank(ts.state);
  const evidenceRank = rank(out.evidenceState);
  if (out.packagePresent && !out.packageValid && declaredRank > rank('RESEARCH_CAPTURED')) {
    out.consistent = false;
    out.notes.push(`declared state ${ts.state} exceeds evidence (invalid package)`);
  } else if (!out.packagePresent && declaredRank > rank('PREPARED')) {
    out.consistent = false;
    out.notes.push(`declared state ${ts.state} exceeds evidence (no research package)`);
  } else {
    out.consistent = true;
  }

  out.validation = { ok: v.ok, passed: v.passed, failed: v.failed, total: v.total };
  return out;
}
