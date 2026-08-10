#!/usr/bin/env node
// Fail-closed change classification for the stable master required gate.
//
// The required gate ("Master required gate") is always triggered on
// pull_request -> master with NO paths filter, so the check context is always
// reported and can never deadlock branch protection. Inside the job this
// module decides whether the PR touches MATERIAL surface, i.e. surface that
// must run the full production build + Global Header Interaction matrix.
//
// Fail-closed rules (never fail-open):
//   * any error while resolving changed files  -> MATERIAL
//   * empty / unresolvable changed-file list   -> MATERIAL
//   * any path not provably non-material       -> MATERIAL
//
// MATERIAL_PATTERNS is a deliberate strict SUPERSET of the path filter of
// .github/workflows/cbw-global-header-interaction.yml. The contract test
// scripts/ci/master-required-gate-contract-test.mjs proves that superset
// relation, so a change that would trigger the path-filtered header hard gate
// can never be classified non-material here.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Every pattern is either an exact repo-relative path or a `dir/**` prefix.
export const MATERIAL_PATTERNS = Object.freeze([
  // Rendered product surface (superset of the header gate's src/** entries).
  'src/**',
  'public/**',
  // Build / dependency inputs shared by every hard gate.
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  // Hard-gate implementations themselves: changing a gate's own code must
  // never bypass the gate.
  'scripts/ui/**',
  'scripts/seo/**',
  'scripts/ci/**',
  '.github/workflows/**',
]);

export function isMaterialPath(path) {
  if (typeof path !== 'string' || path.length === 0) return true; // fail-closed
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
  return MATERIAL_PATTERNS.some((pattern) =>
    pattern.endsWith('/**')
      ? normalized.startsWith(pattern.slice(0, -2))
      : normalized === pattern,
  );
}

// paths: array of repo-relative changed files, or null/undefined when the
// changed-file resolution itself failed.
export function classifyChangedPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { material: true, reason: 'unresolved-or-empty-change-set', matched: [] };
  }
  const matched = paths.filter(isMaterialPath);
  return matched.length > 0
    ? { material: true, reason: 'material-path-changed', matched }
    : { material: false, reason: 'no-material-path-changed', matched: [] };
}

export function resolveChangedPaths(baseSha, headSha) {
  if (!baseSha || !headSha) return null; // fail-closed
  try {
    const out = execFileSync('git', ['diff', '--name-only', `${baseSha}`, `${headSha}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const paths = out.split('\n').map((line) => line.trim()).filter(Boolean);
    return paths.length > 0 ? paths : null; // empty diff -> fail-closed
  } catch {
    return null; // fail-closed
  }
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const paths = resolveChangedPaths(baseSha, headSha);
  const result = classifyChangedPaths(paths);

  console.log(`master-required-gate: material=${result.material} reason=${result.reason}`);
  if (result.matched.length > 0) {
    console.log(`master-required-gate: matched ${result.matched.length} material path(s)`);
    for (const path of result.matched.slice(0, 50)) console.log(` - ${path}`);
  }

  if (process.argv.includes('--emit-github-output')) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile) {
      console.error('master-required-gate: GITHUB_OUTPUT is not set');
      process.exit(1); // fail-closed: never silently drop the classification
    }
    appendFileSync(outputFile, `material=${result.material}\nreason=${result.reason}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('master-required-gate-classify.mjs')) {
  main();
}
