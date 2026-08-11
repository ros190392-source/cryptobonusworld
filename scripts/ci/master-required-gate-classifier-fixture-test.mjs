#!/usr/bin/env node
// Real-git fixture suite for the master required gate classifier (issue #366).
//
// The contract test exercises the pure helpers. This suite exercises the
// ACTUAL resolver against a throwaway git repository, so genuine git
// delete/rename/add behaviour is observed rather than assumed. It is the
// regression guard for the rename fail-open defect: with rename detection
// enabled, `git diff --name-only` reports only a rename's destination, so
// renaming a material source file to a non-material destination would present
// a single harmless path and hide the material deletion.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  resolveChangedPaths,
  classifyChangedPaths,
} from './master-required-gate-classify.mjs';

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const repo = mkdtempSync(join(tmpdir(), 'cbw-gate-fixture-'));
const git = (...args) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function write(relPath, contents) {
  const full = join(repo, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents, 'utf8');
}

function commit(message) {
  git('add', '-A');
  git('-c', 'user.name=cbw-fixture', '-c', 'user.email=fixture@cbw.local', 'commit', '-m', message);
  return git('rev-parse', 'HEAD').trim();
}

// Classify a real base..head range through the production resolver.
function classifyRange(base, head) {
  const paths = resolveChangedPaths(base, head, { cwd: repo });
  return { paths: paths ?? [], result: classifyChangedPaths(paths) };
}

