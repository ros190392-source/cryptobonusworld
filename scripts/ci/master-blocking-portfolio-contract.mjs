#!/usr/bin/env node
// Blocking-portfolio contract engine for product branch `master` (issue #366,
// Stage 2 / S2-02).
//
// PURPOSE
// -------
// S2-01 delivered ONE stable, always-reporting required context
// ("Master required gate"). Before any further gate logic can be unified into
// it, the repository needs a machine-readable, drift-proof statement of WHICH
// checks exist today, which of them can actually fail a pull request, and which
// of them could legitimately become a directly-required GitHub context.
//
// This module is that statement's engine. It is a PURE text-in function set so
// that scripts/ci/master-blocking-portfolio-discovery-test.mjs can feed it
// deliberately mutated workflow inventories and prove each rule really fails.
// The validator (scripts/ci/master-blocking-portfolio-validator.mjs) feeds it
// the real files.
//
// DESIGN RULES
// ------------
//   * Nothing is classified by FILENAME. `cbw-noindex-product-preview-advisory.yml`
//     and `cbw-pr-advisory-gate.yml` both say "advisory" and both are
//     BLOCKING-capable; `cbw-route-inventory-artifact.yml` says neither "gate"
//     nor "hard" and is a hard gate. Classification is derived from YAML
//     semantics only: PR trigger, target branches, job-level `if`, job-level
//     `continue-on-error`.
//   * NEVER GUESS IN THE PERMISSIVE DIRECTION. Valid GitHub workflow syntax the
//     model cannot prove the semantics of derives the explicit `UNMODELED`
//     semantic state, and `auditPortfolio` FAILS on any `UNMODELED` job. A
//     snapshot cannot be synchronised out of that failure, because the
//     "semantics are provable" assertion is absolute, not a comparison against
//     the snapshot. Explicit modelling is the only way to make the audit pass.
//   * Every field of every portfolio entry that CAN be derived from repository
//     truth IS derived and compared byte-for-byte against the stored snapshot.
//     The stored file is therefore a frozen assertion, not a parallel opinion:
//     any workflow edit that changes semantics makes derivation disagree with
//     the snapshot and fails the validator until a human re-classifies.
//   * Fail closed on anything unrecognised. An unparseable workflow, an
//     unmodelled job-level `if`, an unmodelled trigger, an unreadable executed
//     dependency, an unknown classification value, an unknown ROOT key or a
//     malformed portfolio file is a FAILURE, never a skipped check.
//   * This module NEVER migrates, weakens or repairs anything. Trigger gaps are
//     recorded as facts; closing them is a later, explicit task.
//
// DEPENDENCY MODEL BOUNDARY — see docs/ci/CBW_MASTER_BLOCKING_PORTFOLIO_S2_02.md
// for the prose statement. In code, the exact boundary is `deriveDependencyClosure`
// below: it is a bounded, deterministic closure over EXEC edges (things the job
// actually runs) and READ edges (repository files those executed scripts name as
// literals). It is deliberately NOT a JavaScript interpreter; anything it cannot
// resolve is recorded as `DEPENDENCY_UNRESOLVABLE`, never silently omitted.

import yaml from 'js-yaml';

// --- closed vocabularies ------------------------------------------------------

// The ONLY schemaVersion this engine accepts. Bumped from 1 to 2 by the S2-02
// Codex remediation: entry shape gained the modelled trigger/semantic state and
// the bounded dependency closure. A future version must be an explicit code
// change here, never a silently accepted file.
export const SCHEMA_VERSION = 2;

// Exact allowed portfolio ROOT keys. Unknown roots are rejected; missing roots
// are rejected. There is no "extra metadata" escape hatch.
export const ROOT_KEYS = Object.freeze([
  'schemaVersion',
  'issue',
  'stage',
  'description',
  'classifications',
  'migrationStates',
  'gapCodes',
  'totals',
  'entries',
]);

export const CLASSIFICATIONS = Object.freeze([
  'BLOCKING',
  'ADVISORY',
  'CONDITIONAL_PRODUCTION_ONLY',
  'NON_PR',
  // Fail-closed state: valid GitHub syntax whose PR semantics this engine
  // cannot prove. Never treated as blocking OR as non-blocking; the audit
  // refuses to pass while any job derives this.
  'UNMODELED',
]);

export const MIGRATION_STATES = Object.freeze([
  // Every legacy check starts here. It reports independently of the unified
  // required gate and has not been migrated into it.
  'LEGACY_EXTERNAL',
  // The single S2-01 unified gate itself. Not "migrated" — it is the target.
  'UNIFIED_GATE_HOST',
  // Cannot participate in a PR-required portfolio at all (never runs on PRs).
  'NOT_APPLICABLE',
]);

export const GAP_CODES = Object.freeze([
  // Reporting-availability gaps
  'PATH_FILTERED_NOT_ALWAYS_REPORTING',
  'NO_BRANCH_FILTER',
  // Trigger / self-bypass gaps
  'TRIGGER_GAP_OWN_WORKFLOW_FILE',
  'TRIGGER_GAP_SCRIPT',
  'TRIGGER_GAP_INPUT',
  'TRIGGER_GAP_SHARED_CONFIG',
  'TRIGGER_COVERAGE_UNRESOLVABLE',
  // Naming gaps — a human reading the repo is actively misled
  'MISLEADING_ADVISORY_FILENAME',
  'MISLEADING_NON_BLOCKING_JOB_NAME',
  // Fail-closed catch-alls. Each of these makes the audit FAIL.
  'UNMODELED_TRIGGER',
  'UNMODELED_JOB_IF',
  'UNMODELED_CONTINUE_ON_ERROR',
  // Bounded dependency model could not resolve an executed surface.
  'DEPENDENCY_UNRESOLVABLE',
  'DEPENDENCY_UNREADABLE',
]);

// Gap codes that mean "this engine could not prove semantics". Any of them on
// any discovered job is an unconditional audit failure.
export const FAIL_CLOSED_GAP_CODES = Object.freeze([
  'UNMODELED_TRIGGER',
  'UNMODELED_JOB_IF',
  'UNMODELED_CONTINUE_ON_ERROR',
  'DEPENDENCY_UNREADABLE',
]);

// Config files that every `npm`-running job materially depends on but that no
// path filter in this repository currently lists. Enumerated here so the audit
// derives the SAME set for every job instead of relying on per-entry prose.
export const SHARED_CONFIG_ALWAYS = Object.freeze(['package.json', 'package-lock.json']);
export const SHARED_CONFIG_BUILD = Object.freeze(['astro.config.mjs', 'tsconfig.json']);

// Command lines that count as "a command this job executes". Prefix-matched at
// line start after backslash-continuations are folded, so a multi-line `tsc`
// invocation is captured whole rather than truncated at the first line.
const COMMAND_PREFIXES = Object.freeze([
  'npm ',
  'npx ',
  'node ',
  'node_modules/.bin/',
  'bash ',
  'sh ',
  './',
]);

// Extensions this engine treats as "a thing that gets executed" (and therefore
// recursed into) rather than "a thing that gets read".
const EXECUTABLE_EXTENSIONS = Object.freeze(['.mjs', '.cjs', '.js', '.sh']);

// Bounded closure limits. Exceeding either is a fail-closed error, never a
// silent truncation.
const MAX_CLOSURE_NODES = 600;
const MAX_CLOSURE_DEPTH = 16;
// How deep template `${…}` interiors are re-scanned as code.
const MAX_TEMPLATE_DEPTH = 3;

// --- small deterministic helpers ---------------------------------------------

export function parseWorkflow(text) {
  // `on:` is YAML 1.1 truthy; CORE_SCHEMA keeps it as the string key `on`.
  return yaml.load(text, { schema: yaml.CORE_SCHEMA });
}

// --- filter-pattern engine (bounded, tri-state) ------------------------------
//
// GitHub's filter-pattern cheat sheet, implemented LITERALLY. The wildcards do
// NOT mean what the equivalent shell/regex characters mean, and guessing is what
// makes a wrong classification look provable:
//
//   *   zero or more characters, never `/`
//   **  zero or more of ANY character, including `/`
//   ?   ZERO OR ONE of the PRECEDING character — NOT "one arbitrary character".
//       `maste?` therefore matches `maste` and `mast`, and does NOT match
//       `master`; `master?` matches `master` and `maste`.
//   +   one or more of the preceding character — NOT MODELLED
//   []  character class                        — NOT MODELLED
//   !   leading negation / ordering            — NOT MODELLED
//
// A `**/` segment (leading, or between slashes) matches ZERO or more whole path
// segments, so `docs/**/*.md` matches `docs/OVERVIEW.md` as well as
// `docs/a/b/OVERVIEW.md`.
//
// Shell globs (`find … -name`, a `run:` block's `scripts/*.mjs`) are a DIFFERENT
// language: there `?` really is one arbitrary character. The two flavours are
// compiled by the same bounded engine but never share semantics.

// Pattern syntax this engine refuses to guess at. Presence => UNMODELED.
const UNMODELED_GLOB_RE = /[[\]+!\\{}]/;

const GITHUB_FLAVOR = 'github';
const SHELL_FLAVOR = 'shell';

function escapeRegExpChar(ch) {
  return ch.replace(/[.*+^${}()|[\]\\?]/g, '\\$&');
}

/**
 * Compile a filter pattern to an anchored RegExp, or return null for any form
 * outside the supported model. null is UNMODELED — never "no match".
 */
function compileFilterPattern(source, flavor) {
  const text = String(source ?? '');
  if (UNMODELED_GLOB_RE.test(text)) return null;
  // Each atom is one matchable unit. `quantifiable` records whether a following
  // `?` has a single PRECEDING CHARACTER to apply to.
  const atoms = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '*') {
      if (text[i + 1] === '*') {
        if (text[i + 2] === '*') return null; // `***` is not a modelled form
        if ((i === 0 || text[i - 1] === '/') && text[i + 2] === '/') {
          // A whole `**/` segment: zero or more complete path segments.
          atoms.push({ source: '(?:[\\s\\S]*/)?', quantifiable: false });
          i += 3;
          continue;
        }
        atoms.push({ source: '[\\s\\S]*', quantifiable: false });
        i += 2;
        continue;
      }
      atoms.push({ source: '[^/]*', quantifiable: false });
      i += 1;
      continue;
    }
    if (ch === '?') {
      if (flavor === SHELL_FLAVOR) {
        atoms.push({ source: '[^/]', quantifiable: false });
        i += 1;
        continue;
      }
      // GitHub: zero or one of the PRECEDING character. A `?` with no preceding
      // character, or one applied to a wildcard or to an already-quantified
      // atom, is a form this engine will not guess at.
      const previous = atoms[atoms.length - 1];
      if (!previous || !previous.quantifiable) return null;
      previous.source = `(?:${previous.source})?`;
      previous.quantifiable = false;
      i += 1;
      continue;
    }
    atoms.push({ source: escapeRegExpChar(ch), quantifiable: true });
    i += 1;
  }
  return new RegExp(`^${atoms.map((atom) => atom.source).join('')}$`);
}

