// ResearchOps Factory V1.1 — identity-bound higher-stage marker integrity.
// V2-C10 identity binding; V3-C6 exactly-one candidate (no hidden duplicate);
// V3-C7 controlled outcome enums and 40-hex/main/receipt-linked merge records;
// V3-C12 canonical-text control-byte rejection. A marker may raise state only if it is
// a single regular, non-symlink, canonical, parseable, identity-bound file carrying a
// recognized outcome. Owner-closeout requires an exact owner receipt.

import { join } from 'node:path';
import { lstatSync } from 'node:fs';
import { exists, readBuf, isValidUtf8, hasBOM, hasCR, hasForbiddenControls } from './util.mjs';
import { validateOwnerReceipt } from './authz.mjs';

// Controlled outcome enums per stage marker (V3-C7).
const REVIEW_OUTCOMES = new Set(['SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED', 'NO_CORRECTION_REQUIRED', 'PROCEED_TO_VALIDATION']);
const CORRECTION_OUTCOMES = new Set(['CORRECTED', 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION']);
const VALIDATION_OUTCOMES = new Set(['VALIDATED_FOR_OWNER_MERGE_REVIEW', 'VALIDATED_WITH_CORRECTIONS_REQUIRED', 'VALIDATION_BLOCKED']);
const MERGE_STATES = new Set(['RESEARCH_RECORD_MERGED_TO_MAIN']);

// Stage marker specifications (cumulative evidence uses subsets of these).
export const REVIEW_MARKER = { dir: '50-source-truth-review', anyOf: ['SOURCE_TRUTH_REVIEW.json'], kind: 'json', outcomeKeys: ['outcome', 'reviewOutcome'], enum: REVIEW_OUTCOMES };
export const CORRECTION_MARKER = { dir: '60-correction', anyOf: ['CORRECTION_STATE.json', 'CORRECTION_RESULT.json'], kind: 'json', outcomeKeys: ['outcome', 'correctionOutcome'], enum: CORRECTION_OUTCOMES };
export const VALIDATION_MARKER = { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json', 'CORRECTION_V3_VALIDATION.json'], kind: 'json', outcomeKeys: ['outcome', 'validationOutcome'], enum: VALIDATION_OUTCOMES };
export const CLOSEOUT_MARKER = { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'], kind: 'receipt' };
export const MERGE_MARKER = { dir: '80-closeout', anyOf: ['RESEARCH_RECORD_MERGE.json', 'MERGE_RECORD.json'], kind: 'merge' };

const HEX40 = /^[0-9a-f]{40}$/;

function tryParse(buf) { try { return [JSON.parse(buf.toString('utf8')), null]; } catch (e) { return [null, e.message]; } }

// Read + canonically validate the bytes of a single marker file. Returns { ok, reason, obj }.
function readMarkerObject(p, label) {
  const st = lstatSync(p);
  if (st.isSymbolicLink()) return { ok: false, reason: `${label}: symlink marker not allowed` };
  if (!st.isFile()) return { ok: false, reason: `${label}: non-regular marker` };
  if ((st.mode & 0o111) !== 0) return { ok: false, reason: `${label}: executable marker not allowed` };
  const buf = readBuf(p);
  if (buf.length === 0) return { ok: false, reason: `${label}: zero-byte marker` };
  if (!isValidUtf8(buf)) return { ok: false, reason: `${label}: invalid UTF-8` };
  if (hasBOM(buf) || hasCR(buf) || hasForbiddenControls(buf)) return { ok: false, reason: `${label}: non-canonical control bytes/encoding` };
  const [obj, err] = tryParse(buf);
  if (err) return { ok: false, reason: `${label}: not parseable JSON (${err})` };
  return { ok: true, reason: '', obj };
}

const markerId = (obj) => (obj && typeof obj === 'object' ? (obj.taskId ?? obj.validationTaskId ?? obj.correctionTaskId) : undefined);

// Validate one stage marker. V3-C6: exactly one candidate must exist.
export function validateMarker(taskDir, spec, taskId) {
  const present = spec.anyOf.filter((f) => exists(join(taskDir, spec.dir, f)));
  if (present.length === 0) return { ok: false, reason: `missing ${spec.dir}/{${spec.anyOf.join(' | ')}}`, file: null };
  if (present.length > 1) return { ok: false, reason: `${spec.dir}: conflicting multiple marker candidates [${present.join(', ')}]`, file: null };
  const chosen = present[0];
  const label = `${spec.dir}/${chosen}`;
  const rd = readMarkerObject(join(taskDir, spec.dir, chosen), label);
  if (!rd.ok) return { ok: false, reason: rd.reason, file: chosen };
  const obj = rd.obj;

  if (spec.kind === 'receipt') {
    const v = validateOwnerReceipt(obj, taskId);
    if (!v.ok) return { ok: false, reason: `${label}: invalid owner receipt (${v.errors.join('; ')})`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  if (spec.kind === 'merge') {
    // V3-C7 — identity-bound 40-hex merge record targeting main with receipt linkage.
    const e = [];
    if (markerId(obj) !== taskId) e.push(`taskId ${JSON.stringify(markerId(obj))} != ${taskId}`);
    if (obj.targetBranch !== 'main') e.push(`targetBranch must be main, got ${JSON.stringify(obj.targetBranch)}`);
    if (typeof obj.mergeCommit !== 'string' || !HEX40.test(obj.mergeCommit)) e.push(`mergeCommit must be a 40-hex SHA, got ${JSON.stringify(obj.mergeCommit)}`);
    if (!MERGE_STATES.has(obj.mergedState)) e.push(`mergedState must be a recognized merged state, got ${JSON.stringify(obj.mergedState)}`);
    const receiptId = obj.precedingReceiptTaskId ?? (obj.precedingReceipt && obj.precedingReceipt.taskId);
    if (receiptId !== taskId) e.push(`preceding owner-receipt linkage missing/mismatched (${JSON.stringify(receiptId)})`);
    if (e.length) return { ok: false, reason: `${label}: ${e.join('; ')}`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  // json marker: identity-bound + recognized outcome enum.
  if (markerId(obj) !== taskId) return { ok: false, reason: `${label}: marker taskId (${JSON.stringify(markerId(obj))}) != ${taskId}`, file: chosen };
  const val = (spec.outcomeKeys || []).map((k) => obj[k]).find((v) => v !== undefined);
  if (!spec.enum.has(val)) return { ok: false, reason: `${label}: outcome ${JSON.stringify(val)} is not a recognized ${spec.dir} outcome`, file: chosen };
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
