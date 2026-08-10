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

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE CLASSIFIER FIXTURES: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE CLASSIFIER FIXTURES: PASS (${checks}/${checks})`);
}
