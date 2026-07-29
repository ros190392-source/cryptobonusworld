// ResearchOps Factory V1.1 — identity-bound higher-stage marker integrity.
// V2-C10 identity binding; V3-C6 exactly-one candidate (no hidden duplicate);
// V3-C7 controlled outcome enums and 40-hex/main/receipt-linked merge records;
// V3-C12 canonical-text control-byte rejection. A marker may raise state only if it is
// a single regular, non-symlink, canonical, parseable, identity-bound file carrying a
// recognized outcome. Owner-closeout requires an exact owner receipt.

import { join } from 'node:path';
import { lstatSync, readdirSync } from 'node:fs';
import { exists, readBuf, isValidUtf8, hasBOM, hasCR, hasForbiddenControls } from './util.mjs';
import { validateOwnerReceipt } from './authz.mjs';
import { verifyMergeRecord } from './mergeproof.mjs';

// Controlled outcome enums per stage marker (V3-C7).
const REVIEW_OUTCOMES = new Set(['SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED', 'NO_CORRECTION_REQUIRED', 'PROCEED_TO_VALIDATION']);
const CORRECTION_OUTCOMES = new Set(['CORRECTED', 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION']);
const VALIDATION_OUTCOMES = new Set(['VALIDATED_FOR_OWNER_MERGE_REVIEW', 'VALIDATED_WITH_CORRECTIONS_REQUIRED', 'VALIDATION_BLOCKED']);
const MERGE_STATES = new Set(['RESEARCH_RECORD_MERGED_TO_MAIN']);

// Stage marker specifications (cumulative evidence uses subsets of these).
export const REVIEW_MARKER = {
  dir: '50-source-truth-review',
  anyOf: ['SOURCE_TRUTH_REVIEW.json'],
  kind: 'json',
  outcomeKeys: ['outcome', 'reviewOutcome'],
  enum: REVIEW_OUTCOMES,
  requiredCompanions: ['SOURCE_TRUTH_REVIEW.md'],
  allowedStageFiles: ['.gitkeep', 'SOURCE_TRUTH_REVIEW.json', 'SOURCE_TRUTH_REVIEW.md'],
};
export const CORRECTION_MARKER = { dir: '60-correction', anyOf: ['CORRECTION_STATE.json', 'CORRECTION_RESULT.json'], kind: 'json', outcomeKeys: ['outcome', 'correctionOutcome'], enum: CORRECTION_OUTCOMES };
export const VALIDATION_MARKER = { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json', 'CORRECTION_V3_VALIDATION.json'], kind: 'json', outcomeKeys: ['outcome', 'validationOutcome'], enum: VALIDATION_OUTCOMES };
export const CLOSEOUT_MARKER = { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'], kind: 'receipt' };
export const MERGE_MARKER = { dir: '80-closeout', anyOf: ['RESEARCH_RECORD_MERGE.json', 'MERGE_RECORD.json'], kind: 'merge' };

const HEX40 = /^[0-9a-f]{40}$/;

function tryParse(buf) { try { return [JSON.parse(buf.toString('utf8')), null]; } catch (e) { return [null, e.message]; } }

function readCanonicalBytes(p, label) {
  if (!exists(p)) return { ok: false, reason: `${label}: required file missing`, buf: null };
  let st;
  try { st = lstatSync(p); } catch (e) { return { ok: false, reason: `${label}: lstat failed (${e.message})`, buf: null }; }
  if (st.isSymbolicLink()) return { ok: false, reason: `${label}: symlink file not allowed`, buf: null };
  if (!st.isFile()) return { ok: false, reason: `${label}: non-regular file`, buf: null };
  if ((st.mode & 0o111) !== 0) return { ok: false, reason: `${label}: executable file not allowed`, buf: null };
  const buf = readBuf(p);
  if (buf.length === 0) return { ok: false, reason: `${label}: zero-byte file`, buf: null };
  if (!isValidUtf8(buf)) return { ok: false, reason: `${label}: invalid UTF-8`, buf: null };
  if (hasBOM(buf) || hasCR(buf) || hasForbiddenControls(buf)) return { ok: false, reason: `${label}: non-canonical control bytes/encoding`, buf: null };
  return { ok: true, reason: '', buf };
}

// Read + canonically validate the bytes of a single JSON marker file.
function readMarkerObject(p, label) {
  const rd = readCanonicalBytes(p, label);
  if (!rd.ok) return { ok: false, reason: rd.reason, obj: null };
  const [obj, err] = tryParse(rd.buf);
  if (err) return { ok: false, reason: `${label}: not parseable JSON (${err})`, obj: null };
  return { ok: true, reason: '', obj };
}

function validateCompanionsAndInventory(taskDir, spec) {
  for (const f of spec.requiredCompanions || []) {
    const label = `${spec.dir}/${f}`;
    const rd = readCanonicalBytes(join(taskDir, spec.dir, f), label);
    if (!rd.ok) return { ok: false, reason: rd.reason };
  }
  if (Array.isArray(spec.allowedStageFiles)) {
    let entries;
    try { entries = readdirSync(join(taskDir, spec.dir)); }
    catch (e) { return { ok: false, reason: `${spec.dir}: cannot read stage inventory (${e.message})` }; }
    const allowed = new Set(spec.allowedStageFiles);
    const extra = entries.filter((f) => !allowed.has(f)).sort();
    if (extra.length) return { ok: false, reason: `${spec.dir}: unexpected review-stage files [${extra.join(', ')}]` };
  }
  return { ok: true, reason: '' };
}

const markerId = (obj) => (obj && typeof obj === 'object' ? (obj.taskId ?? obj.validationTaskId ?? obj.correctionTaskId) : undefined);

// Validate one stage marker. V3-C6: exactly one candidate must exist.
// opts.mergeFacts (V4-C6) supplies read-only repository facts for merge records.
export function validateMarker(taskDir, spec, taskId, opts = {}) {
  const present = spec.anyOf.filter((f) => exists(join(taskDir, spec.dir, f)));
  if (present.length === 0) return { ok: false, reason: `missing ${spec.dir}/{${spec.anyOf.join(' | ')}}`, file: null };
  if (present.length > 1) return { ok: false, reason: `${spec.dir}: conflicting multiple marker candidates [${present.join(', ')}]`, file: null };
  const chosen = present[0];
  const label = `${spec.dir}/${chosen}`;
  const rd = readMarkerObject(join(taskDir, spec.dir, chosen), label);
  if (!rd.ok) return { ok: false, reason: rd.reason, file: chosen };

  // Correction 035 — the generated review contract is dual-output. The JSON marker
  // cannot raise state unless its Markdown companion and exact stage inventory are
  // present and canonical at the same historical head.
  const ci = validateCompanionsAndInventory(taskDir, spec);
  if (!ci.ok) return { ok: false, reason: ci.reason, file: chosen };

  const obj = rd.obj;
  if (spec.kind === 'receipt') {
    const v = validateOwnerReceipt(obj, taskId);
    if (!v.ok) return { ok: false, reason: `${label}: invalid owner receipt (${v.errors.join('; ')})`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  if (spec.kind === 'merge') {
    // V4-C6 — real merge proof: structure + repository facts (when provided by the CLI).
    const v = verifyMergeRecord(obj, taskId, opts.mergeFacts || {});
    if (!v.ok) return { ok: false, reason: `${label}: ${v.errors.join('; ')}`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  // json marker: identity-bound + recognized outcome enum.
  if (markerId(obj) !== taskId) return { ok: false, reason: `${label}: marker taskId (${JSON.stringify(markerId(obj))}) != ${taskId}`, file: chosen };
  const val = (spec.outcomeKeys || []).map((k) => obj[k]).find((v) => v !== undefined);
  if (!spec.enum.has(val)) return { ok: false, reason: `${label}: outcome ${JSON.stringify(val)} is not a recognized ${spec.dir} outcome`, file: chosen };
  return { ok: true, reason: '', file: chosen };
}

// Validate a cumulative list of markers. Returns { ok, reason }.
export function validateMarkers(taskDir, specs, taskId, opts = {}) {
  for (const spec of specs || []) {
    const r = validateMarker(taskDir, spec, taskId, opts);
    if (!r.ok) return { ok: false, reason: r.reason };
  }
  return { ok: true, reason: '' };
}
