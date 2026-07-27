// ResearchOps Factory V1.1 — eleven-file research package validation.
// Shared by validate and evidence derivation. Fail-closed, dependency-free.

import { join } from 'node:path';
import { readdirSync, lstatSync } from 'node:fs';
import { exists, readBuf, readText, byteLength, hasBOM, hasCR, isValidUtf8, hasForbiddenControls } from './util.mjs';
import {
  RESEARCH_FILES, RESEARCH_JSON_FILES, MANIFEST_HASHED_FILES,
  ID_COLLECTIONS, CROSSREF_RULES,
} from './model.mjs';
import { verifyManifest } from './manifest.mjs';

// Reference fields that MUST be present as arrays when their owner record exists.
const REQUIRED_REF_FIELDS = {
  'claim-verdicts.json': ['supportedSourceIds'],
  'payment-rails.json': ['sourceIds'],
};

// V2-C8 — governed minimum top-level structure for EVERY research JSON file, not
// only the five ID collections. Each requires an object top level with the named
// key present and of the named kind ('array' or 'object'). Compatible with the
// proven OKX package shape and the fixture package shape.
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const RESEARCH_JSON_SHAPES = {
  'research-run.json': { overallFinding: 'object' },
  'source-verification.json': { sources: 'array' },
  'claim-verdicts.json': { claims: 'array' },
  'conflict-resolution.json': { conflicts: 'array' },
  'product-availability.json': { products: 'array' },
  'payment-rails.json': { rails: 'array' },
  'offer-eligibility-review.json': { review: 'object' },
  'schema-normalization-notes.json': { notes: 'array' },
  'import-readiness.json': { readiness: 'object' },
};
// V3-C11 — non-vacuous minimum contents inside the governed top-level objects, aligned
// with the proven OKX package and the normalized fixture package.
function checkResearchShape(file, obj) {
  if (!isObj(obj)) return `${file}: top level must be a JSON object (got ${obj === null ? 'null' : Array.isArray(obj) ? 'array' : typeof obj})`;
  const spec = RESEARCH_JSON_SHAPES[file];
  if (!spec) return '';
  for (const [key, kind] of Object.entries(spec)) {
    const v = obj[key];
    if (v === undefined) return `${file}: missing required '${key}'`;
    if (kind === 'array' && !Array.isArray(v)) return `${file}.${key} must be an array`;
    if (kind === 'object' && !isObj(v)) return `${file}.${key} must be an object`;
  }
  if (file === 'research-run.json' && !nonEmptyStr(obj.overallFinding.recommendation)) return `${file}.overallFinding.recommendation must be a non-empty string`;
  if (file === 'offer-eligibility-review.json' && !Array.isArray(obj.review.sourceIds)) return `${file}.review.sourceIds must be an array`;
  if (file === 'import-readiness.json') {
    const keys = Object.keys(obj.readiness);
    if (keys.length === 0) return `${file}.readiness must not be empty`;
    for (const k of keys) if (/Ready$/.test(k) && typeof obj.readiness[k] !== 'boolean') return `${file}.readiness.${k} must be boolean`;
    if (!keys.some((k) => /Ready$/.test(k))) return `${file}.readiness must declare at least one *Ready boolean`;
  }
  return '';
}

function tryJson(path) {
  try { return [JSON.parse(readText(path)), null]; }
  catch (e) { return [null, e.message]; }
}

// C7: exactly eleven flat regular files at depth one; reject any other entry
// anywhere under the package directory (nested dir/file, hidden, symlink, exec,
// special/non-regular). Returns { flat, violations }.
export function scanPackageEntries(outDir) {
  const violations = [];
  const flat = [];
  if (!exists(outDir)) return { flat, violations: ['20-research-output/ is missing'] };
  for (const name of readdirSync(outDir)) {
    const st = lstatSync(join(outDir, name));
    if (st.isSymbolicLink()) { violations.push(`${name}: symlink not allowed`); continue; }
    if (st.isDirectory()) { violations.push(`${name}/: unexpected nested directory`); continue; }
    if (!st.isFile()) { violations.push(`${name}: non-regular entry`); continue; }
    if (name.startsWith('.')) { violations.push(`${name}: hidden file not allowed`); continue; }
    if ((st.mode & 0o111) !== 0) violations.push(`${name}: executable bit not allowed`);
    flat.push(name);
  }
  return { flat: flat.sort(), violations };
}

// Validate an array reference field: must be an array of unique non-empty strings.
function checkRefArray(val) {
  if (val === undefined) return { present: false, ok: true, reason: '' };
  if (!Array.isArray(val)) return { present: true, ok: false, reason: `not an array (${val === null ? 'null' : typeof val})` };
  const seen = new Set();
  for (const item of val) {
    if (typeof item !== 'string' || item.length === 0) return { present: true, ok: false, reason: `non-string/empty item ${JSON.stringify(item)}` };
    if (seen.has(item)) return { present: true, ok: false, reason: `duplicate item ${item}` };
    seen.add(item);
  }
  return { present: true, ok: true, reason: '' };
}