function matchFilterPattern(pattern, candidate, flavor) {
  const regexp = compileFilterPattern(pattern, flavor);
  if (regexp === null) return null;
  return regexp.test(String(candidate ?? ''));
}

/** GitHub `paths` / `paths-ignore` filter -> true | false | null (UNMODELED). */
export function matchesPathPattern(pattern, path) {
  return matchFilterPattern(pattern, path, GITHUB_FLAVOR);
}

/** GitHub `branches` / `branches-ignore` filter -> true | false | null. */
export function matchesRefPattern(pattern, ref) {
  return matchFilterPattern(pattern, ref, GITHUB_FLAVOR);
}

/** Shell glob (`*`, `**`, `?` = one arbitrary char) -> true | false | null. */
export function matchesShellGlob(pattern, path) {
  return matchFilterPattern(pattern, path, SHELL_FLAVOR);
}

// --- GitHub expression evaluator (bounded, tri-state) -------------------------
//
// Supports exactly: boolean literals, single-quoted strings, `github.event_name`,
// `always()`, `==`, `!=`, `&&`, `||`, `!`, and parentheses. EVERYTHING else
// evaluates to UNMODELED and propagates. There is no permissive fallback.

export const UNMODELED = Symbol('UNMODELED');

// GitHub does NOT compare with JavaScript's `===`. Its `==` is LOOSE, and two
// strings are compared CASE-INSENSITIVELY, so
// `github.event_name == 'PULL_REQUEST'` is TRUE for a pull_request event. Mixed
// operand types are cast to a number ('' -> 0, a numeric string -> its value,
// anything else -> NaN, and NaN equals nothing).
function toComparableNumber(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    return Number(trimmed);
  }
  return Number.NaN;
}

function looseEquals(left, right) {
  if (left === UNMODELED || right === UNMODELED) return UNMODELED;
  if (typeof left === 'string' && typeof right === 'string') {
    return left.toLowerCase() === right.toLowerCase();
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') return left === right;
  const a = toComparableNumber(left);
  const b = toComparableNumber(right);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a === b;
}

// GitHub truthiness for the value domain this engine models: a boolean is
// itself, the empty string is false and any other string is true. Anything else
// stays UNMODELED rather than being coerced to a guess.
function truthiness(value) {
  if (value === UNMODELED) return UNMODELED;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value !== '';
  return UNMODELED;
}

function tokenizeExpression(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      let value = '';
      while (j < text.length) {
        if (text[j] === "'" && text[j + 1] === "'") {
          value += "'";
          j += 2;
          continue;
        }
        if (text[j] === "'") break;
        value += text[j];
        j += 1;
      }
      if (j >= text.length) return null; // unterminated
      tokens.push({ type: 'string', value });
      i = j + 1;
      continue;
    }
    const two = text.slice(i, i + 2);
    if (two === '==' || two === '!=' || two === '&&' || two === '||') {
      tokens.push({ type: two });
      i += 2;
      continue;
    }
    if (ch === '(' || ch === ')' || ch === '!') {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_.-]*/.exec(text.slice(i));
    if (ident) {
      tokens.push({ type: 'ident', value: ident[0] });
      i += ident[0].length;
      continue;
    }
    return null; // an unrecognised character makes the whole expression unmodelled
  }
  return tokens;
}

function evaluateTokens(tokens, context) {
  let pos = 0;
  let bad = false;
  const peek = () => tokens[pos];
  const eat = (type) => {
    if (tokens[pos]?.type === type) {
      pos += 1;
      return true;
    }
    return false;
  };

  function primary() {
    const token = peek();
    if (!token) {
      bad = true;
      return UNMODELED;
    }
    if (eat('(')) {
      const value = orExpression();
      if (!eat(')')) bad = true;
      return value;
    }
    if (eat('!')) {
      const truth = truthiness(primary());
      return truth === UNMODELED ? UNMODELED : !truth;
    }
    if (token.type === 'string') {
      pos += 1;
      return token.value;
    }
    if (token.type === 'ident') {
      pos += 1;
      // function call form
      if (peek()?.type === '(') {
        pos += 1;
        if (!eat(')')) {
          bad = true;
          return UNMODELED;
        }
        // `always()` is the only modelled function: at job level it means the
        // job runs regardless of upstream results.
        return token.value === 'always' ? true : UNMODELED;
      }
      if (token.value === 'true') return true;
      if (token.value === 'false') return false;
      if (token.value === 'github.event_name') return context.event_name ?? UNMODELED;
      return UNMODELED;
    }
    bad = true;
    return UNMODELED;
  }

  function comparison() {
    const left = primary();
    const token = peek();
    if (token?.type === '==' || token?.type === '!=') {
      pos += 1;
      const right = primary();
      const equal = looseEquals(left, right);
      if (equal === UNMODELED) return UNMODELED;
      return token.type === '==' ? equal : !equal;
    }
    return left;
  }

  // `&&` / `||` return an OPERAND in GitHub, not a boolean. Short-circuiting is
  // kept because a provably-false left operand of `&&` (or a provably-true left
  // operand of `||`) decides the whole expression even when the other side is
  // UNMODELED.
  function andExpression() {
    let left = comparison();
    while (peek()?.type === '&&') {
      pos += 1;
      const right = comparison();
      const truth = truthiness(left);
      if (truth === false) continue; // short-circuit: provably falsy
      left = truth === UNMODELED ? UNMODELED : right;
    }
    return left;
  }

  function orExpression() {
    let left = andExpression();
    while (peek()?.type === '||') {
      pos += 1;
      const right = andExpression();
      const truth = truthiness(left);
      if (truth === true) continue; // short-circuit: provably truthy
      left = truth === UNMODELED ? UNMODELED : right;
    }
    return left;
  }

  const value = orExpression();
  if (bad || pos !== tokens.length) return UNMODELED;
  return value;
}

/**
 * Evaluate a GitHub expression to `true`, `false`, or `UNMODELED`.
 * Accepts both a bare expression (`if:` form) and a fully wrapped
 * `${{ ... }}` form. A PARTIALLY interpolated string is UNMODELED.
 */
export function evaluateGithubExpression(raw, context = {}) {
  if (typeof raw === 'boolean') return raw;
  if (raw === undefined || raw === null) return UNMODELED;
  let text = String(raw).trim();
  if (text === '') return UNMODELED;
  const wrapped = /^\$\{\{([\s\S]*)\}\}$/.exec(text);
  if (wrapped) {
    text = wrapped[1].trim();
    // `${{ a }}${{ b }}` matches the greedy regex above but is an interpolation,
    // not one expression. Reject anything that still contains the delimiters.
    if (text.includes('${{') || text.includes('}}')) return UNMODELED;
  } else if (text.includes('${{')) {
    return UNMODELED; // interpolated string, not a single expression
  }
  const tokens = tokenizeExpression(text);
  if (tokens === null || tokens.length === 0) return UNMODELED;
  // A job-level `if` is coerced to a boolean by GitHub, so a modelled non-boolean
  // result is resolved through GitHub truthiness. Anything else stays UNMODELED.
  return truthiness(evaluateTokens(tokens, context));
}

const PULL_REQUEST_CONTEXT = Object.freeze({ event_name: 'pull_request' });

/**
 * Can this job run at all for a `pull_request` event?
 *   RUNNABLE  — provably yes
 *   NEVER     — provably no (e.g. `github.event_name == 'push'`)
 *   UNMODELED — not provable; fail closed, never assumed runnable
 */
export function evaluateJobIfForPullRequest(expression) {
  if (expression === undefined || expression === null) return 'RUNNABLE';
  const value = evaluateGithubExpression(expression, PULL_REQUEST_CONTEXT);
  if (value === true) return 'RUNNABLE';
  if (value === false) return 'NEVER';
  return 'UNMODELED';
}

/**
 * Job-level `continue-on-error` under a pull_request event.
 * Returns { state: 'MODELED'|'UNMODELED', value: boolean|null, source: string|null }.
 * A dynamic expression is UNMODELED — NOT assumed blocking and NOT assumed
 * advisory.
 */
export function evaluateContinueOnError(raw) {
  if (raw === undefined || raw === null) return { state: 'MODELED', value: false, source: null };
  if (typeof raw === 'boolean') return { state: 'MODELED', value: raw, source: null };
  if (typeof raw !== 'string') return { state: 'UNMODELED', value: null, source: JSON.stringify(raw) };
  const text = raw.trim();
  const lowered = text.toLowerCase();
  if (lowered === 'true') return { state: 'MODELED', value: true, source: text };
  if (lowered === 'false') return { state: 'MODELED', value: false, source: text };
  const value = evaluateGithubExpression(text, PULL_REQUEST_CONTEXT);
  if (value === true || value === false) return { state: 'MODELED', value, source: text };
  return { state: 'UNMODELED', value: null, source: text };
}

// --- trigger derivation --------------------------------------------------------

const PR_FILTER_KEYS = Object.freeze(['branches', 'branches-ignore', 'paths', 'paths-ignore', 'types']);
// GitHub's default pull_request activity types. Anything narrower cannot be
// assumed to report on an ordinary open-and-push PR.
const DEFAULT_PR_TYPES = Object.freeze(['opened', 'synchronize', 'reopened']);

function stringArray(value) {
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === 'string') ? value : null;
}

/**
 * Derive the pull_request trigger semantics from ANY valid `on:` syntax:
 * scalar (`on: pull_request`), sequence (`on: [pull_request]`) and mapping
 * (with or without a filter block). Anything not provable is UNMODELED.
 *
 * @returns {{modeled: boolean, reason: string|null, hasPullRequest: boolean,
 *   branches: string[]|null, branchesIgnore: string[]|null, paths: string[]|null,
 *   pathsIgnore: string[]|null, types: string[]|null, targetsMaster: boolean}}
 */
