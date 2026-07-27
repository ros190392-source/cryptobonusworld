// ResearchOps Factory V1.1 — real Git worktree-root resolution (V2-C1).
// Deterministic, dependency-free. Uses only Node built-ins plus the already-present
// `git` SCM binary via execFileSync with fixed argument arrays (no shell, no injection,
// no user-controlled repository-root flag).

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Ask Git to confirm a valid worktree and return its top level for `startDir`.
// Returns an absolute path string, or null when `startDir` is not inside a real
// Git worktree (fail-closed). A bare directory that merely contains a `.git`-named
// file is rejected unless Git itself resolves a valid worktree.
export function resolveWorktreeRoot(startDir = process.cwd()) {
  let dir;
  try { dir = resolve(startDir); } catch { return null; }
  if (!existsSync(dir)) return null;
  try {
    // `--is-inside-work-tree` fails (non-zero) outside a worktree or in a bare repo.
    const inside = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true,
    }).trim();
    if (inside !== 'true') return null;
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true,
    }).trim();
    if (!top) return null;
    const norm = resolve(top);
    // Sanity: the resolved root must exist and carry a `.git` entry (dir or gitdir file).
    if (!existsSync(norm)) return null;
    const gitEntry = join(norm, '.git');
    if (!existsSync(gitEntry)) return null;
    const st = statSync(gitEntry);
    if (st.isFile()) {
      // Linked worktree: `.git` must be a `gitdir:` pointer to an existing path.
      const txt = readFileSync(gitEntry, 'utf8');
      const m = /^gitdir:\s*(.+)\s*$/m.exec(txt);
      if (!m) return null;
      const pointer = resolve(norm, m[1].trim());
      if (!existsSync(pointer)) return null;
    } else if (!st.isDirectory()) {
      return null;
    }
    return norm;
  } catch {
    return null; // git absent, non-zero, or any failure -> fail closed.
  }
}

// Resolve or throw. Used by canonical `create` so that invocation outside a real
// worktree creates nothing.
export function requireWorktreeRoot(startDir = process.cwd()) {
  const root = resolveWorktreeRoot(startDir);
  if (!root) {
    throw new Error(`not inside a Git worktree (create confined to <worktree-root>/research-ops/tasks/): ${startDir}`);
  }
  return root;
}

// V3-C1 — resolve the worktree that CONTAINS the factory script, and require that the
// current working directory resolves to the SAME worktree. This binds `create` output
// to the CBW worktree the script lives in and fails closed when invoked by absolute
// path from a different valid Git repository. Symlinked script paths are realpath'd
// first; linked worktrees resolve through `git rev-parse` in resolveWorktreeRoot.
export function requireScriptBoundWorktreeRoot(scriptPath, cwd = process.cwd()) {
  let scriptDir;
  try { scriptDir = resolve(realpathSync(scriptPath), '..'); }
  catch { scriptDir = resolve(scriptPath, '..'); }
  const scriptRoot = resolveWorktreeRoot(scriptDir);
  if (!scriptRoot) {
    throw new Error(`factory script is not inside a Git worktree: ${scriptPath}`);
  }
  const cwdRoot = resolveWorktreeRoot(cwd);
  if (!cwdRoot) {
    throw new Error(`current directory is not inside a Git worktree: ${cwd}`);
  }
  if (realOrSame(cwdRoot) !== realOrSame(scriptRoot)) {
    throw new Error(`refusing to create outside the factory worktree: cwd worktree (${cwdRoot}) != script worktree (${scriptRoot})`);
  }
  return scriptRoot;
}

function realOrSame(p) {
  try { return realpathSync(p); } catch { return p; }
}
