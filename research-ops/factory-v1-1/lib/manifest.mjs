// ResearchOps Factory V1.1 — MANIFEST parsing and verification.
// Canonical MANIFEST line format: "<sha256>  <bytes>  <filename>".

import { join } from 'node:path';
import { readBuf, sha256Hex, byteLength, exists } from './util.mjs';

const LINE_RE = /^([0-9a-f]{64})\s+(\d+)\s+(.+?)\s*$/;

// Parse hashed-file records from MANIFEST text. Ignores non-matching lines
// (headers, counts, boundary blocks).
export function parseManifest(text) {
  const records = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const m = LINE_RE.exec(raw);
    if (!m) continue;
    records.push({ sha256: m[1], bytes: Number(m[2]), file: m[3] });
  }
  return records;
}

// Verify every listed file against on-disk canonical bytes.
// Returns { ok, errors[] }. Does not mutate anything.
export function verifyManifest(dir, expectedFiles) {
  const errors = [];
  const manifestPath = join(dir, 'MANIFEST.txt');
  if (!exists(manifestPath)) {
    return { ok: false, errors: ['MANIFEST.txt missing'] };
  }
  const records = parseManifest(readBuf(manifestPath).toString('utf8'));
  const listed = new Set(records.map((r) => r.file));

  // Every expected hashed file must be listed exactly once.
  for (const f of expectedFiles) {
    const count = records.filter((r) => r.file === f).length;
    if (count === 0) errors.push(`MANIFEST missing entry for ${f}`);
    if (count > 1) errors.push(`MANIFEST has duplicate entry for ${f}`);
  }
  // No unexpected/self entries.
  for (const r of records) {
    if (r.file === 'MANIFEST.txt') errors.push('MANIFEST.txt must not hash itself');
    else if (!expectedFiles.includes(r.file)) errors.push(`MANIFEST lists unexpected file ${r.file}`);
  }

  for (const r of records) {
    if (r.file === 'MANIFEST.txt' || !expectedFiles.includes(r.file)) continue;
    const p = join(dir, r.file);
    if (!exists(p)) { errors.push(`MANIFEST references missing file ${r.file}`); continue; }
    const buf = readBuf(p);
    const actualBytes = byteLength(buf);
    const actualHash = sha256Hex(buf);
    if (actualBytes !== r.bytes) errors.push(`byte-size mismatch for ${r.file}: manifest=${r.bytes} actual=${actualBytes}`);
    if (actualHash !== r.sha256) errors.push(`sha256 mismatch for ${r.file}: manifest=${r.sha256} actual=${actualHash}`);
  }

  return { ok: errors.length === 0, errors, records };
}

// Build canonical MANIFEST text for a directory of hashed files.
export function buildManifest(dir, hashedFiles, header = {}) {
  const lines = [];
  const push = (s) => lines.push(s);
  push('ResearchOps Factory V1.1 — Research Package MANIFEST');
  push('====================================================');
  for (const [k, v] of Object.entries(header)) push(`${k}: ${v}`);
  push('');
  push('SHA256                                                            BYTES  FILE');
  for (const f of hashedFiles) {
    const buf = readBuf(join(dir, f));
    push(`${sha256Hex(buf)}  ${String(byteLength(buf)).padStart(5)}  ${f}`);
  }
  push('');
  return lines.join('\n') + '\n';
}