export function derivePullRequestTrigger(workflowDoc, targetBranch = 'master') {
  const unmodeled = (reason) => ({
    modeled: false,
    reason,
    hasPullRequest: false,
    branches: null,
    branchesIgnore: null,
    paths: null,
    pathsIgnore: null,
    types: null,
    targetsMaster: false,
  });
  const none = {
    modeled: true,
    reason: null,
    hasPullRequest: false,
    branches: null,
    branchesIgnore: null,
    paths: null,
    pathsIgnore: null,
    types: null,
    targetsMaster: false,
  };

  const hasOn = Object.prototype.hasOwnProperty.call(workflowDoc ?? {}, 'on');
  // YAML 1.1 loaders coerce the `on` key to boolean true. CORE_SCHEMA does not,
  // but a workflow authored with an explicit `true:` key would be ambiguous.
  const hasTrue = Object.prototype.hasOwnProperty.call(workflowDoc ?? {}, true);
  if (hasOn && hasTrue) return unmodeled('workflow declares both `on` and a truthy `on` key');
  if (!hasOn && !hasTrue) return unmodeled('workflow declares no `on` trigger block');
  const on = hasOn ? workflowDoc.on : workflowDoc[true];

  let config;
  if (typeof on === 'string') {
    if (on !== 'pull_request') return none;
    config = {};
  } else if (Array.isArray(on)) {
    const names = stringArray(on);
    if (names === null) return unmodeled('`on` sequence contains a non-string event');
    if (!names.includes('pull_request')) return none;
    config = {};
  } else if (on !== null && typeof on === 'object') {
    if (!Object.prototype.hasOwnProperty.call(on, 'pull_request')) return none;
    const raw = on.pull_request;
    if (raw === null || raw === undefined) config = {};
    else if (typeof raw === 'object' && !Array.isArray(raw)) config = raw;
    else return unmodeled(`\`on.pull_request\` is neither empty nor a mapping (${typeof raw})`);
  } else {
    return unmodeled(`\`on\` is neither a string, a sequence nor a mapping (${typeof on})`);
  }

  const unknownKeys = Object.keys(config).filter((key) => !PR_FILTER_KEYS.includes(key));
  if (unknownKeys.length) return unmodeled(`unmodelled pull_request filter key(s): ${unknownKeys.join(',')}`);

  const has = (key) => Object.prototype.hasOwnProperty.call(config, key);
  if (has('branches') && has('branches-ignore')) return unmodeled('branches and branches-ignore are mutually exclusive');
  if (has('paths') && has('paths-ignore')) return unmodeled('paths and paths-ignore are mutually exclusive');

  let branches = null;
  let branchesIgnore = null;
  let paths = null;
  let pathsIgnore = null;
  let types = null;

  if (has('branches')) {
    branches = stringArray(config.branches);
    if (branches === null) return unmodeled('branches is not a list of strings');
  }
  if (has('branches-ignore')) {
    branchesIgnore = stringArray(config['branches-ignore']);
    if (branchesIgnore === null) return unmodeled('branches-ignore is not a list of strings');
  }
  if (has('paths')) {
    paths = stringArray(config.paths);
    if (paths === null) return unmodeled('paths is not a list of strings');
    for (const pattern of paths) {
      // Compiled, not string-tested: any form the engine cannot compile — a
      // character class, a `+`, a negation, a `?` with nothing to quantify —
      // makes the whole trigger UNMODELED instead of being approximated.
      if (compileFilterPattern(pattern, GITHUB_FLAVOR) === null) {
        return unmodeled(`unmodelled path glob syntax: ${pattern}`);
      }
    }
  }
  if (has('paths-ignore')) {
    pathsIgnore = stringArray(config['paths-ignore']);
    if (pathsIgnore === null) return unmodeled('paths-ignore is not a list of strings');
    for (const pattern of pathsIgnore) {
      // Compiled, not string-tested: any form the engine cannot compile — a
      // character class, a `+`, a negation, a `?` with nothing to quantify —
      // makes the whole trigger UNMODELED instead of being approximated.
      if (compileFilterPattern(pattern, GITHUB_FLAVOR) === null) {
        return unmodeled(`unmodelled path glob syntax: ${pattern}`);
      }
    }
  }
  if (has('types')) {
    types = stringArray(config.types);
    if (types === null) return unmodeled('types is not a list of strings');
    const missing = DEFAULT_PR_TYPES.filter((type) => !types.includes(type));
    if (missing.length) {
      return unmodeled(`narrowed pull_request types omit ${missing.join(',')}; PR reporting is not provable`);
    }
  }

  // --- does it target `master`? ------------------------------------------------
  let targetsMaster;
  if (branches) {
    targetsMaster = false;
    for (const pattern of branches) {
      const match = matchesRefPattern(pattern, targetBranch);
      if (match === null) return unmodeled(`unmodelled branch glob syntax: ${pattern}`);
      if (match) targetsMaster = true;
    }
  } else if (branchesIgnore) {
    targetsMaster = true;
    for (const pattern of branchesIgnore) {
      const match = matchesRefPattern(pattern, targetBranch);
      if (match === null) return unmodeled(`unmodelled branch glob syntax: ${pattern}`);
      if (match) targetsMaster = false;
    }
  } else {
    // No branch filter at all means EVERY target branch, master included.
    targetsMaster = true;
  }

  return {
    modeled: true,
    reason: null,
    hasPullRequest: true,
    branches,
    branchesIgnore,
    paths,
    pathsIgnore,
    types,
    targetsMaster,
  };
}

// --- command extraction --------------------------------------------------------

// Folds `\`-continuations, then collects every command line by prefix.
// Order-preserving, first-occurrence deduped.
export function extractCommands(job) {
  const seen = new Set();
  const commands = [];
  for (const step of Array.isArray(job?.steps) ? job.steps : []) {
    if (typeof step?.run !== 'string') continue;
    // Collapse `\`-continuations (and the indentation around them) so a
    // multi-line invocation is captured as ONE canonical command line.
    const folded = step.run.replace(/[ \t]*\\\r?\n[ \t]*/g, ' ');
    for (const rawLine of folded.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (!COMMAND_PREFIXES.some((prefix) => line.startsWith(prefix))) continue;
      if (seen.has(line)) continue;
      seen.add(line);
      commands.push(line);
    }
  }
  return commands;
}

