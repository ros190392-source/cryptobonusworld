// ResearchOps Factory V1.1 — identity-bound higher-stage marker integrity (V2-C10).
// A marker may raise state only if it is a regular, non-symlink, canonical-UTF-8,
// parseable, identity-bound file with a recognized outcome/state. Owner-closeout and
// merge-authorized states require an exact owner receipt, not a placeholder.

import { join } from 'node:path';
import { lstatSync } from 'node:fs';
import { exists, readBuf, isValidUtf8, hasBOM, hasCR } from './util.mjs';
import { validateOwnerReceipt } from './authz.mjs';

// Stage marker specifications (ordered; cumulative evidence uses subsets of these).
export const REVIEW_MARKER = { dir: '50-source-truth-review', anyOf: ['SOURCE_TRUTH_REVIEW.json'], kind: 'json', outcomeKeys: ['outcome', 'reviewOutcome', 'state', 'decision'] };
export const CORRECTION_MARKER = { dir: '60-correction', anyOf: ['CORRECTION_STATE.json', 'CORRECTION_RESULT.json'], kind: 'json', outcomeKeys: ['outcome', 'correctionOutcome', 'state'] };
export const VALIDATION_MARKER = { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json'], kind: 'json', outcomeKeys: ['outcome', 'validationOutcome', 'state'] };
export const CLOSEOUT_MARKER = { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'], kind: 'receipt' };
export const MERGE_MARKER = { dir: '80-closeout', anyOf: ['RESEARCH_RECORD_MERGE.json', 'MERGE_RECORD.json'], kind: 'json', outcomeKeys: ['mergedToMain', 'mergeCommit', 'state'] };

const nonEmpty = (v) => (typeof v === 'string' ? v.length > 0 : v !== undefined && v !== null && v !== false);

function tryParse(buf) {
  try { return [JSON.parse(buf.toString('utf8')), null]; }
  catch (e) { return [null, e.message]; }
}

// Validate one stage marker. Returns { ok, reason, file }.
export function validateMarker(taskDir, spec, taskId) {
  let chosen = null;
  for (const f of spec.anyOf) { if (exists(join(taskDir, spec.dir, f))) { chosen = f; break; } }
  if (!chosen) return { ok: false, reason: `missing ${spec.dir}/{${spec.anyOf.join(' | ')}}`, file: null };
  const p = join(taskDir, spec.dir, chosen);
  const st = lstatSync(p);
  if (st.isSymbolicLink()) return { ok: false, reason: `${spec.dir}/${chosen}: symlink marker not allowed`, file: chosen };
  if (!st.isFile()) return { ok: false, reason: `${spec.dir}/${chosen}: non-regular marker`, file: chosen };
  if ((st.mode & 0o111) !== 0) return { ok: false, reason: `${spec.dir}/${chosen}: executable marker not allowed`, file: chosen };
  const buf = readBuf(p);
  if (buf.length === 0) return { ok: false, reason: `${spec.dir}/${chosen}: zero-byte marker`, file: chosen };
  if (!isValidUtf8(buf) || hasBOM(buf) || hasCR(buf)) return { ok: false, reason: `${spec.dir}/${chosen}: non-canonical encoding`, file: chosen };
  const [obj, err] = tryParse(buf);
  if (err) return { ok: false, reason: `${spec.dir}/${chosen}: not parseable JSON (${err})`, file: chosen };
  if (spec.kind === 'receipt') {
    const v = validateOwnerReceipt(obj, taskId);
    if (!v.ok) return { ok: false, reason: `${spec.dir}/${chosen}: invalid owner receipt (${v.errors.join('; ')})`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  // json marker: identity-bound + recognized outcome/state.
  const mid = obj && typeof obj === 'object' ? (obj.taskId ?? obj.validationTaskId ?? obj.correctionTaskId) : undefined;
  if (mid !== taskId) return { ok: false, reason: `${spec.dir}/${chosen}: marker taskId (${JSON.stringify(mid)}) != ${taskId}`, file: chosen };
  const hasOutcome = (spec.outcomeKeys || []).some((k) => nonEmpty(obj[k]));
  if (!hasOutcome) return { ok: false, reason: `${spec.dir}/${chosen}: no recognized outcome/state field`, file: chosen };
  return { ok: true, reason: '', file: chosen };
}

// Validate a cumulative list of markers. Returns { ok, reason }.
export function validateMarkers(taskDir, specs, taskId) {
  for (const spec of specs || []) {
    const r = validateMarker(taskDir, spec, taskId);
    if (!r.ok) return { ok: false, reason: r.reason };
  }
  return { ok: true, reason: '' };
}
