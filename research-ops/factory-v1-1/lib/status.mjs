// ResearchOps Factory V1.1 — deterministic status derivation.
// Shares the canonical evidence logic with `validate` (no contradictory logic).

import { join } from 'node:path';
import { exists, readText } from './util.mjs';
import { isState } from './model.mjs';
import { deriveEvidence, checkStateConsistency, evidenceCeiling } from './evidence.mjs';

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

  const evidence = deriveEvidence(taskDir);
  out.packagePresent = evidence.packagePresent;
  out.packageValid = evidence.packageValid;
  out.evidenceState = evidenceCeiling(ts, evidence, taskDir);

  const cons = checkStateConsistency(ts.state, ts, evidence, taskDir);
  out.consistent = cons.consistent;
  if (!cons.consistent && cons.reason) out.notes.push(cons.reason);
  if (evidence.packagePresent && !evidence.packageValid) out.notes.push('research files present but package validation failed');

  return out;
}