// `npm run foo -- --bar` / `npm run foo` -> 'foo'. Also picks up `a || b`
// fallbacks that carry a second invocation on the same line.
export function extractNpmScriptNames(text) {
  const names = [];
  const haystack = Array.isArray(text) ? text.join('\n') : String(text ?? '');
  for (const match of haystack.matchAll(/(?:^|[\s;&|(])npm run ([A-Za-z0-9:._-]+)/gm)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

export function deriveSharedConfigDependencies(commands) {
  const usesNpm = commands.some((command) => command.startsWith('npm ') || command.startsWith('npx '));
  const builds = commands.some((command) => command.includes('npm run build'));
  const typechecks = commands.some((command) => command.includes('tsc'));
  const out = [];
  if (usesNpm) out.push(...SHARED_CONFIG_ALWAYS);
  if (builds) out.push('astro.config.mjs');
  if (builds || typechecks) out.push('tsconfig.json');
  return [...new Set(out)].sort();
}

// --- bounded deterministic dependency closure ---------------------------------
//
// MODEL BOUNDARY (see the module header and the S2-02 doc):
//
//   EXEC edges — the job really runs this file, so the closure recurses into it:
//     * a tracked `.mjs/.cjs/.js/.sh` path named in a `run:` block
//     * a shell glob in a `run:` block, expanded against the tracked file list
//     * `npm run <name>` resolved through package.json, RECURSIVELY, with cycle
//       detection
//     * a relative `import` / `export from` / `import()` / `require()` specifier
//       inside an already-executed file, resolved to a tracked file
//     * a local `uses: ./…` action: its `action.yml`/`action.yaml`, the
//       `runs.main`/`pre`/`post` entrypoint, and every `runs.steps[].run`
//
//   READ edges — the job's executed code names this repository file as data.
//     The closure records it and STOPS (a file read as text is not executed):
//     * any string literal in an executed file that exactly matches a tracked
//       repository path (this is how `join(ROOT, 'src/data/exchanges.json')`
//       and every `readFileSync(join(ROOT, 'src/components/...astro'))` is found)
//     * `readdirSync('<literal dir>')` expanded against the tracked file list
//     * a template literal whose STATIC prefix is a tracked directory, expanded
//       against the tracked file list (deterministic prefix enumeration)
//     * `find <dir> … -name '<pat>'` in a `run:` block
//
//   FAIL CLOSED — recorded, never silently dropped:
//     * DEPENDENCY_UNREADABLE — an EXEC target that cannot be read (hard audit failure)
//     * DEPENDENCY_UNRESOLVABLE — a dynamic `import()`/`require()`, an
//       unresolvable relative specifier, a local `uses: ./…` that resolves to no
//       tracked action, or a closure that hit its node/depth bound
//
//   NOT MODELLED BY DESIGN — this is not a JavaScript interpreter. Data flow
//   through variables is covered only because the literal scan is variable
//   agnostic; computed paths with no static repository prefix are reported as
//   DEPENDENCY_UNRESOLVABLE rather than guessed at.

function isExecutable(path) {
  return EXECUTABLE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

// Any whitespace/quote-delimited token that could be a repository path.
const PATH_TOKEN_RE = /[A-Za-z0-9._][A-Za-z0-9._*?/-]*\/[A-Za-z0-9._*?/-]+/g;
const FIND_NAME_RE = /\bfind\s+([A-Za-z0-9._/-]+)\b[^\n]*?-name\s+'?"?([^\s'"]+)'?"?/g;
// One whole `find` invocation, up to the next shell separator.
const FIND_COMMAND_RE = /\bfind\s+[^\n;|&)]*/g;
// `find` operators that change WHICH files the command visits. Outside the
// supported subset => DEPENDENCY_UNRESOLVABLE, never an approximation.
const FIND_UNSUPPORTED_RE = /(^|\s)-(maxdepth|mindepth|path|ipath|regex|iregex|exec|execdir|ok|prune|delete|newer|links|samefile|not|and|or|a|o)\b/;
// A path-shaped token carrying glob syntax outside the supported subset.
const UNSUPPORTED_SHELL_GLOB_RE = /(?:^|[\s'"=])([A-Za-z0-9._-]+\/[A-Za-z0-9._*?/-]*[[\]{}+][^\s'"]*)/g;
const MODULE_EXTENSIONS = Object.freeze(['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '.json']);

// A string literal is treated as naming a repository input only when the CODE
// around it says so: it is an argument to one of these path/IO calls, or it is
// the right-hand side of a plain assignment. That is what keeps a path embedded
// as fixture DATA (a `{ path: '<some doc>' }` case table inside a gate test)
// from being mistaken for a file that gate really reads.
const PATH_CALL_NAMES = Object.freeze([
  'readFileSync',
  'readFile',
  'existsSync',
  'statSync',
  'lstatSync',
  'createReadStream',
  'readdirSync',
  'readdir',
  'opendirSync',
  'globSync',
  'join',
  'resolve',
  'relative',
  'pathToFileURL',
]);
// One level of nested parentheses is enough for `readFileSync(join(ROOT, 'x'), 'utf8')`.
const PATH_CALL_RE = new RegExp(
  `\\b(${PATH_CALL_NAMES.join('|')})\\s*\\(((?:[^()]|\\([^()]*\\))*)\\)`,
  'g',
);
const READDIR_CALL_RE = new RegExp('\\breaddir(?:Sync)?\\s*\\(((?:[^()]|\\([^()]*\\))*)\\)', 'g');
// Calls that really READ repository CONTENT (as opposed to `join`/`resolve`,
// which only compute a path). If one of these cannot be resolved to a tracked
// file it becomes an explicit DEPENDENCY_UNRESOLVABLE fact.
const IO_READ_CALL_NAMES = Object.freeze([
  'readFileSync',
  'readFile',
  'createReadStream',
  'readdirSync',
  'readdir',
  'opendirSync',
  'globSync',
]);
// The subset of those that enumerate a DIRECTORY rather than read one file.
const DIRECTORY_CALL_NAMES = new Set(['readdirSync', 'readdir', 'opendirSync', 'globSync']);
const IO_READ_CALL_RE = new RegExp(
  `\\b(${IO_READ_CALL_NAMES.join('|')})\\s*\\(((?:[^()]|\\([^()]*\\))*)\\)`,
  'g',
);
const ASSIGNED_LITERAL_RE = /=\s*\u0001(\d+)\u0001/g;
const STATIC_FROM_RE = /\bfrom\s*\u0001(\d+)\u0001/g;
const BARE_IMPORT_RE = /^[ \t]*import\s*\u0001(\d+)\u0001/gm;
const CALL_SPECIFIER_RE = /\b(?:import|require)\s*\(\s*\u0001(\d+)\u0001\s*\)/g;
const DYNAMIC_MODULE_RE = /\b(?:import|require)\s*\(\s*(?!\u0001)[^\s)][^\n]{0,79}/g;
const PLACEHOLDER_RE = /\u0001(\d+)\u0001/g;

// `const NAME = <expression>` — a bounded, deterministic binding table so that
// `readFileSync(REQUIRED_WORKFLOW, 'utf8')` resolves through the literal that
// name was bound to instead of being reported as a computed input.
const BINDING_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]{0,200})/g;
// The two directory idioms that are DETERMINISTIC rather than dynamic: the
// directory of the running script, and the repository root.
const HERE_IDIOM_RE = /dirname\s*\(\s*fileURLToPath\s*\(\s*import\.meta\.url\s*\)\s*\)|import\.meta\.dirname/g;
const CWD_IDIOM_RE = /process\.cwd\s*\(\s*\)/g;
// Names that structure a path expression without contributing a segment.
const PATH_STRUCTURAL_NAMES = new Set([
  'join',
  'resolve',
  'normalize',
  'relative',
  'dirname',
  'basename',
  'extname',
  'path',
  'posix',
  'sep',
  'new',
  'URL',
  'fileURLToPath',
  'pathToFileURL',
  'String',
  'toString',
  'utf8',
]);
const MAX_BINDING_DEPTH = 4;
const MAX_PATH_SEGMENTS = 8;
// One token of a path expression: a lexed string literal, or an identifier.
const SEGMENT_TOKEN_RE = new RegExp('\\u0001(\\d+)\\u0001|[A-Za-z_$][\\w$]*', 'g');

// Bounded JavaScript string/comment lexer. NOT a parser: it only separates code
// from string literals and comments so that code embedded inside a fixture
// string is never scanned as if it were code. Regex literals are recognised with
// the standard "previous significant token" heuristic so a pattern such as
// /['"]/ cannot desynchronise the scan.
const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

// Read a `${…}` template expression, starting just after the `${`. Returns the
// verbatim expression source and the index after its closing `}`, or null when
// the literal never closes. Nested braces, quoted strings and nested template
// literals are all accounted for so the scan cannot desynchronise.
function readBalancedExpression(text, start) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i] === quote) {
          i += 1;
          break;
        }
        if (text[i] === '\n') break;
        i += 1;
      }
      continue;
    }
    if (ch === '`') {
      const nested = scanTemplateLiteral(text, i);
      if (nested === null) return null;
      i = nested.end;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      if (depth === 0) return { source: text.slice(start, i), end: i + 1 };
      depth -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return null;
}

// A template literal is BOTH data and code: its static chunks are a string, but
// every `${…}` interior is real code that really executes. Scanning only the
// literal (as a plain string) is how an `import(…)` or a `readFileSync(…)`
// written inside a template expression disappears from the dependency set.
function scanTemplateLiteral(text, start) {
  let i = start + 1;
  let value = '';
  let chunk = '';
  const chunks = [];
  const expressions = [];
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      const escaped = text[i + 1] ?? '';
      value += escaped;
      chunk += escaped;
      i += 2;
      continue;
    }
    if (ch === '`') {
      chunks.push(chunk);
      return { value, chunks, expressions, end: i + 1 };
    }
    if (ch === '$' && text[i + 1] === '{') {
      const inner = readBalancedExpression(text, i + 2);
      if (inner === null) return null;
      value += `\${${inner.source}}`;
      expressions.push(inner.source);
      chunks.push(chunk);
      chunk = '';
      i = inner.end;
      continue;
    }
    value += ch;
    chunk += ch;
    i += 1;
  }
  return null;
}

export function lexJavaScript(source) {
  const text = String(source ?? '');
  const strings = [];
  let skeleton = '';
  let previousSignificant = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      skeleton += ' ';
      continue;
    }
    if (ch === '/' && (previousSignificant === '' || REGEX_PRECEDERS.has(previousSignificant))) {
      // regex literal
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < text.length) {
        const rc = text[j];
        if (rc === '\\') {
          j += 2;
          continue;
        }
        if (rc === '\n') break;
        if (rc === '[') inClass = true;
        else if (rc === ']') inClass = false;
        else if (rc === '/' && !inClass) {
          closed = true;
          j += 1;
          break;
        }
        j += 1;
      }
      if (closed) {
        while (j < text.length && /[a-z]/.test(text[j])) j += 1;
        skeleton += ' ';
        previousSignificant = ')';
        i = j;
        continue;
      }
    }
    if (ch === '`') {
      const template = scanTemplateLiteral(text, i);
      if (template) {
        strings.push({
          quote: '`',
          value: template.value,
          staticChunks: template.chunks,
          expressions: template.expressions,
        });
        skeleton += `\u0001${strings.length - 1}\u0001`;
        previousSignificant = '`';
        i = template.end;
        continue;
      }
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let value = '';
      let closed = false;
      while (j < text.length) {
        const sc = text[j];
        if (sc === '\\') {
          value += text[j + 1] ?? '';
          j += 2;
          continue;
        }
        if (sc === ch) {
          closed = true;
          j += 1;
          break;
        }
        if (sc === '\n' && ch !== '`') break; // unterminated single-line string
        value += sc;
        j += 1;
      }
      if (closed) {
        strings.push({ quote: ch, value });
        skeleton += `\u0001${strings.length - 1}\u0001`;
        previousSignificant = ch;
        i = j;
        continue;
      }
    }
    skeleton += ch;
    if (!/\s/.test(ch)) previousSignificant = ch;
    i += 1;
  }
  return { skeleton, strings };
}

