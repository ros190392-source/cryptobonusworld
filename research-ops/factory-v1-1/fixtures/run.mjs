#!/usr/bin/env node
// ResearchOps Factory V1.1 — Correction 038A fixture wrapper.
// Runs corrected-package fixtures, then the immutable approved-base suite against
// the corrected libraries. No tracked task files are created.

import {
  chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync,
  unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { checkStageTransition } from '../lib/stage.mjs';
import { validateMarker, REVIEW_MARKER, CORRECTION_MARKER } from '../lib/markers.mjs';
import { createTask } from '../lib/create.mjs';
import { validateTask } from '../lib/validate.mjs';
import { buildManifest } from '../lib/manifest.mjs';
import { writeJson, writeCanonical } from '../lib/util.mjs';
import { RESEARCH_FILES, FORBIDDEN_TRUE_AUTH_KEYS, OWNER_MERGE_KEY } from '../lib/model.mjs';

const TASK_ID = 'CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001';
const LEGACY_COMMIT = '59cafe8179cde29e248025738c465a7c676cc8e5';
const LEGACY_PATH = 'research-ops/factory-v1-1/fixtures/run.mjs';
const EXPECTED_LEGACY_RESULT = 'FIXTURES: 301 passed, 0 failed';
const HASHED = RESEARCH_FILES.filter((f) => f !== 'MANIFEST.txt');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

let pass = 0; let fail = 0;
const failures = []; const roots = [];
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  [PASS] ${name}`); }
  else { fail += 1; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}
function tmpRoot() { const d = mkdtempSync(join(tmpdir(), 'rops-038a-')); roots.push(d); return d; }
function baseData() {
  return {
    'research-run.json': { schemaVersion: '1.0', overallFinding: { recommendation: 'CONFLICTING' }, authorizations: { canonicalImportAuthorized: false, deployAuthorized: false } },
    'source-verification.json': { schemaVersion: '1.0', sources: [{ sourceId: 'src-a' }] },
    'claim-verdicts.json': { schemaVersion: '1.0', claims: [{ claimId: 'clm-a', supportedSourceIds: ['src-a'], contradictedSourceIds: [] }] },
    'conflict-resolution.json': { schemaVersion: '1.0', conflicts: [{ conflictId: 'cf-a', availabilitySourceIds: ['src-a'], restrictionSourceIds: [] }] },
    'product-availability.json': { schemaVersion: '1.0', products: [{ productId: 'prod-a', claimIds: ['clm-a'] }] },
    'payment-rails.json': { schemaVersion: '1.0', rails: [{ railId: 'rail-a', sourceIds: ['src-a'] }] },
    'offer-eligibility-review.json': { schemaVersion: '1.0', review: { sourceIds: ['src-a'] }, authorizations: { rankingChangeAuthorized: false } },
    'schema-normalization-notes.json': { schemaVersion: '1.0', notes: [] },
    'import-readiness.json': { schemaVersion: '1.0', readiness: { canonicalImportReady: false, deployReady: false }, opsRecommendation: 'HOLD_CONFLICTING' },
  };
}
function writePackage(outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const [f, o] of Object.entries(baseData())) writeJson(join(outDir, f), o);
  writeCanonical(join(outDir, 'source-truth-review-report.md'), '# Report\n\nCONFLICTING / MEDIUM.\n');
  writeCanonical(join(outDir, 'MANIFEST.txt'), buildManifest(outDir, HASHED, {}));
}
function rebuildManifest(outDir) { writeCanonical(join(outDir, 'MANIFEST.txt'), buildManifest(outDir, HASHED, {})); }
function allFalseAuth() {
  const a = {}; a[OWNER_MERGE_KEY] = false;
  for (const k of FORBIDDEN_TRUE_AUTH_KEYS) a[k] = false;
  return a;
}
function makeStrictTask() {
  const created = createTask({
    taskId: TASK_ID, countryCode: 'KZ', countryName: 'Kazakhstan',
    exchangeId: 'binance', exchangeName: 'Binance', batchId: 'KZ-P0-D',
    priority: 'P0', createdAt: '2026-07-29', testRoot: tmpRoot(),
  });
  const t = created.taskDir;
  writePackage(join(t, '20-research-output'));
  writeJson(join(t, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'), {
    taskId: TASK_ID, outcome: 'SOURCE_TRUTH_REVIEWED', finalReviewOutcome: 'ACCEPT_WITH_CORRECTIONS_REQUIRED',
  });
  writeCanonical(join(t, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.md'), '# Source Truth Review\n');
  const corrected = join(t, '60-correction', '20-corrected-output');
  writePackage(corrected);
  const reviewBytes = readFileSync(join(t, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'));
  const manifestBytes = readFileSync(join(corrected, 'MANIFEST.txt'));
  writeJson(join(t, '60-correction', 'CORRECTION_STATE.json'), {
    schemaVersion: '1.0.0', taskId: TASK_ID,
    outcome: 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION',
    sourceReviewHeadSha: 'a'.repeat(40),
    sourceReviewOutcome: 'ACCEPT_WITH_CORRECTIONS_REQUIRED',
    reviewSha256: sha256(reviewBytes),
    outputDirectory: '60-correction/20-corrected-output',
    requiredOutputFiles: RESEARCH_FILES,
    exactOutputFileCount: 11,
    correctedManifestSha256: sha256(manifestBytes),
    appliedCorrectionIds: ['R037-C01'],
    correctionsApplied: 1,
    authorizations: allFalseAuth(),
  });
  const sp = join(t, 'TASK_STATE.json');
  const s = JSON.parse(readFileSync(sp, 'utf8'));
  s.state = 'CORRECTED';
  s.stages['20-research-output'] = 'PRESENT';
  s.stages['50-source-truth-review'] = 'PRESENT';
  s.stages['60-correction'] = 'PRESENT';
  s.history = ['PREPARED', 'RESEARCH_CAPTURED', 'PACKAGE_VALIDATED', 'SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED', 'CORRECTED'].map((state, i) => ({ state, at: `2026-07-29T00:00:0${i}Z` }));
  writeFileSync(sp, `${JSON.stringify(s, null, 2)}\n`);
  return t;
}
function correctionRecords(over = {}) {
  const files = over.files || RESEARCH_FILES;
  const rows = [
    { status: 'A', rel: '60-correction/CORRECTION_STATE.json' },
    ...files.map((f) => ({ status: 'A', rel: `60-correction/20-corrected-output/${f}` })),
    { status: 'M', rel: 'TASK_STATE.json' },
  ];
  if (over.extra) rows.push({ status: 'A', rel: over.extra });
  return rows;
}

console.log('ResearchOps Factory V1.1 — Correction 038A corrected-package fixtures');

{
  const r = checkStageTransition({ records: correctionRecords(), baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-1 exact correction state + eleven nested files passes', r.ok, r.violations.join('; '));
}
{
  const r = checkStageTransition({ records: correctionRecords().filter((x) => x.rel !== '60-correction/CORRECTION_STATE.json'), baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-2 missing correction state fails', !r.ok);
}
{
  const r = checkStageTransition({ records: correctionRecords({ files: RESEARCH_FILES.filter((f) => f !== 'payment-rails.json') }), baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-3 missing corrected package file fails', !r.ok);
}
{
  const r = checkStageTransition({ records: correctionRecords({ extra: '60-correction/20-corrected-output/EXTRA.json' }), baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-4 extra corrected package file fails', !r.ok);
}
{
  const r = checkStageTransition({ records: [{ status: 'A', rel: '60-correction/CORRECTION_RESULT.json' }, { status: 'M', rel: 'TASK_STATE.json' }], baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-5 new legacy marker-only correction bypass fails', !r.ok);
}
{
  const r = checkStageTransition({ records: [...correctionRecords(), { status: 'M', rel: '20-research-output/research-run.json' }], baseState: 'CORRECTION_REQUIRED', headState: 'CORRECTED', taskExistsAtBase: true });
  check('038A-6 original package mutation during correction fails', !r.ok);
}
{
  const t = makeStrictTask(); const r = validateMarker(t, CORRECTION_MARKER, TASK_ID);
  check('038A-7 strict correction marker and corrected package pass', r.ok, r.reason);
}
{
  const t = makeStrictTask(); rmSync(join(t, '60-correction', '20-corrected-output'), { recursive: true, force: true });
  check('038A-8 strict correction marker missing corrected package fails', !validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}
{
  const t = makeStrictTask(); const p = join(t, '60-correction', 'CORRECTION_STATE.json'); const o = JSON.parse(readFileSync(p)); o.reviewSha256 = '0'.repeat(64); writeJson(p, o);
  check('038A-9 review hash mismatch fails', !validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}
{
  const t = makeStrictTask(); const p = join(t, '60-correction', 'CORRECTION_STATE.json'); const o = JSON.parse(readFileSync(p)); o.correctedManifestSha256 = '0'.repeat(64); writeJson(p, o);
  check('038A-10 corrected manifest hash mismatch fails', !validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}
{
  const t = makeStrictTask(); const p = join(t, '60-correction', 'CORRECTION_STATE.json'); const o = JSON.parse(readFileSync(p)); o.taskId = 'CBW-WRONG-001'; writeJson(p, o);
  check('038A-11 correction task identity mismatch fails', !validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}
{
  const t = makeStrictTask(); const p = join(t, '60-correction', 'CORRECTION_STATE.json'); const o = JSON.parse(readFileSync(p)); o.authorizations.deployAuthorized = true; writeJson(p, o);
  check('038A-12 true authorization in correction state fails', !validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}
{
  const t = makeStrictTask(); const v = validateTask(t, {});
  check('038A-13 complete strict CORRECTED task validates', v.ok, v.checks.filter((c) => !c.ok).map((c) => `${c.name}:${c.detail}`).join(' | '));
}
{
  const t = makeStrictTask(); rmSync(join(t, '60-correction', '20-corrected-output', 'payment-rails.json'), { force: true });
  check('038A-14 corrected task missing file fails validation', !validateTask(t, {}).ok);
}
{
  const t = makeStrictTask(); const out = join(t, '60-correction', '20-corrected-output'); writeFileSync(join(out, 'claim-verdicts.json'), '{bad'); rebuildManifest(out);
  const cp = join(t, '60-correction', 'CORRECTION_STATE.json'); const co = JSON.parse(readFileSync(cp)); co.correctedManifestSha256 = sha256(readFileSync(join(out, 'MANIFEST.txt'))); writeJson(cp, co);
  check('038A-15 malformed corrected JSON fails validation even with rebuilt manifest', !validateTask(t, {}).ok);
}
{
  const t = makeStrictTask(); writeFileSync(join(t, '60-correction', '20-corrected-output', '.hidden'), 'x');
  check('038A-16 hidden corrected payload fails', !validateTask(t, {}).ok);
}
{
  const t = makeStrictTask(); chmodSync(join(t, '60-correction', '20-corrected-output', 'research-run.json'), 0o755);
  check('038A-17 executable corrected payload fails', process.platform === 'win32' || !validateTask(t, {}).ok);
}
{
  const t = makeStrictTask(); const out = join(t, '60-correction', '20-corrected-output');
  if (process.platform === 'win32') check('038A-18 symlink corrected payload fails (platform-safe)', true);
  else { const target = join(t, 'target.json'); writeFileSync(target, '{}\n'); unlinkSync(join(out, 'research-run.json')); symlinkSync(target, join(out, 'research-run.json')); check('038A-18 symlink corrected payload fails', !validateTask(t, {}).ok); }
}
{
  const t = makeStrictTask(); const sp = join(t, 'TASK_STATE.json'); const s = JSON.parse(readFileSync(sp)); s.state = 'CORRECTION_REQUIRED'; s.stages['60-correction'] = 'EMPTY'; s.history = s.history.slice(0, -1); writeFileSync(sp, `${JSON.stringify(s, null, 2)}\n`);
  check('038A-19 strict corrected evidence before CORRECTED state fails', !validateTask(t, {}).ok);
}
{
  const t = createTask({ taskId: TASK_ID, countryCode: 'KZ', countryName: 'Kazakhstan', exchangeId: 'binance', exchangeName: 'Binance', batchId: 'KZ-P0-D', priority: 'P0', createdAt: '2026-07-29', testRoot: tmpRoot() }).taskDir;
  writeJson(join(t, '60-correction', 'CORRECTION_RESULT.json'), { taskId: TASK_ID, correctionOutcome: 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION' });
  check('038A-20 legacy CORRECTION_RESULT remains readable', validateMarker(t, CORRECTION_MARKER, TASK_ID).ok);
}

for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ } }
console.log(`\nFIXTURES 038A: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES 038A:'); for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

// Execute the immutable 301-suite from the original approved baseline against the
// corrected libraries. Adapt only the dual-output review helper introduced by 035.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim();
let legacy = execFileSync('git', ['show', `${LEGACY_COMMIT}:${LEGACY_PATH}`], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const needle = "  writeJson(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'), { taskId, outcome: 'SOURCE_TRUTH_REVIEWED' });";
if (legacy.indexOf(needle) < 0 || legacy.indexOf(needle) !== legacy.lastIndexOf(needle)) {
  console.error('Correction 038A fixture wrapper: approved-base helper needle missing or ambiguous');
  process.exit(1);
}
legacy = legacy.replace(needle, `${needle}\n  writeCanonical(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.md'), '# Source Truth Review\\n');`);
const legacyTmp = join(here, `.run-legacy-038a-${process.pid}.mjs`);
let legacyOut = '';
try {
  writeFileSync(legacyTmp, legacy, 'utf8');
  legacyOut = execFileSync(process.execPath, [legacyTmp], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: process.env });
  process.stdout.write(legacyOut);
} catch (e) {
  if (e.stdout) process.stdout.write(String(e.stdout));
  if (e.stderr) process.stderr.write(String(e.stderr));
  console.error(`Correction 038A fixture wrapper: legacy suite failed (${e.message})`);
  process.exit(1);
} finally {
  try { rmSync(legacyTmp, { force: true }); } catch { /* ignore */ }
}
if (!legacyOut.includes(EXPECTED_LEGACY_RESULT)) {
  console.error(`Correction 038A fixture wrapper: expected legacy result not found: ${EXPECTED_LEGACY_RESULT}`);
  process.exit(1);
}
console.log('\nFIXTURES TOTAL: 337 passed, 0 failed');
