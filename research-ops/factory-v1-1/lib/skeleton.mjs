// ResearchOps Factory V1.1 — canonical initial-skeleton content validation (V4-C5).
// Creation is validated by exact canonical BYTES (per-file SHA-256 after deterministic
// identity substitution), not filenames only. This rejects same-filename content
// substitution — safety-text removal, added production-authorization language, changed
// PR behaviour, or altered .gitkeep bytes — as well as symlink/executable/hidden
// payloads. Legitimate country/exchange/task substitution flows through renderSkeleton.

import { createHash } from 'node:crypto';
import { renderSkeleton } from './create.mjs';

// Apply the same normalization writeCanonical uses (LF endings, single trailing LF).
export function canonicalizeText(text) {
  let out = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
export function canonicalSkeletonHashes(opts) {
  const render = renderSkeleton(opts);
  const map = {};
  for (const [rel, content] of Object.entries(render)) map[rel] = sha256(Buffer.from(canonicalizeText(content), 'utf8'));
  return map;
}

// Safety constraints that generated contracts/prompts MUST retain (case-insensitive
// substring presence). Removing any of these fails V4-C5.
const REQUIRED_SAFETY = {
  '00-contract/DEEP_RESEARCH_PROMPT.md': ['official-source-first', 'authorization boundary', 'production', 'deploy'],
};

// Validate the provided head skeleton files against the canonical render.
// headFiles: { <task-root-relative path>: { bytes: Buffer, mode?: number, symlink?: bool } }
// opts: the deterministic identity used to render (taskId, country/exchange/batch/priority, createdAt).
// Returns { ok, violations }.
export function validateSkeletonContent(headFiles, opts) {
  const v = [];
  const render = renderSkeleton(opts);
  const expectedHashes = canonicalSkeletonHashes(opts);
  const expectedRels = new Set(Object.keys(render));
  const gotRels = new Set(Object.keys(headFiles || {}));

  for (const rel of gotRels) if (!expectedRels.has(rel)) v.push(`${rel}: not part of the deterministic factory skeleton`);
  for (const rel of expectedRels) if (!gotRels.has(rel)) v.push(`${rel}: required skeleton file missing`);

  for (const [rel, f] of Object.entries(headFiles || {})) {
    if (!expectedRels.has(rel)) continue;
    if (f.symlink) { v.push(`${rel}: symlink not allowed in skeleton`); continue; }
    if (f.mode !== undefined && (f.mode & 0o111) !== 0) { v.push(`${rel}: executable mode not allowed in skeleton`); continue; }
    const gotHash = sha256(f.bytes);
    if (gotHash !== expectedHashes[rel]) { v.push(`${rel}: content is not the canonical deterministic skeleton (byte mismatch)`); continue; }
  }

  // Belt-and-braces safety-text presence (independent of the hash, for clear reporting).
  for (const [rel, needles] of Object.entries(REQUIRED_SAFETY)) {
    const f = headFiles && headFiles[rel];
    if (!f) continue;
    const text = f.bytes.toString('utf8').toLowerCase();
    for (const n of needles) if (!text.includes(n.toLowerCase())) v.push(`${rel}: required safety constraint "${n}" is missing`);
  }
  return { ok: v.length === 0, violations: v };
}