try {
  git('init', '--initial-branch=master');
  git('config', 'commit.gpgsign', 'false');

  // --- baseline commit: material + allowlisted files side by side ------------
  write('README.md', 'readme v1\n');
  write('AUDIT_REPORT.md', 'audit v1\n');
  write('src/foo.ts', 'export const foo = 1;\n');
  write('src/bar.ts', 'export const bar = 1;\n');
  write('scripts/portal/contracts-test.mjs', '// portal\n');
  const base = commit('baseline');

  // --- 1. allowlisted-only edit -> non-material ------------------------------
  write('README.md', 'readme v2\n');
  let head = commit('docs: touch readme');
  let { paths, result } = classifyRange(base, head);
  check('readme-only edit resolves exactly one path', paths.length === 1, paths.join(','));
  check('readme-only edit is non-material', result.material === false, result.reason);

  // --- 2. two allowlisted files edited -> non-material -----------------------
  write('AUDIT_REPORT.md', 'audit v2\n');
  head = commit('docs: touch audit report');
  ({ result } = classifyRange(base, head));
  check('allowlisted-only multi-file edit is non-material', result.material === false, result.reason);

  // --- 3. unknown new root file -> MATERIAL ----------------------------------
  const allowlistedOnlyHead = head;
  write('unknown-root-file.mjs', '// nobody enumerated this\n');
  head = commit('chore: add unknown root file');
  ({ paths, result } = classifyRange(allowlistedOnlyHead, head));
  check('unknown root file is resolved', paths.includes('unknown-root-file.mjs'), paths.join(','));
  check('unknown root file is MATERIAL', result.material === true, result.reason);

  // --- 4. unknown path mixed with allowlisted path -> MATERIAL ---------------
  const mixedBase = head;
  write('README.md', 'readme v3\n');
  write('config/new-config.mjs', 'export default {};\n');
  head = commit('chore: mixed allowlisted + unknown config');
  ({ paths, result } = classifyRange(mixedBase, head));
  check('mixed diff resolves both paths', paths.length === 2, paths.join(','));
  check('mixed allowlisted + unknown diff is MATERIAL', result.material === true, result.reason);

  // --- 5. real deletion of a material file -> MATERIAL -----------------------
  const deleteBase = head;
  rmSync(join(repo, 'src/bar.ts'));
  head = commit('chore: delete src/bar.ts');
  ({ paths, result } = classifyRange(deleteBase, head));
  check('deleted material file appears in the diff', paths.includes('src/bar.ts'), paths.join(','));
  check('deleted src/** is MATERIAL', result.material === true, result.reason);

  // --- 6. THE RENAME FAIL-OPEN: src/** -> docs/** ----------------------------
  const renameBase = head;
  mkdirSync(join(repo, 'docs'), { recursive: true }); // git mv needs the destination dir
  git('mv', 'src/foo.ts', 'docs/foo.md');
  head = commit('chore: rename src/foo.ts -> docs/foo.md');
  ({ paths, result } = classifyRange(renameBase, head));
  check(
    'material->non-material rename exposes the source deletion',
    paths.includes('src/foo.ts'),
    paths.join(','),
  );
  check(
    'material->non-material rename exposes the destination addition',
    paths.includes('docs/foo.md'),
    paths.join(','),
  );
  check('material->non-material rename is MATERIAL', result.material === true, result.reason);

  // Prove the fix is load-bearing: with rename detection on, git hides the
  // source path entirely. This is exactly the reviewed defect.
  const withRenameDetection = git(
    'diff', '--find-renames', '--name-only', renameBase, head,
  ).split('\n').map((line) => line.trim()).filter(Boolean);
  check(
    'rename detection would have hidden the material source path',
    !withRenameDetection.includes('src/foo.ts'),
    withRenameDetection.join(','),
  );
  check(
    '--no-renames recovers strictly more paths than rename detection',
    paths.length > withRenameDetection.length,
    `${paths.length} vs ${withRenameDetection.length}`,
  );

  // --- 7. rename within src/** -> MATERIAL -----------------------------------
  const innerRenameBase = head;
  write('src/baz.ts', 'export const baz = 1;\n');
  commit('chore: add src/baz.ts');
  const innerBase = git('rev-parse', 'HEAD').trim();
  git('mv', 'src/baz.ts', 'src/qux.ts');
  head = commit('chore: rename within src');
  ({ paths, result } = classifyRange(innerBase, head));
  check('rename within src/** is MATERIAL', result.material === true, result.reason);
  check(
    'rename within src/** exposes both sides',
    paths.includes('src/baz.ts') && paths.includes('src/qux.ts'),
    paths.join(','),
  );
  void innerRenameBase;

  // --- 8. rename allowlisted -> allowlisted stays non-material ---------------
  const allowRenameBase = git('rev-parse', 'HEAD').trim();
  git('mv', 'AUDIT_REPORT.md', 'CryptoBonusWorld_Master_Architecture.md');
  head = commit('docs: rename one allowlisted doc onto another');
  ({ paths, result } = classifyRange(allowRenameBase, head));
  check(
    'allowlisted->allowlisted rename exposes both sides',
    paths.includes('AUDIT_REPORT.md') &&
      paths.includes('CryptoBonusWorld_Master_Architecture.md'),
    paths.join(','),
  );
  check(
    'allowlisted->allowlisted rename is non-material (both sides allowlisted)',
    result.material === false,
    result.reason,
  );

  // --- 9. rename allowlisted -> unlisted destination -> MATERIAL -------------
  const outRenameBase = git('rev-parse', 'HEAD').trim();
  git('mv', 'README.md', 'docs/README.md');
  head = commit('docs: move readme into docs/');
  ({ result } = classifyRange(outRenameBase, head));
  check('allowlisted->unlisted rename is MATERIAL', result.material === true, result.reason);

  // --- 10. git resolution failures -> MATERIAL -------------------------------
  check(
    'unknown base sha resolves to null (MATERIAL)',
    resolveChangedPaths('0000000000000000000000000000000000000000', head, { cwd: repo }) === null,
  );
  check(
    'garbage revs resolve to null (MATERIAL)',
    resolveChangedPaths('not-a-rev', 'also-not-a-rev', { cwd: repo }) === null,
  );
  check(
    'non-repo cwd resolves to null (MATERIAL)',
    resolveChangedPaths(base, head, { cwd: tmpdir() }) === null,
  );
  check('missing BASE_SHA resolves to null (MATERIAL)', resolveChangedPaths('', head, { cwd: repo }) === null);
  check('missing HEAD_SHA resolves to null (MATERIAL)', resolveChangedPaths(base, '', { cwd: repo }) === null);
  check(
    'missing both env shas resolves to null (MATERIAL)',
    resolveChangedPaths(undefined, undefined, { cwd: repo }) === null,
  );
  const nullClassification = classifyChangedPaths(
    resolveChangedPaths('not-a-rev', 'also-not-a-rev', { cwd: repo }),
  );
  check('failed resolution classifies MATERIAL', nullClassification.material === true);

  // --- 11. empty diff (identical trees) -> MATERIAL --------------------------
  check(
    'identical base/head resolves to null (MATERIAL)',
    resolveChangedPaths(head, head, { cwd: repo }) === null,
  );
  check(
    'empty diff classifies MATERIAL',
    classifyChangedPaths(resolveChangedPaths(head, head, { cwd: repo })).material === true,
  );

  // --- 12. unusual filename is not mangled into a false allowlist hit --------
  const oddBase = head;
  write('weird name with spaces.mjs', '// odd\n');
  head = commit('chore: odd filename');
  ({ paths, result } = classifyRange(oddBase, head));
  check(
    'odd filename survives -z parsing unquoted',
    paths.includes('weird name with spaces.mjs'),
    paths.join(','),
  );
  check('odd filename is MATERIAL', result.material === true, result.reason);
} finally {
  rmSync(repo, { recursive: true, force: true });
}

