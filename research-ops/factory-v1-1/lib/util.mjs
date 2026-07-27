// ResearchOps Factory V1.1 — deterministic, dependency-free utilities.
// Node 20 ESM, built-in modules only.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, sep, isAbsolute, normalize } from 'node:path';

export function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function byteLength(buf) {
  return Buffer.isBuffer(buf) ? buf.length : Buffer.byteLength(buf, 'utf8');
}

export function hasBOM(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

export function hasCR(buf) {
  return buf.includes(0x0d);
}

// V2-C9 — strict, fatal UTF-8 validity. Returns true only if every byte is valid
// UTF-8 (no replacement-character substitution). Rejects lone/invalid bytes that
// `readFileSync(path,'utf8')` would silently decode to U+FFFD.
const FATAL_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
export function isValidUtf8(buf) {
  try { FATAL_UTF8.decode(buf); return true; }
  catch { return false; }
}

// Read a file as a Buffer, failing closed.
export function readBuf(path) {
  return readFileSync(path);
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Canonical write: UTF-8 without BOM, LF endings, trailing newline.
export function writeCanonical(path, text) {
  let out = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!out.endsWith('\n')) out += '\n';
  writeFileSync(path, Buffer.from(out, 'utf8'));
}

export function writeJson(path, obj) {
  writeCanonical(path, JSON.stringify(obj, null, 2));
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

// Flat list of regular file names directly inside dir (no recursion).
export function listFlatFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => {
      const st = lstatSync(join(dir, name));
      return st.isFile();
    })
    .sort();
}

// Detect symlinks / non-regular entries anywhere under dir (recursive).
export function findUnsafeEntries(dir) {
  const bad = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) { bad.push({ path: p, reason: 'symlink' }); continue; }
      if (st.isDirectory()) { walk(p); continue; }
      if (!st.isFile()) { bad.push({ path: p, reason: 'non-regular-file' }); continue; }
      // executable bit (best-effort; Windows checkouts usually report 0)
      if ((st.mode & 0o111) !== 0) bad.push({ path: p, reason: 'executable-bit' });
    }
  };
  walk(dir);
  return bad;
}

// Reject path traversal / absolute components. Returns a safe joined path or throws.
export function safeSubpath(root, sub) {
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new Error(`unsafe path: empty`);
  }
  if (isAbsolute(sub) || /^[A-Za-z]:/.test(sub)) {
    throw new Error(`unsafe path: absolute not allowed: ${sub}`);
  }
  const parts = sub.split(/[\\/]/);
  for (const part of parts) {
    if (part === '..') throw new Error(`unsafe path: traversal not allowed: ${sub}`);
    if (part === '' ) continue;
    if (part === '.') continue;
  }
  const joined = normalize(join(root, sub));
  const rootN = normalize(root.endsWith(sep) ? root : root + sep);
  if (!normalize(joined + sep).startsWith(rootN) && normalize(joined) !== normalize(root)) {
    throw new Error(`unsafe path: escapes root: ${sub}`);
  }
  return joined;
}

export function exists(path) {
  return existsSync(path);
}