function normalizeRepoPath(path) {
  const parts = [];
  for (const segment of String(path).split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join('/');
}

// Shell-glob expansion against the tracked file set. Returns null (never an
// empty list) for a form outside the supported shell subset so the caller can
// record DEPENDENCY_UNRESOLVABLE instead of silently resolving to nothing.
function expandGlob(pattern, repoFiles) {
  const regexp = compileFilterPattern(pattern, SHELL_FLAVOR);
  if (regexp === null) return null;
  return [...repoFiles].filter((path) => regexp.test(path)).sort();
}

function expandPrefix(prefix, repoFiles) {
  const normalized = normalizeRepoPath(prefix);
  if (!normalized.includes('/')) return [];
  return [...repoFiles].filter((path) => path.startsWith(normalized)).sort();
}

// The top-level directories git actually tracks. A path-shaped construct only
// counts as a REPOSITORY path construct if it is rooted in one of them — that is
// what keeps `${base}/go/${slug}` and `http://127.0.0.1:${port}` out of the
// dependency set without guessing.
function topLevelDirectories(repoFiles) {
  const roots = new Set();
  for (const path of repoFiles) {
    const index = path.indexOf('/');
    if (index > 0) roots.add(path.slice(0, index));
  }
  return roots;
}

// Static chunks of a template literal, i.e. everything outside `${…}`. The
// lexer records them exactly (brace-aware); the regex split is the fallback for
// a body that did not come from the lexer.
function staticTemplateChunks(body) {
  return String(body ?? '').split(/\$\{[^{}]*\}/g);
}

function templateChunksOf(token) {
  return token?.staticChunks ?? staticTemplateChunks(token?.value);
}

// A readable, bounded rendering of a call site for an audit fact: string
// literals are restored, whitespace is folded and the whole thing is capped.
function describeCall(text, literalOf) {
  const restored = String(text)
    .replace(PLACEHOLDER_RE, (unused, index) => JSON.stringify(literalOf(index)))
    .replace(/\s+/g, ' ')
    .trim();
  return restored.length > 120 ? `${restored.slice(0, 117)}...` : restored;
}

/**
 * @param {object} input
 * @param {object} input.job the parsed job mapping
 * @param {Record<string,string>} input.packageScripts package.json `scripts`
 * @param {Set<string>|string[]} input.repoFiles every tracked repository path
 * @param {(path: string) => (string|null)} input.readFile source reader
 */
export function deriveDependencyClosure({ job, packageScripts = {}, repoFiles = [], readFile = () => null }) {
  const tracked = repoFiles instanceof Set ? repoFiles : new Set(repoFiles);
  const repoRoots = topLevelDirectories(tracked);
  const executed = new Set();
  const readInputs = new Set();
  const localActions = new Set();
  const npmScripts = [];
  const unresolvable = [];
  const unreadable = [];
  const visitedScripts = new Set();
  const visitedFiles = new Set();
  let nodes = 0;

  const note = (list, source, detail) => {
    const entry = `${source} :: ${detail}`;
    if (!list.includes(entry)) list.push(entry);
  };

  const budget = (source, what) => {
    nodes += 1;
    if (nodes > MAX_CLOSURE_NODES) {
      note(unresolvable, source, `bounded dependency closure exceeded ${MAX_CLOSURE_NODES} nodes at ${what}`);
      return false;
    }
    return true;
  };

  const queue = [];
  const enqueueExec = (path, depth, source) => {
    const normalized = normalizeRepoPath(path);
    if (!tracked.has(normalized)) return false;
    executed.add(normalized);
    if (visitedFiles.has(normalized)) return true;
    if (depth > MAX_CLOSURE_DEPTH) {
      note(unresolvable, source, `bounded dependency closure exceeded depth ${MAX_CLOSURE_DEPTH} at ${normalized}`);
      return true;
    }
    visitedFiles.add(normalized);
    queue.push({ path: normalized, depth });
    return true;
  };
  const addRead = (path) => {
    const normalized = normalizeRepoPath(path);
    if (tracked.has(normalized)) readInputs.add(normalized);
  };

  // --- shell text (a `run:` block or an npm script definition) ----------------
  function scanShellText(text, depth, source) {
    if (!budget(source, 'shell text')) return;
    const folded = String(text ?? '').replace(/[ \t]*\\\r?\n[ \t]*/g, ' ');

    // `find` — supported subset: `find <dir> [-type x] -name <pattern>`, which
    // searches RECURSIVELY. The expansion therefore has to include BOTH the
    // direct children of <dir> and every nested descendant. Anything that
    // changes which files the command visits (`-maxdepth`, `-path`, `-regex`,
    // `-exec`, `-prune`, boolean operators) is outside the subset and is
    // recorded rather than approximated.
    for (const [command] of folded.matchAll(FIND_COMMAND_RE)) {
      const invocation = command.trim();
      const unsupported = FIND_UNSUPPORTED_RE.exec(invocation);
      if (unsupported) {
        note(unresolvable, source, `find form outside the supported subset (${unsupported[2]}): ${invocation}`);
        continue;
      }
      const parsed = new RegExp(FIND_NAME_RE.source).exec(invocation);
      if (!parsed) {
        note(unresolvable, source, `find form outside the supported subset (no -name pattern): ${invocation}`);
        continue;
      }
      const [, dir, namePattern] = parsed;
      const root = normalizeRepoPath(dir);
      // `**/` matches ZERO or more whole segments, so `dir/direct.ts` and
      // `dir/nested/file.ts` both resolve from one recursive expansion.
      const expanded = expandGlob(`${root}/**/${namePattern}`, tracked);
      if (expanded === null) {
        note(unresolvable, source, `find -name pattern is outside the supported glob subset: ${namePattern}`);
        continue;
      }
      if (expanded.length === 0) {
        note(unresolvable, source, `find expands to no tracked file: ${invocation}`);
        continue;
      }
      for (const path of expanded) addRead(path);
    }

    // A path-shaped token carrying glob syntax this engine does not model is
    // recorded, never silently dropped by a regex that simply fails to match it.
    for (const [, token] of folded.matchAll(UNSUPPORTED_SHELL_GLOB_RE)) {
      const candidate = token.replace(/^['"]|['"]$/g, '');
      if (!repoRoots.has(candidate.split('/')[0])) continue;
      note(unresolvable, source, `shell glob form outside the supported subset: ${candidate}`);
    }

    for (const [token] of folded.matchAll(PATH_TOKEN_RE)) {
      const candidate = token.replace(/^['"]|['"]$/g, '');
      if (candidate.includes('*') || candidate.includes('?')) {
        const expanded = expandGlob(normalizeRepoPath(candidate), tracked);
        if (expanded === null) {
          note(unresolvable, source, `shell glob form outside the supported subset: ${candidate}`);
          continue;
        }
        if (expanded.length === 0 && repoRoots.has(candidate.split('/')[0])) {
          note(unresolvable, source, `shell glob expands to no tracked file: ${candidate}`);
          continue;
        }
        for (const path of expanded) {
          if (isExecutable(path)) enqueueExec(path, depth + 1, source);
          else addRead(path);
        }
        continue;
      }
      const normalized = normalizeRepoPath(candidate);
      if (!tracked.has(normalized)) continue;
      if (isExecutable(normalized)) enqueueExec(normalized, depth + 1, source);
      else addRead(normalized);
    }

    for (const name of extractNpmScriptNames(folded)) {
      if (!npmScripts.includes(name)) npmScripts.push(name);
      if (visitedScripts.has(name)) continue; // cycle detection
      visitedScripts.add(name);
      const definition = packageScripts?.[name];
      if (typeof definition === 'string') scanShellText(definition, depth + 1, `package.json#scripts.${name}`);
    }
  }

  // --- an executed source file -------------------------------------------------
  function scanSourceFile(path, depth) {
    if (!budget(path, 'source file')) return;
    const raw = readFile(path);
    if (typeof raw !== 'string') {
      note(unreadable, path, 'executed dependency could not be read');
      return;
    }
    if (path.endsWith('.sh')) {
      scanShellText(raw, depth, path);
      return;
    }
    scanCodeText(raw, path, depth, 0);
  }

  /**
   * Scan one body of JavaScript. `level` bounds the recursion into template
   * `${…}` expressions, which are CODE and are scanned as code — an `import(…)`
   * or a `readFileSync(…)` written inside a template expression must never
   * disappear just because it is spelled inside a literal.
   */
  function scanCodeText(raw, path, depth, level) {
    if (!budget(path, `code text (level ${level})`)) return;
    // Lex once: `skeleton` is the CODE with every string literal replaced by a
    // placeholder. Every rule below reads the skeleton, so code that only exists
    // inside a fixture string is never scanned as code.
    const { skeleton, strings } = lexJavaScript(raw);
    const literalOf = (index) => strings[Number(index)]?.value ?? '';
    const tokenOf = (index) => strings[Number(index)];
    const base = path.split('/').slice(0, -1).join('/');

    // --- bounded, deterministic path-expression resolution ----------------------
    //
    // A path argument is resolvable when the CODE fixes it: a literal, the
    // ordered join of a call's literal segments (`join(ROOT, 'src', 'data',
    // 'x.json')`), a name bound to either of those, or an interpolation whose
    // static prefix expands to tracked files. Anything else is genuinely
    // computed at run time and is reported.
    const bindings = new Map();
    for (const match of skeleton.matchAll(BINDING_RE)) {
      if (!bindings.has(match[1])) bindings.set(match[1], match[2]);
    }

    // Split an expression into ordered path SEGMENTS: a literal, a name bound to
    // literals, one of the two deterministic directory idioms, or a genuinely
    // dynamic value that breaks the run.
    const segmentsOf = (expression, seen, level) => {
      if (level > MAX_BINDING_DEPTH) return [{ dynamic: true }];
      const text = String(expression ?? '')
        .replace(HERE_IDIOM_RE, ' __CBW_HERE__ ')
        .replace(CWD_IDIOM_RE, ' __CBW_ROOT__ ');
      const segments = [];
      for (const match of text.matchAll(SEGMENT_TOKEN_RE)) {
        if (match[1] !== undefined) {
          segments.push({ value: literalOf(match[1]) });
          continue;
        }
        const name = match[0];
        if (name === '__CBW_HERE__') {
          segments.push({ value: base }); // the directory of the script itself
          continue;
        }
        if (name === '__CBW_ROOT__') {
          segments.push({ value: '' }); // the repository root
          continue;
        }
        const bound = bindings.get(name);
        if (bound !== undefined && !seen.has(name)) {
          seen.add(name);
          segments.push(...segmentsOf(bound, seen, level + 1));
          continue;
        }
        if (PATH_STRUCTURAL_NAMES.has(name)) continue; // `join`/`resolve`/… are not segments
        segments.push({ dynamic: true });
      }
      return segments;
    };

    // Every path string an expression can be PROVED to denote: each contiguous
    // run of resolved segments, joined in order. `join(ROOT, 'src', 'data',
    // 'x.json')` therefore yields src/data/x.json, which per-literal matching
    // alone would drop on the floor. Candidates are ordered LONGEST FIRST so the
    // most specific reading of an expression always wins; `prefixOnly` keeps a
    // directory expansion anchored at the start of the run, so a trailing
    // encoding argument is dropped but `src/data` is never mistaken for the
    // `src/data/evidence` the code actually enumerates.
    const candidatePathsOf = (expression, { prefixOnly = false, seen = new Set() } = {}) => {
      const candidates = [];
      let run = [];
      const flush = () => {
        for (let start = 0; start < run.length; start += 1) {
          if (prefixOnly && start > 0) break;
          for (let end = start; end < run.length && end - start < MAX_PATH_SEGMENTS; end += 1) {
            candidates.push({ length: end - start + 1, path: run.slice(start, end + 1).join('/') });
          }
        }
        run = [];
      };
      for (const segment of segmentsOf(expression, seen, 0)) {
        if (segment.dynamic) flush();
        else run.push(segment.value);
      }
      flush();
      return candidates.sort((a, b) => b.length - a.length).map((candidate) => candidate.path);
    };

    // A candidate resolves against the repository root or against the directory
    // of the script that names it. Returns the tracked path, or null.
    const resolveCandidate = (candidate) => {
      if (typeof candidate !== 'string' || candidate === '' || candidate.includes('\u0001')) return null;
      const rooted = normalizeRepoPath(candidate);
      if (tracked.has(rooted)) return rooted;
      if (candidate.startsWith('.')) {
        const relative = normalizeRepoPath(`${base}/${candidate}`);
        if (tracked.has(relative)) return relative;
      }
      return null;
    };

    // An interpolated literal counts as resolved only when a static chunk really
    // expands to tracked repository files.
    const interpolationResolves = (token) =>
      templateChunksOf(token).some((chunk) => {
        const normalized = normalizeRepoPath(chunk);
        return (
          normalized.includes('/') &&
          repoRoots.has(normalized.split('/')[0]) &&
          expandPrefix(normalized, tracked).length > 0
        );
      });

    // --- relative module specifiers -> EXEC / READ -----------------------------
    const specifierIndices = new Set();
    for (const source of [STATIC_FROM_RE, BARE_IMPORT_RE, CALL_SPECIFIER_RE]) {
      for (const match of skeleton.matchAll(source)) specifierIndices.add(match[1]);
    }
    for (const index of specifierIndices) {
      const specifier = literalOf(index);
      if (specifier.includes('${')) {
        // `import(`./${name}.mjs`)` — a real module load whose target is decided
        // at run time. It is recorded, never resolved to the static prefix.
        note(unresolvable, path, `interpolated module specifier is not statically resolvable: ${specifier}`);
        continue;
      }
      if (!specifier.startsWith('.')) continue; // a bare package specifier is not a repository file
      let resolved = null;
      for (const extension of MODULE_EXTENSIONS) {
        const candidate = normalizeRepoPath(`${base}/${specifier}${extension}`);
        if (tracked.has(candidate)) {
          resolved = candidate;
          break;
        }
        const indexCandidate = normalizeRepoPath(`${base}/${specifier}/index${extension || '.mjs'}`);
        if (extension === '' && tracked.has(indexCandidate)) {
          resolved = indexCandidate;
          break;
        }
      }
      if (resolved === null) {
        note(unresolvable, path, `relative specifier resolves to no tracked file: ${specifier}`);
        continue;
      }
      if (isExecutable(resolved)) enqueueExec(resolved, depth + 1, path);
      else addRead(resolved);
    }

    // --- literals used in a path/IO position -> READ ----------------------------
    const readCandidates = new Set();
    for (const match of skeleton.matchAll(PATH_CALL_RE)) {
      for (const inner of String(match[2]).matchAll(PLACEHOLDER_RE)) readCandidates.add(inner[1]);
      // The ORDERED JOIN of a call's literal segments is one path:
      // `join(ROOT, 'src', 'data', 'x.json')` denotes src/data/x.json, which the
      // per-literal rule alone would drop on the floor.
      for (const candidate of candidatePathsOf(match[2])) {
        const resolved = resolveCandidate(candidate);
        if (resolved !== null) addRead(resolved);
      }
    }
    for (const match of skeleton.matchAll(ASSIGNED_LITERAL_RE)) readCandidates.add(match[1]);
    for (const index of readCandidates) {
      const literal = literalOf(index);
      if (!literal.includes('/')) continue;
      const normalized = normalizeRepoPath(literal);
      if (tracked.has(normalized)) addRead(normalized);
    }

    // --- deterministic enumerations ---------------------------------------------
    // A directory enumeration resolves to the MOST SPECIFIC directory the
    // expression proves, and to that one only.
    const enumerated = (argsText) => {
      for (const candidate of candidatePathsOf(argsText, { prefixOnly: true })) {
        if (candidate === '') continue;
        const found = expandPrefix(`${normalizeRepoPath(candidate)}/`, tracked);
        if (found.length === 0) continue;
        for (const entry of found) addRead(entry);
        return true;
      }
      return false;
    };
    for (const match of skeleton.matchAll(READDIR_CALL_RE)) enumerated(match[1]);
    for (const token of strings) {
      if (token.quote !== '`' || !token.value.includes('${')) continue;
      for (const chunk of templateChunksOf(token)) {
        const normalized = normalizeRepoPath(chunk);
        if (!normalized.includes('/')) continue;
        // Only a chunk rooted at a tracked top-level directory is a repository
        // path construct. Anything else (a URL, a `/go/` route fragment) is not.
        if (!repoRoots.has(normalized.split('/')[0])) continue;
        const expanded = expandPrefix(normalized, tracked);
        if (expanded.length === 0) {
          note(unresolvable, path, `interpolated repository path expands to no tracked file: ${chunk}`);
          continue;
        }
        for (const found of expanded) addRead(found);
      }
    }

    // --- fail closed on a module load with no static specifier ------------------
    for (const match of skeleton.matchAll(DYNAMIC_MODULE_RE)) {
      note(unresolvable, path, `dynamic module load is not statically resolvable: ${match[0].replace(PLACEHOLDER_RE, "<literal>").trim()}`);
    }

    // --- fail closed on a CONTENT READ whose input is computed ------------------
    //
    // `readFileSync(target)`, `readFile(join(dir, name))`, `readFileSync(argv[2])`
    // all really read a repository file. The engine cannot say WHICH, so the
    // call is recorded as DEPENDENCY_UNRESOLVABLE against its originating script
    // instead of contributing nothing at all.
    for (const match of skeleton.matchAll(IO_READ_CALL_RE)) {
      const callName = match[1];
      const interpolated = [...String(match[2]).matchAll(PLACEHOLDER_RE)]
        .map((inner) => tokenOf(inner[1]))
        .filter((token) => String(token?.value ?? '').includes('${'));
      if (interpolated.some(interpolationResolves)) continue;
      if (candidatePathsOf(match[2]).some((candidate) => resolveCandidate(candidate) !== null)) continue;
      // A directory enumeration is resolved when the directory itself is proved
      // and really expands to tracked files.
      if (DIRECTORY_CALL_NAMES.has(callName) && enumerated(match[2])) continue;
      note(unresolvable, path, `computed ${callName}(…) input is not statically resolvable: ${describeCall(match[0], literalOf)}`);
    }

    // --- template `${…}` interiors are CODE, so scan them as code ---------------
    if (level < MAX_TEMPLATE_DEPTH) {
      const expressions = strings.flatMap((token) => token.expressions ?? []).filter((text) => /[(`]/.test(text));
      if (expressions.length) scanCodeText(expressions.join(';\n'), path, depth, level + 1);
    }
  }

  // --- a local `uses: ./…` action ---------------------------------------------
  function scanLocalAction(reference, depth) {
    localActions.add(reference);
    if (!budget(reference, 'local action')) return;
    const base = normalizeRepoPath(reference.replace(/^\.\//, ''));
    const candidates = /\.ya?ml$/.test(base) ? [base] : [`${base}/action.yml`, `${base}/action.yaml`];
    const manifestPath = candidates.find((candidate) => tracked.has(candidate));
    if (!manifestPath) {
      note(unresolvable, reference, `local \`uses:\` resolves to no tracked action manifest (tried ${candidates.join(', ')})`);
      return;
    }
    addRead(manifestPath);
    const text = readFile(manifestPath);
    if (typeof text !== 'string') {
      note(unreadable, manifestPath, 'local action manifest could not be read');
      return;
    }
    let manifest = null;
    try {
      manifest = yaml.load(text, { schema: yaml.CORE_SCHEMA });
    } catch (error) {
      note(unresolvable, manifestPath, `local action manifest does not parse: ${error.message}`);
      return;
    }
    const actionDir = manifestPath.split('/').slice(0, -1).join('/');
    for (const key of ['main', 'pre', 'post']) {
      const entry = manifest?.runs?.[key];
      if (typeof entry !== 'string') continue;
      const resolved = normalizeRepoPath(`${actionDir}/${entry}`);
      if (!enqueueExec(resolved, depth + 1, manifestPath)) {
        note(unresolvable, manifestPath, `local action \`runs.${key}\` resolves to no tracked file: ${entry}`);
      }
    }
    for (const step of Array.isArray(manifest?.runs?.steps) ? manifest.runs.steps : []) {
      if (typeof step?.run === 'string') scanShellText(step.run, depth + 1, manifestPath);
      if (typeof step?.uses === 'string' && step.uses.startsWith('./')) scanLocalAction(step.uses, depth + 1);
    }
  }

  // --- seed from the job -------------------------------------------------------
  for (const step of Array.isArray(job?.steps) ? job.steps : []) {
    if (typeof step?.run === 'string') scanShellText(step.run, 0, 'workflow step');
    if (typeof step?.uses === 'string' && step.uses.startsWith('./')) scanLocalAction(step.uses, 0);
  }
  if (typeof job?.uses === 'string' && job.uses.startsWith('./')) scanLocalAction(job.uses, 0);

  while (queue.length) {
    const { path, depth } = queue.shift();
    scanSourceFile(path, depth);
  }

  // A file both executed and read is an EXEC dependency; do not double-list it.
  for (const path of executed) readInputs.delete(path);

  return {
    npmScripts: [...npmScripts].sort(),
    executed: [...executed].sort(),
    readInputs: [...readInputs].sort(),
    localActions: [...localActions].sort(),
    unresolvable: unresolvable.sort(),
    unreadable: unreadable.sort(),
  };
}

// --- per-job derivation -------------------------------------------------------

export function deriveJobFacts({ workflowFile, workflowDoc, jobId, packageScripts, repoFiles = [], readFile = () => null }) {
  const job = workflowDoc?.jobs?.[jobId];
  const trigger = derivePullRequestTrigger(workflowDoc);

  const branches = trigger.branches;
  const paths = trigger.paths;
  const pathsIgnore = trigger.pathsIgnore;
  const pathFiltered = Boolean(paths || pathsIgnore);

  const jobIf = Object.prototype.hasOwnProperty.call(job ?? {}, 'if') ? String(job.if) : null;
  const ifState = evaluateJobIfForPullRequest(job?.if);
  const continueOnError = evaluateContinueOnError(job?.['continue-on-error']);

  // --- classification ----------------------------------------------------------
  // Order matters. Anything unprovable wins over every other outcome so that a
  // fail-closed job can never be reported as BLOCKING (which would make it look
  // direct-required-safe) nor as ADVISORY (which would make it look harmless).
  let classification;
  if (!trigger.modeled) classification = 'UNMODELED';
  else if (!trigger.hasPullRequest || !trigger.targetsMaster) classification = 'NON_PR';
  else if (ifState === 'UNMODELED' || continueOnError.state === 'UNMODELED') classification = 'UNMODELED';
  else if (ifState === 'NEVER') classification = 'CONDITIONAL_PRODUCTION_ONLY';
  else if (continueOnError.value === true) classification = 'ADVISORY';
  else classification = 'BLOCKING';

  const steps = Array.isArray(job?.steps) ? job.steps : [];
  const softenedSteps = steps.filter((step) => evaluateContinueOnError(step?.['continue-on-error']).value === true).length;
  const commands = extractCommands(job);
  const closure = deriveDependencyClosure({ job, packageScripts, repoFiles, readFile });
  const sharedConfig = deriveSharedConfigDependencies(commands);

  // Path-filtered => the context is NOT reported on every PR to master, so a
  // branch-protection rule naming it deadlocks on "Expected — Waiting for
  // status to be reported" for any PR that touches none of its paths. An
  // UNMODELED job is never direct-required-safe.
  const directRequiredSafe = classification === 'BLOCKING' && !pathFiltered;

  // --- trigger coverage -------------------------------------------------------
  const ownWorkflowPath = `.github/workflows/${workflowFile}`;
  const covers = (candidate) => {
    if (!trigger.modeled) return null;
    if (!pathFiltered) return true;
    if (pathsIgnore) return null; // unresolvable by this model — fail closed
    let covered = false;
    for (const pattern of paths) {
      const match = matchesPathPattern(pattern, candidate);
      if (match === null) return null; // an uncompilable filter is never "not covered"
      if (match) covered = true;
    }
    return covered;
  };

  const coveredInputs = [];
  const uncoveredInputs = [];
  const unresolvableInputs = [];
  const classify = (candidate) => {
    const result = covers(candidate);
    if (result === null) unresolvableInputs.push(candidate);
    else if (result) coveredInputs.push(candidate);
    else uncoveredInputs.push(candidate);
  };
  for (const candidate of [...closure.executed, ...closure.readInputs, ...sharedConfig]) classify(candidate);
  const ownWorkflowCoverage = covers(ownWorkflowPath);

  const triggerCoverage = {
    modeled: trigger.modeled,
    unmodeledReason: trigger.reason,
    hasPullRequest: trigger.hasPullRequest,
    pathFiltered,
    paths: paths ?? [],
    pathsIgnore: pathsIgnore ?? [],
    branches: branches ?? [],
    branchesIgnore: trigger.branchesIgnore ?? [],
    types: trigger.types ?? [],
    targetsMaster: trigger.targetsMaster,
    selfTriggersOnOwnWorkflowFile: ownWorkflowCoverage === true,
    coveredInputs: coveredInputs.sort(),
    uncoveredInputs: uncoveredInputs.sort(),
    unresolvableInputs: unresolvableInputs.sort(),
  };

  // --- gaps (fully derived; the snapshot must reproduce this set exactly) ------
  //
  // Trigger/reporting gaps are only meaningful for a job that can actually run
  // on a pull request. Deriving them for a job that never runs on PRs (the
  // production release job, the scheduled monitors) would fill the contract
  // with findings nobody can act on and dilute the ones that matter.
  const knownGaps = [];
  const gap = (code, detail) => knownGaps.push({ code, detail });
  const runsOnPullRequests = classification === 'BLOCKING' || classification === 'ADVISORY';

  if (!trigger.modeled) gap('UNMODELED_TRIGGER', String(trigger.reason));
  if (ifState === 'UNMODELED') gap('UNMODELED_JOB_IF', String(job?.if));
  if (continueOnError.state === 'UNMODELED') gap('UNMODELED_CONTINUE_ON_ERROR', String(continueOnError.source));

  if (classification === 'BLOCKING' && pathFiltered) {
    gap(
      'PATH_FILTERED_NOT_ALWAYS_REPORTING',
      'pull_request path filter means this context is not reported on every PR to master; naming it directly in branch protection would deadlock on "Expected - Waiting for status to be reported"',
    );
  }
  if (runsOnPullRequests && branches === null && trigger.branchesIgnore === null) {
    gap('NO_BRANCH_FILTER', 'pull_request trigger declares no branches filter, so it runs on PRs to every branch');
  }
  if (runsOnPullRequests && pathFiltered && ownWorkflowCoverage !== true) {
    gap('TRIGGER_GAP_OWN_WORKFLOW_FILE', ownWorkflowPath);
  }
  if (runsOnPullRequests) {
    for (const path of triggerCoverage.uncoveredInputs) {
      if (sharedConfig.includes(path)) gap('TRIGGER_GAP_SHARED_CONFIG', path);
      else if (closure.executed.includes(path)) gap('TRIGGER_GAP_SCRIPT', path);
      else gap('TRIGGER_GAP_INPUT', path);
    }
    for (const path of triggerCoverage.unresolvableInputs) {
      gap('TRIGGER_COVERAGE_UNRESOLVABLE', path);
    }
  }
  for (const detail of closure.unresolvable) gap('DEPENDENCY_UNRESOLVABLE', detail);
  for (const detail of closure.unreadable) gap('DEPENDENCY_UNREADABLE', detail);

  if (classification === 'BLOCKING' && /advisory/i.test(workflowFile)) {
    gap('MISLEADING_ADVISORY_FILENAME', workflowFile);
  }
  if (classification === 'BLOCKING' && /non-blocking/i.test(String(job?.name ?? ''))) {
    gap('MISLEADING_NON_BLOCKING_JOB_NAME', String(job?.name ?? ''));
  }
  knownGaps.sort((a, b) => (a.code + a.detail).localeCompare(b.code + b.detail));

  return {
    workflowFile,
    workflowName: workflowDoc?.name ?? null,
    jobId,
    checkContext: job?.name ?? jobId,
    classification,
    directRequiredSafe,
    pathFiltered,
    blockingSemantics: {
      canFailPullRequest: classification === 'BLOCKING',
      semanticsProvable: classification !== 'UNMODELED',
      jobContinueOnError: continueOnError.value,
      jobContinueOnErrorState: continueOnError.state,
      jobContinueOnErrorSource: continueOnError.source,
      jobIf,
      jobIfPullRequestState: ifState,
      needs: job?.needs ? (Array.isArray(job.needs) ? job.needs : [job.needs]) : [],
      totalSteps: steps.length,
      softenedSteps,
      failableSteps: steps.length - softenedSteps,
      timeoutMinutes: typeof job?.['timeout-minutes'] === 'number' ? job['timeout-minutes'] : null,
    },
    commands,
    dependencies: {
      npmScripts: closure.npmScripts,
      executed: closure.executed,
      readInputs: closure.readInputs,
      localActions: closure.localActions,
      sharedConfig,
    },
    triggerCoverage,
    knownGaps,
  };
}

// Every job of every workflow file, in a stable order.
export function deriveInventory({ files, packageScripts, repoFiles = [], readFile = () => null }) {
  const entries = [];
  const parseErrors = [];
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    let doc = null;
    try {
      doc = parseWorkflow(file.text);
    } catch (error) {
      parseErrors.push({ path: file.path, message: String(error.message) });
      continue;
    }
    if (!doc || typeof doc !== 'object') {
      parseErrors.push({ path: file.path, message: 'workflow did not parse to an object' });
      continue;
    }
    const workflowFile = file.path.split('/').pop();
    for (const jobId of Object.keys(doc.jobs ?? {})) {
      entries.push(deriveJobFacts({ workflowFile, workflowDoc: doc, jobId, packageScripts, repoFiles, readFile }));
    }
  }
  return { entries, parseErrors };
}

// --- portfolio-side derived fields -------------------------------------------

// Stage-2 candidacy is a DERIVED statement about today, not a plan: a check is
// a candidate exactly when it can fail a PR, still reports outside the unified
// gate, and cannot be required directly (because its path filter means it does
// not report on every PR). Those are precisely the gates whose enforcement is
// unreachable from branch protection as things stand.
export function deriveStage2Candidacy(entry, migrationState) {
  const candidate =
    entry.classification === 'BLOCKING' &&
    migrationState === 'LEGACY_EXTERNAL' &&
    entry.directRequiredSafe === false;
  const reason = candidate
    ? 'blocking-capable, still external to the unified gate, and not directly requirable because it is path-filtered'
    : entry.classification !== 'BLOCKING'
      ? `not blocking-capable (${entry.classification})`
      : migrationState !== 'LEGACY_EXTERNAL'
        ? `not external to the unified gate (${migrationState})`
        : 'already always-reporting, so it can be required directly without migration';
  return { candidate, reason };
}

// --- the audit ----------------------------------------------------------------

const IDENTITY_FIELDS = Object.freeze([
  'workflowFile',
  'workflowName',
  'jobId',
  'checkContext',
  'classification',
  'directRequiredSafe',
  'pathFiltered',
]);

const DERIVED_DEEP_FIELDS = Object.freeze([
  'blockingSemantics',
  'commands',
  'dependencies',
  'triggerCoverage',
  'knownGaps',
]);

const REQUIRED_ENTRY_FIELDS = Object.freeze([
  'id',
  ...IDENTITY_FIELDS,
  ...DERIVED_DEEP_FIELDS,
  'migrationState',
  'stage2MigrationCandidate',
  'stage2MigrationCandidateReason',
]);

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stable(value) {
  return JSON.stringify(value);
}

/**
 * @param {object} input
 * @param {string} input.portfolioText raw contents of the portfolio JSON
 * @param {{path: string, text: string}[]} input.files every tracked workflow file
 * @param {Record<string,string>} input.packageScripts package.json `scripts`
 * @param {(path: string) => boolean} input.exists existence probe for dependency paths
 * @param {string[]} input.repoFiles every tracked repository path
 * @param {(path: string) => (string|null)} input.readFile source reader for the closure
 * @returns {{label: string, ok: boolean, detail: string}[]}
 */
export function auditPortfolio({ portfolioText, files, packageScripts, exists, repoFiles = [], readFile = () => null }) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail: String(detail) });

  // --- 0. the machine-readable file parses STRICTLY --------------------------
  let portfolio = null;
  try {
    portfolio = JSON.parse(portfolioText);
  } catch (error) {
    check('portfolio file parses as strict JSON', false, String(error.message));
    return results;
  }
  check('portfolio file parses as strict JSON', true);
  check(
    'portfolio root is a non-null, non-array object',
    portfolio !== null && typeof portfolio === 'object' && !Array.isArray(portfolio),
    stable(portfolio).slice(0, 120),
  );
  if (portfolio === null || typeof portfolio !== 'object' || Array.isArray(portfolio)) return results;

  // --- 0b. STRICT ROOT SCHEMA ------------------------------------------------
  // Exact key set: every required root key present, no unknown root key, and a
  // schemaVersion pinned to the ONE version this engine understands. A future
  // version is a code change here, never a silently accepted file.
  const rootKeys = Object.keys(portfolio);
  for (const key of ROOT_KEYS) {
    check(`portfolio declares required root key "${key}"`, Object.prototype.hasOwnProperty.call(portfolio, key));
  }
  const unknownRootKeys = rootKeys.filter((key) => !ROOT_KEYS.includes(key));
  check('portfolio declares no unknown root keys', unknownRootKeys.length === 0, unknownRootKeys.join(','));
  check(
    'portfolio schemaVersion is a number',
    typeof portfolio.schemaVersion === 'number' && Number.isInteger(portfolio.schemaVersion),
    `${typeof portfolio.schemaVersion}: ${stable(portfolio.schemaVersion)}`,
  );
  check(
    `portfolio schemaVersion is exactly ${SCHEMA_VERSION} (future versions are NOT silently accepted)`,
    portfolio.schemaVersion === SCHEMA_VERSION,
    `stored=${stable(portfolio.schemaVersion)} supported=${SCHEMA_VERSION}`,
  );
  check('portfolio issue is a number', typeof portfolio.issue === 'number');
  check('portfolio stage is a non-empty string', typeof portfolio.stage === 'string' && portfolio.stage.length > 0);
  check(
    'portfolio description is a non-empty string',
    typeof portfolio.description === 'string' && portfolio.description.length > 0,
  );
  check(
    'portfolio totals is a non-null, non-array object',
    portfolio.totals !== null && typeof portfolio.totals === 'object' && !Array.isArray(portfolio.totals),
    stable(portfolio.totals),
  );
  check('portfolio declares its vocabularies', Array.isArray(portfolio.classifications) && Array.isArray(portfolio.migrationStates));
  check(
    'portfolio classification vocabulary matches the closed engine vocabulary',
    stable(portfolio.classifications) === stable(CLASSIFICATIONS),
    stable(portfolio.classifications),
  );
  check(
    'portfolio migration-state vocabulary matches the closed engine vocabulary',
    stable(portfolio.migrationStates) === stable(MIGRATION_STATES),
    stable(portfolio.migrationStates),
  );
  check(
    'portfolio gap-code vocabulary matches the closed engine vocabulary',
    stable(portfolio.gapCodes) === stable(GAP_CODES),
    stable(portfolio.gapCodes),
  );

  const stored = portfolio.entries;
  check('portfolio declares an entries array', Array.isArray(stored));
  if (!Array.isArray(stored)) return results;
  check('portfolio entries array is non-empty', stored.length > 0);

  // --- 1. structural integrity of every stored entry -------------------------
  const seenIds = new Set();
  const contextOwners = new Map();
  for (const [index, entry] of stored.entries()) {
    const label = entry?.id ?? `#${index}`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      check(`entry ${label} is a JSON object`, false, stable(entry));
      continue;
    }
    for (const field of REQUIRED_ENTRY_FIELDS) {
      check(
        `entry ${label} declares required field "${field}"`,
        Object.prototype.hasOwnProperty.call(entry, field),
      );
    }
    const unknownFields = Object.keys(entry).filter(
      (key) => !REQUIRED_ENTRY_FIELDS.includes(key) && key !== 'notes' && key !== 'contextCollisionJustification',
    );
    check(`entry ${label} declares no unknown fields`, unknownFields.length === 0, unknownFields.join(','));

    check(`entry ${label} has a kebab-case id`, typeof entry.id === 'string' && ID_RE.test(entry.id), String(entry.id));
    check(`entry ${label} id is unique`, !seenIds.has(entry.id), 'duplicate portfolio id');
    seenIds.add(entry.id);

    check(
      `entry ${label} classification is in the closed vocabulary`,
      CLASSIFICATIONS.includes(entry.classification),
      String(entry.classification),
    );
    check(
      `entry ${label} migrationState is in the closed vocabulary`,
      MIGRATION_STATES.includes(entry.migrationState),
      String(entry.migrationState),
    );
    for (const gapEntry of Array.isArray(entry.knownGaps) ? entry.knownGaps : []) {
      check(
        `entry ${label} gap code "${gapEntry?.code}" is in the closed vocabulary`,
        GAP_CODES.includes(gapEntry?.code),
        String(gapEntry?.code),
      );
    }

    // Duplicate stable contexts are only tolerable with an explicit written
    // justification — two jobs reporting the same context name make a required
    // status ambiguous.
    const context = entry.checkContext;
    if (contextOwners.has(context)) {
      const justified =
        typeof entry.contextCollisionJustification === 'string' &&
        entry.contextCollisionJustification.trim().length > 0;
      check(
        `duplicate check context "${context}" carries an explicit justification`,
        justified,
        `also claimed by ${contextOwners.get(context)}`,
      );
    } else {
      contextOwners.set(context, entry.id);
      check(
        `entry ${label} declares no unnecessary context-collision justification`,
        !Object.prototype.hasOwnProperty.call(entry, 'contextCollisionJustification'),
        'no collision exists for this context',
      );
    }
  }

  // --- 2. derive repository truth -------------------------------------------
  const { entries: derived, parseErrors } = deriveInventory({ files, packageScripts, repoFiles, readFile });
  check('every workflow file parses as YAML', parseErrors.length === 0, stable(parseErrors));
  check('workflow inventory is non-empty (fail closed on an empty scan)', derived.length > 0);

  const keyOf = (entry) => `${entry.workflowFile}#${entry.jobId}`;

  // --- 2b. FAIL CLOSED: semantics must be PROVABLE ----------------------------
  // This is an ABSOLUTE assertion about repository truth, not a comparison with
  // the snapshot, so synchronising the snapshot to an UNMODELED value cannot
  // make the audit pass. Explicit modelling is the only remedy.
  for (const entry of derived) {
    check(
      `discovered job ${keyOf(entry)} has PROVABLE pull_request semantics`,
      entry.classification !== 'UNMODELED',
      entry.knownGaps
        .filter((gapEntry) => FAIL_CLOSED_GAP_CODES.includes(gapEntry.code))
        .map((gapEntry) => `${gapEntry.code}: ${gapEntry.detail}`)
        .join(' | ') || 'semantics could not be derived from the workflow YAML',
    );
    const failClosed = entry.knownGaps.filter((gapEntry) => FAIL_CLOSED_GAP_CODES.includes(gapEntry.code));
    check(
      `discovered job ${keyOf(entry)} raises no fail-closed modelling gap`,
      failClosed.length === 0,
      failClosed.map((gapEntry) => `${gapEntry.code}: ${gapEntry.detail}`).join(' | '),
    );
  }

  const derivedByKey = new Map(derived.map((entry) => [keyOf(entry), entry]));
  const storedByKey = new Map();
  for (const entry of stored) {
    if (entry && typeof entry === 'object') storedByKey.set(`${entry.workflowFile}#${entry.jobId}`, entry);
  }
  check(
    'no two portfolio entries claim the same workflow/job pair',
    storedByKey.size === stored.length,
    `${stored.length} entries, ${storedByKey.size} distinct workflow#job keys`,
  );

  // --- 3. COVERAGE: every discovered job is classified ------------------------
  for (const entry of derived) {
    const key = keyOf(entry);
    check(
      `discovered job ${key} is represented in the portfolio`,
      storedByKey.has(key),
      `classification would be ${entry.classification}; add an explicit portfolio entry`,
    );
  }
  // Blocking-capable jobs get their own, louder assertion so a coverage failure
  // is never mistaken for a cosmetic bookkeeping miss.
  for (const entry of derived.filter((candidate) => candidate.classification === 'BLOCKING')) {
    check(
      `BLOCKING-capable job ${keyOf(entry)} is explicitly classified`,
      storedByKey.has(keyOf(entry)),
      'a new blocking-capable PR workflow requires explicit classification',
    );
  }

  // --- 4. NO SILENT DISAPPEARANCE --------------------------------------------
  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const key = `${entry.workflowFile}#${entry.jobId}`;
    const match = derivedByKey.get(key);
    const known = files.some((file) => file.path === `.github/workflows/${entry.workflowFile}`);
    check(`portfolio entry ${entry.id} points at an existing workflow file`, known, entry.workflowFile);
    check(
      `portfolio entry ${entry.id} points at an existing job (${key})`,
      Boolean(match),
      match ? '' : 'workflow/job no longer exists — a blocking entry must never silently disappear',
    );
    if (entry.classification === 'BLOCKING') {
      check(
        `BLOCKING portfolio entry ${entry.id} has not silently vanished from the repository`,
        Boolean(match) && match.classification === 'BLOCKING',
        match ? `now derives as ${match.classification}` : 'job no longer exists',
      );
    }
    if (!match) continue;

    // --- 5. NO SILENT DRIFT in any derivable field ---------------------------
    for (const field of IDENTITY_FIELDS) {
      check(
        `portfolio entry ${entry.id} field "${field}" matches the workflow YAML`,
        stable(entry[field]) === stable(match[field]),
        `stored=${stable(entry[field])} actual=${stable(match[field])}`,
      );
    }
    for (const field of DERIVED_DEEP_FIELDS) {
      check(
        `portfolio entry ${entry.id} field "${field}" matches the workflow YAML`,
        stable(entry[field]) === stable(match[field]),
        `stored=${stable(entry[field])} actual=${stable(match[field])}`,
      );
    }

    // --- 6. migrationState / candidacy consistency ---------------------------
    if (match.classification === 'NON_PR' || match.classification === 'CONDITIONAL_PRODUCTION_ONLY') {
      check(
        `portfolio entry ${entry.id} is NOT_APPLICABLE for migration (it cannot run as a PR gate)`,
        entry.migrationState === 'NOT_APPLICABLE',
        String(entry.migrationState),
      );
    } else {
      check(
        `portfolio entry ${entry.id} does not claim NOT_APPLICABLE while running on PRs`,
        entry.migrationState !== 'NOT_APPLICABLE',
        String(entry.migrationState),
      );
    }
    const candidacy = deriveStage2Candidacy(match, entry.migrationState);
    check(
      `portfolio entry ${entry.id} stage-2 candidacy is derived, not asserted`,
      entry.stage2MigrationCandidate === candidacy.candidate,
      `stored=${entry.stage2MigrationCandidate} derived=${candidacy.candidate}`,
    );
    check(
      `portfolio entry ${entry.id} stage-2 candidacy reason matches the derivation`,
      entry.stage2MigrationCandidateReason === candidacy.reason,
      `stored=${stable(entry.stage2MigrationCandidateReason)}`,
    );

    // --- 7. declared dependencies really exist -------------------------------
    if (typeof exists === 'function') {
      for (const path of entry.dependencies?.executed ?? []) {
        check(`portfolio entry ${entry.id} executed dependency "${path}" exists on disk`, exists(path), path);
      }
      for (const path of entry.dependencies?.readInputs ?? []) {
        check(`portfolio entry ${entry.id} read input "${path}" exists on disk`, exists(path), path);
      }
      for (const path of entry.dependencies?.sharedConfig ?? []) {
        check(`portfolio entry ${entry.id} shared config "${path}" exists on disk`, exists(path), path);
      }
    }
    for (const name of entry.dependencies?.npmScripts ?? []) {
      check(
        `portfolio entry ${entry.id} npm script "${name}" is defined in package.json`,
        Object.prototype.hasOwnProperty.call(packageScripts ?? {}, name),
        name,
      );
    }
  }

  // --- 8. the recorded totals must match the derivation ----------------------
  const totals = {};
  for (const value of CLASSIFICATIONS) {
    totals[value] = derived.filter((entry) => entry.classification === value).length;
  }
  totals.total = derived.length;
  totals.directRequiredSafe = derived.filter((entry) => entry.directRequiredSafe).length;
  check(
    'portfolio totals match the derived inventory',
    stable(portfolio.totals) === stable(totals),
    `stored=${stable(portfolio.totals)} derived=${stable(totals)}`,
  );
  check(
    'portfolio entry count matches the discovered job count',
    stored.length === derived.length,
    `${stored.length} stored vs ${derived.length} discovered`,
  );

  // --- 9. exactly one always-reporting unified gate host ----------------------
  const hosts = stored.filter((entry) => entry?.migrationState === 'UNIFIED_GATE_HOST');
  check('exactly one entry is the unified gate host', hosts.length === 1, `found ${hosts.length}`);
  check(
    'the unified gate host is BLOCKING and directly requirable',
    hosts.length === 1 && hosts[0].classification === 'BLOCKING' && hosts[0].directRequiredSafe === true,
    hosts.length === 1 ? `${hosts[0].classification}/${hosts[0].directRequiredSafe}` : '',
  );

  return results;
}