// --- 13. RAW WHITESPACE FILENAMES (real git) ---------------------------------
//
// Regression guard for the reviewed fail-open: `normalizePath` used to trim, so
// the legal Git filename `README.md ` (trailing space) collapsed onto the
// allowlisted `README.md`. A material, unreviewed file inherited non-material
// status and the whole heavy matrix would skip.
//
// These fixtures are built INDEX-ONLY (hash-object + update-index + write-tree
// + commit-tree, never a working-tree checkout). Windows cannot create a file
// whose name ends in a space and cannot represent a newline in a filename, but
// Git objects can hold both — and Git on Linux will happily hand such a path to
// this classifier. Building through the index reproduces exactly what the
// resolver sees on the CI runner, on every platform.
const wsRepo = mkdtempSync(join(tmpdir(), 'cbw-gate-ws-'));
try {
  const wsGit = (...args) =>
    execFileSync('git', args, { cwd: wsRepo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const identity = {
    ...process.env,
    GIT_AUTHOR_NAME: 'cbw-fixture',
    GIT_AUTHOR_EMAIL: 'fixture@cbw.local',
    GIT_COMMITTER_NAME: 'cbw-fixture',
    GIT_COMMITTER_EMAIL: 'fixture@cbw.local',
  };

  wsGit('init', '--initial-branch=master');
  // Git for Windows refuses to index a path with a trailing space/dot unless
  // NTFS protection is relaxed. The Linux CI runner has no such restriction;
  // disabling it here makes the fixture reproduce the runner's view of these
  // filenames identically on both platforms.
  wsGit('config', 'core.protectNTFS', 'false');

  // Builds a commit whose tree is exactly `state` (path -> contents).
  function snapshot(state, message) {
    wsGit('read-tree', '--empty');
    for (const [path, contents] of Object.entries(state)) {
      const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {
        cwd: wsRepo,
        input: contents,
        encoding: 'utf8',
      }).trim();
      wsGit('update-index', '--add', '--cacheinfo', `100644,${blob},${path}`);
    }
    const tree = wsGit('write-tree').trim();
    return execFileSync('git', ['commit-tree', tree, '-m', message], {
      cwd: wsRepo,
      encoding: 'utf8',
      env: identity,
    }).trim();
  }
  const wsClassify = (base, head) => {
    const paths = resolveChangedPaths(base, head, { cwd: wsRepo });
    return { paths: paths ?? [], result: classifyChangedPaths(paths) };
  };

  const TRAILING_SPACE = 'README.md ';
  const LEADING_SPACE = ' README.md';
  const TRAILING_TAB = 'README.md\t';
  const NEWLINE_NAME = 'README.md\n';
  const INTERNAL_SPACES = 'notes and things.md';
  const MATERIAL_SPACES = 'src/a file.ts';

  const wsBaseState = { 'README.md': 'v1\n', 'AUDIT_REPORT.md': 'a1\n', [MATERIAL_SPACES]: 'x\n' };
  const wsBase = snapshot(wsBaseState, 'ws baseline');

  // 13a. Control — the EXACT allowlisted name is still non-material.
  const exactEdit = snapshot({ ...wsBaseState, 'README.md': 'v2\n' }, 'ws exact readme edit');
  let ws = wsClassify(wsBase, exactEdit);
  check('ws: exact README.md edit resolves one path', ws.paths.length === 1, JSON.stringify(ws.paths));
  check('ws: exact README.md is non-material', ws.result.material === false, ws.result.reason);

  // 13b. Every boundary-whitespace variant is a DIFFERENT, material file.
  const WHITESPACE_FIXTURES = [
    ['trailing space', TRAILING_SPACE],
    ['leading space', LEADING_SPACE],
    ['trailing tab', TRAILING_TAB],
    ['embedded newline', NEWLINE_NAME],
    ['internal spaces', INTERNAL_SPACES],
    ['material path with spaces', MATERIAL_SPACES],
  ];
  for (const [label, name] of WHITESPACE_FIXTURES) {
    const head = snapshot({ ...wsBaseState, [name]: 'whitespace fixture\n' }, `ws add ${label}`);
    const { paths, result } = wsClassify(wsBase, head);
    check(
      `ws: ${label} ${JSON.stringify(name)} is preserved byte-for-byte by the parser`,
      paths.includes(name),
      JSON.stringify(paths),
    );
    check(
      `ws: ${label} ${JSON.stringify(name)} is MATERIAL`,
      result.material === true,
      result.reason,
    );
    check(
      `ws: ${label} ${JSON.stringify(name)} resolves exactly one path (no split on whitespace)`,
      paths.length === 1,
      JSON.stringify(paths),
    );
  }

  // 13c. Whitespace twin alongside the real allowlisted file — the twin poisons
  // the diff even though its trimmed form would have been allowlisted.
  const twinHead = snapshot(
    { ...wsBaseState, 'README.md': 'v2\n', [TRAILING_SPACE]: 'twin\n' },
    'ws readme + trailing-space twin',
  );
  ws = wsClassify(wsBase, twinHead);
  check('ws: twin diff resolves both raw names', ws.paths.length === 2, JSON.stringify(ws.paths));
  check(
    'ws: allowlisted README.md + its trailing-space twin is MATERIAL',
    ws.result.material === true,
    ws.result.reason,
  );

  // 13d. Renames across the whitespace boundary (--no-renames exposes both sides).
  const renameOut = snapshot(
    { 'AUDIT_REPORT.md': 'a1\n', [MATERIAL_SPACES]: 'x\n', [TRAILING_SPACE]: 'v1\n' },
    'ws rename README.md -> "README.md "',
  );
  ws = wsClassify(wsBase, renameOut);
  check(
    'ws: rename README.md -> "README.md " exposes both sides',
    ws.paths.includes('README.md') && ws.paths.includes(TRAILING_SPACE),
    JSON.stringify(ws.paths),
  );
  check(
    'ws: rename allowlisted -> trailing-space twin is MATERIAL',
    ws.result.material === true,
    ws.result.reason,
  );

  const twinBaseState = { 'AUDIT_REPORT.md': 'a1\n', [MATERIAL_SPACES]: 'x\n', [TRAILING_SPACE]: 'v1\n' };
  const twinBase = snapshot(twinBaseState, 'ws twin baseline');
  const renameIn = snapshot(
    { 'AUDIT_REPORT.md': 'a1\n', [MATERIAL_SPACES]: 'x\n', 'README.md': 'v1\n' },
    'ws rename "README.md " -> README.md',
  );
  ws = wsClassify(twinBase, renameIn);
  check(
    'ws: rename "README.md " -> README.md exposes the material source side',
    ws.paths.includes(TRAILING_SPACE),
    JSON.stringify(ws.paths),
  );
  check(
    'ws: rename trailing-space twin -> allowlisted name is MATERIAL (source is material)',
    ws.result.material === true,
    ws.result.reason,
  );

  const spacesRename = snapshot(
    { 'AUDIT_REPORT.md': 'a1\n', [TRAILING_SPACE]: 'v1\n', 'README.md': 'x\n' },
    'ws rename "src/a file.ts" -> README.md',
  );
  ws = wsClassify(twinBase, spacesRename);
  check(
    'ws: material spaced filename -> allowlisted-looking destination exposes the source',
    ws.paths.includes(MATERIAL_SPACES),
    JSON.stringify(ws.paths),
  );
  check(
    'ws: material spaced filename -> allowlisted destination is MATERIAL',
    ws.result.material === true,
    ws.result.reason,
  );

  // 13e. The parser must not invent or drop entries around the NUL terminator.
  const multiHead = snapshot(
    {
      ...wsBaseState,
      [TRAILING_SPACE]: '1\n',
      [LEADING_SPACE]: '2\n',
      [TRAILING_TAB]: '3\n',
      [NEWLINE_NAME]: '4\n',
    },
    'ws all variants at once',
  );
  ws = wsClassify(wsBase, multiHead);
  check(
    'ws: four whitespace variants resolve to exactly four raw paths',
    ws.paths.length === 4,
    JSON.stringify(ws.paths),
  );
  check(
    'ws: no resolved path is empty (only the NUL terminator was dropped)',
    ws.paths.every((path) => path.length > 0),
    JSON.stringify(ws.paths),
  );
  check(
    'ws: every whitespace variant survives intact in one diff',
    [TRAILING_SPACE, LEADING_SPACE, TRAILING_TAB, NEWLINE_NAME].every((name) =>
      ws.paths.includes(name),
    ),
    JSON.stringify(ws.paths),
  );
  check('ws: combined whitespace diff is MATERIAL', ws.result.material === true, ws.result.reason);
} finally {
  rmSync(wsRepo, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE CLASSIFIER FIXTURES: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE CLASSIFIER FIXTURES: PASS (${checks}/${checks})`);
}