// Full package validation. R is a check collector { add(name, ok, detail) }.
// Returns { ok, parsed }.
export function validatePackageDir(outDir, R) {
  // C7 — strict entry inventory
  const { flat, violations } = scanPackageEntries(outDir);
  const inventoryOk = flat.length === 11
    && RESEARCH_FILES.every((f) => flat.includes(f))
    && flat.every((f) => RESEARCH_FILES.includes(f))
    && violations.length === 0;
  R.add('inventory: exactly 11 flat regular files, no other entries', inventoryOk,
    `count=${flat.length} unexpected=[${violations.join('; ')}] extra=[${flat.filter((f) => !RESEARCH_FILES.includes(f))}] missing=[${RESEARCH_FILES.filter((f) => !flat.includes(f))}]`);

  // canonical encoding — V2-C9: strict UTF-8 validity (fatal decode) on ALL eleven
  // files BEFORE any JSON/text parsing, plus BOM and CR/CRLF rejection. Invalid UTF-8
  // is reported distinctly from malformed JSON.
  let encOk = true; const encBad = [];
  for (const f of RESEARCH_FILES) {
    const p = join(outDir, f); if (!exists(p)) continue;
    const buf = readBuf(p);
    if (!isValidUtf8(buf)) { encOk = false; encBad.push(`${f}:INVALID_UTF8`); }
    if (hasBOM(buf)) { encOk = false; encBad.push(`${f}:BOM`); }
    if (hasCR(buf)) { encOk = false; encBad.push(`${f}:CRLF`); }
    if (hasForbiddenControls(buf)) { encOk = false; encBad.push(`${f}:CONTROL_BYTE`); } // V3-C12
  }
  R.add('canonical UTF-8 (valid bytes, no BOM/CR, no control bytes) and LF line endings', encOk, encBad.join(', '));

  // JSON parse
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

  // V2-C8 — governed top-level structure for every one of the nine research JSON files.
  let shapeOk = true; const shapeBad = [];
  for (const f of RESEARCH_JSON_FILES) {
    if (!(f in parsed)) continue; // parse failure already reported above
    const msg = checkResearchShape(f, parsed[f]);
    if (msg) { shapeOk = false; shapeBad.push(msg); }
  }
  R.add('all nine research JSON top-level structures valid (V2-C8)', shapeOk, shapeBad.slice(0, 9).join('; '));

  // MANIFEST
  const mres = verifyManifest(outDir, MANIFEST_HASHED_FILES);
  R.add('MANIFEST byte sizes and SHA-256 match (canonical LF)', mres.ok, mres.errors.join('; '));

  // unique + typed IDs
  const idSets = {};
  for (const c of ID_COLLECTIONS) {
    const obj = parsed[c.file];
    if (!obj || typeof obj !== 'object') { R.add(`unique ${c.label} IDs`, false, `${c.file} not an object`); idSets[c.label] = new Set(); continue; }
    const arr = Array.isArray(obj[c.arrayKey]) ? obj[c.arrayKey] : null;
    if (!arr) { R.add(`unique ${c.label} IDs`, false, `${c.file}.${c.arrayKey} not an array`); idSets[c.label] = new Set(); continue; }
    const ids = arr.map((x) => (x && typeof x === 'object' ? x[c.idKey] : undefined));
    const bad = ids.filter((x) => typeof x !== 'string' || x.length === 0);
    const set = new Set(ids);
    R.add(`unique ${c.label} IDs`, bad.length === 0 && set.size === ids.length, `count=${ids.length} unique=${set.size} invalid=${bad.length}`);
    idSets[c.label] = set;
  }

  // C8 — reference field typing + resolution
  let xrefOk = true; const xrefBad = [];
  for (const rule of CROSSREF_RULES) {
    const obj = parsed[rule.file];
    if (!obj) { xrefOk = false; xrefBad.push(`${rule.file} not parsed`); continue; }
    const arr = Array.isArray(obj[rule.arrayKey]) ? obj[rule.arrayKey] : [];
    const target = rule.resolvesTo === 'source' ? idSets.source : idSets.claim;
    const requiredHere = REQUIRED_REF_FIELDS[rule.file] || [];
    for (const item of arr) {
      const owner = (item && typeof item === 'object' ? item[rule.ownerIdKey] : '?') || '?';
      for (const rk of rule.refKeys) {
        const val = item ? item[rk] : undefined;
        const chk = checkRefArray(val);
        if (chk.present && !chk.ok) { xrefOk = false; xrefBad.push(`${owner}.${rk}: ${chk.reason}`); continue; }
        if (!chk.present) {
          if (requiredHere.includes(rk)) { xrefOk = false; xrefBad.push(`${owner}.${rk}: required array field missing`); }
          continue;
        }
        for (const ref of val) {
          if (!target.has(ref)) { xrefOk = false; xrefBad.push(`${owner}.${rk}->${ref}: unresolved`); }
        }
      }
    }
  }
  R.add('reference fields are arrays of resolved non-empty string IDs', xrefOk, xrefBad.slice(0, 12).join(', '));

  const ok = R.checks.filter((c) => !c.ok).length === 0;
  return { ok, parsed };
}

// Lightweight ok-only package validity (used by evidence derivation).
export function isPackageValid(outDir) {
  const checks = [];
  const R = { checks, add(n, ok, d = '') { checks.push({ name: n, ok: !!ok, detail: d }); return ok; } };
  const { ok } = validatePackageDir(outDir, R);
  return { ok, checks };
}

export function researchPackagePresent(outDir) {
  return RESEARCH_FILES.some((f) => exists(join(outDir, f)));
}
