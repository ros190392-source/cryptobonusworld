#!/usr/bin/env node
// ResearchOps Factory V1.1 — Correction 035 fixture wrapper.
// Runs 16 dual-output fixtures, then the immutable 301-fixture approved-base suite
// with one exact test-helper adaptation so the historical tests exercise the new
// generated review contract. No tracked files are created.

import {
  chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { checkStageTransition } from '../lib/stage.mjs';
import { validateMarker, REVIEW_MARKER } from '../lib/markers.mjs';

const TASK_ID = 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
const LEGACY_COMMIT = '59cafe8179cde29e248025738c465a7c676cc8e5';
const LEGACY_PATH = 'research-ops/factory-v1-1/fixtures/run.mjs';
const EXPECTED_LEGACY_RESULT = 'FIXTURES: 301 passed, 0 failed';

let pass = 0; let fail = 0;
const failures = []; const roots = [];
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  [PASS] ${name}`); }
  else { fail += 1; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}
function makeReviewDir() {
  const root = mkdtempSync(join(tmpdir(), 'rops-035-')); roots.push(root);
  const dir = join(root, '50-source-truth-review'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '.gitkeep'), '');
  return { root, dir };
}
function writeJsonMarker(dir) {
  writeFileSync(join(dir, 'SOURCE_TRUTH_REVIEW.json'), `${JSON.stringify({ taskId: TASK_ID, outcome: 'SOURCE_TRUTH_REVIEWED' }, null, 2)}\n`);
}
function writeMarkdown(dir, value = '# Source Truth Review\n') {
  writeFileSync(join(dir, 'SOURCE_TRUTH_REVIEW.md'), value);
}
function reviewRecords(files) {
  return [
    ...files.map((f) => ({ status: 'A', rel: `50-source-truth-review/${f}` })),
    { status: 'M', rel: 'TASK_STATE.json' },
  ];
}

console.log('ResearchOps Factory V1.1 — Correction 035 dual-output fixtures');

{
  const r = checkStageTransition({
    records: reviewRecords(['SOURCE_TRUTH_REVIEW.json', 'SOURCE_TRUTH_REVIEW.md']),
    baseState: 'PACKAGE_VALIDATED', headState: 'SOURCE_TRUTH_REVIEWED', taskExistsAtBase: true,
  });
  check('035-1 exact JSON + Markdown review pair accepted', r.ok, r.violations.join('; '));
}
{
  const r = checkStageTransition({ records: reviewRecords(['SOURCE_TRUTH_REVIEW.json']), baseState: 'PACKAGE_VALIDATED', headState: 'SOURCE_TRUTH_REVIEWED', taskExistsAtBase: true });
  check('035-2 JSON-only review transition rejected', !r.ok && r.violations.some((v) => v.includes('SOURCE_TRUTH_REVIEW.md')));
}
{
  const r = checkStageTransition({ records: reviewRecords(['SOURCE_TRUTH_REVIEW.md']), baseState: 'PACKAGE_VALIDATED', headState: 'SOURCE_TRUTH_REVIEWED', taskExistsAtBase: true });
  check('035-3 Markdown-only review transition rejected', !r.ok && r.violations.some((v) => v.includes('SOURCE_TRUTH_REVIEW.json')));
}
{
  const r = checkStageTransition({ records: reviewRecords(['SOURCE_TRUTH_REVIEW.json', 'SOURCE_TRUTH_REVIEW.md', 'EXTRA.txt']), baseState: 'PACKAGE_VALIDATED', headState: 'SOURCE_TRUTH_REVIEWED', taskExistsAtBase: true });
  check('035-4 extra review artifact rejected', !r.ok);
}
{
  const r = checkStageTransition({ records: [{ status: 'M', rel: 'TASK_STATE.json' }], baseState: 'RESEARCH_CAPTURED', headState: 'PACKAGE_VALIDATED', taskExistsAtBase: true });
  check('035-5 pure RESEARCH_CAPTURED -> PACKAGE_VALIDATED remains valid', r.ok, r.violations.join('; '));
}
{
  const r = checkStageTransition({ records: [{ status: 'M', rel: 'TASK_STATE.json' }], baseState: 'SOURCE_TRUTH_REVIEWED', headState: 'CORRECTION_REQUIRED', taskExistsAtBase: true });
  check('035-6 state-only SOURCE_TRUTH_REVIEWED -> CORRECTION_REQUIRED remains valid', r.ok, r.violations.join('; '));
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeMarkdown(dir);
  const r = validateMarker(root, REVIEW_MARKER, TASK_ID);
  check('035-7 canonical JSON + Markdown marker accepted', r.ok, r.reason);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir);
  const r = validateMarker(root, REVIEW_MARKER, TASK_ID);
  check('035-8 marker validator rejects missing Markdown', !r.ok && r.reason.includes('SOURCE_TRUTH_REVIEW.md'));
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeMarkdown(dir, '');
  check('035-9 zero-byte Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeMarkdown(dir, '# Review\r\n');
  check('035-10 CR Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeFileSync(join(dir, 'SOURCE_TRUTH_REVIEW.md'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# Review\n')]));
  check('035-11 BOM Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeFileSync(join(dir, 'SOURCE_TRUTH_REVIEW.md'), Buffer.from([0x23, 0x20, 0x52, 0x07, 0x0a]));
  check('035-12 forbidden-control Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeMarkdown(dir); writeFileSync(join(dir, 'EXTRA.txt'), 'x\n');
  check('035-13 validator rejects extra review-stage file', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); writeMarkdown(dir); chmodSync(join(dir, 'SOURCE_TRUTH_REVIEW.md'), 0o755);
  check('035-14 executable Markdown rejected', process.platform === 'win32' || !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir); mkdirSync(join(dir, 'SOURCE_TRUTH_REVIEW.md'));
  check('035-15 non-regular Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
}
{
  const { root, dir } = makeReviewDir(); writeJsonMarker(dir);
  if (process.platform === 'win32') check('035-16 symlink Markdown rejected (platform-safe)', true, 'symlink fixture skipped on Windows');
  else {
    const target = join(root, 'target.md'); writeFileSync(target, '# Review\n'); symlinkSync(target, join(dir, 'SOURCE_TRUTH_REVIEW.md'));
    check('035-16 symlink Markdown rejected', !validateMarker(root, REVIEW_MARKER, TASK_ID).ok);
  }
}

for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }
console.log(`\nFIXTURES 035: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES 035:'); for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

// Execute the immutable approved-base suite against the corrected libraries. Its helper
// originally wrote only the JSON review marker; adapt exactly that one source line to the
// generated dual-output contract. Any source drift or duplicate match fails closed.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim();
let legacy = execFileSync('git', ['show', `${LEGACY_COMMIT}:${LEGACY_PATH}`], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const needle = "  writeJson(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'), { taskId, outcome: 'SOURCE_TRUTH_REVIEWED' });";
if (legacy.indexOf(needle) < 0 || legacy.indexOf(needle) !== legacy.lastIndexOf(needle)) {
  console.error('Correction 035 fixture wrapper: approved-base helper needle missing or ambiguous');
  process.exit(1);
}
legacy = legacy.replace(needle, `${needle}\n  writeCanonical(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.md'), '# Source Truth Review\\n');`);
const legacyTmp = join(here, `.run-legacy-035-${process.pid}.mjs`);
let legacyOut = '';
try {
  writeFileSync(legacyTmp, legacy, 'utf8');
  legacyOut = execFileSync(process.execPath, [legacyTmp], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: process.env });
  process.stdout.write(legacyOut);
} catch (e) {
  if (e.stdout) process.stdout.write(String(e.stdout));
  if (e.stderr) process.stderr.write(String(e.stderr));
  console.error(`Correction 035 fixture wrapper: legacy suite failed (${e.message})`);
  process.exit(1);
} finally {
  try { rmSync(legacyTmp, { force: true }); } catch { /* ignore */ }
}
if (!legacyOut.includes(EXPECTED_LEGACY_RESULT)) {
  console.error(`Correction 035 fixture wrapper: expected legacy result not found: ${EXPECTED_LEGACY_RESULT}`);
  process.exit(1);
}
console.log('\nFIXTURES TOTAL: 317 passed, 0 failed');
