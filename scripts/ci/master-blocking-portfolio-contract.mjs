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

// TWO SEPARATE CONTRACTS LIVE IN THIS FILE. Conflating them is the defect the
// R6 review named, so the boundary is stated here once, in code:
//
//   INTEGRITY (auditPortfolio)  — "is the snapshot a TRUE statement about the
//       repository as it is today?" A gap the engine has faithfully RECORDED is
//       DATA for this question. Truthfully recording "I cannot resolve this
//       dependency" is a correct statement about repository truth, not a
//       contradiction of it, so it must not fail integrity merely by existing.
//
//   ENFORCEMENT READINESS (evaluateEnforcementReadiness) — "may this portfolio
//       be used as blocking enforcement authority?" There, an unresolved
//       dependency inside blocking authority IS disqualifying, because the
//       enforcement decision would rest on a dependency surface nobody has
//       proven.
//
// Integrity PASS therefore NEVER implies enforcement authority. See
// AUTHORITY_RULE below.

// Gap codes that mean "this engine could not prove SEMANTICS" — what the job is
// (does it run on PRs, can it fail one). Any of them on any discovered job is an
// unconditional INTEGRITY failure, because the snapshot cannot describe a job
// whose meaning was never established, and synchronising the snapshot to an
// unprovable value must never buy a pass.
//
// DEPENDENCY_UNRESOLVABLE is deliberately NOT in this list. It does not make the
// job's semantics unprovable; it states, truthfully, that part of the job's
// dependency surface is outside the bounded model. Integrity holds it to a
// FIDELITY standard instead (the recorded facts must match the live derivation
// exactly — see the unresolved-dependency fidelity checks in `auditPortfolio`),
// and ENFORCEMENT READINESS is where it disqualifies.
//
// DEPENDENCY_UNREADABLE stays fail-closed: an executed file the engine could not
// READ is a hole in the derivation itself, so no snapshot claim about that job's
// dependencies can be called true.
export const FAIL_CLOSED_GAP_CODES = Object.freeze([
  'UNMODELED_TRIGGER',
  'UNMODELED_JOB_IF',
  'UNMODELED_CONTINUE_ON_ERROR',
  'DEPENDENCY_UNREADABLE',
]);

// Gap codes that disqualify an entry from BLOCKING ENFORCEMENT AUTHORITY without
// making the snapshot untruthful.
export const ENFORCEMENT_BLOCKING_GAP_CODES = Object.freeze(['DEPENDENCY_UNRESOLVABLE']);

// The one-line authority statement every consumer of this contract must honour.
export const AUTHORITY_RULE = Object.freeze({
  statement:
    'Portfolio integrity is an inventory-truth result ONLY. A passing integrity audit confers no branch-protection, merge or deploy authority; enforcement authority requires a separate PASSING enforcement-readiness evaluation, which is required only at later migration/protection-activation stages.',
  integrityImpliesEnforcementAuthority: false,
});

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

// The EXACT set of leaf identifiers this engine models. Anything else — a
// `github.ref`, a `vars.X`, a `contains(…)` — is outside the model.
const MODELED_IDENTIFIERS = Object.freeze(['true', 'false', 'github.event_name']);
const MODELED_FUNCTIONS = Object.freeze(['always']);

/**
 * MODELABILITY IS DECIDED BEFORE EVALUATION, OVER THE WHOLE TOKEN STREAM.
 *
 * GitHub's `&&` / `||` short-circuit at RUN TIME, but governance modelling is a
 * statement about SYNTAX: `false && github.ref == 'refs/heads/master'` mentions
 * `github.ref`, which this engine does not model, so the expression is UNMODELED
 * even though a run-time evaluator could decide it without ever looking right of
 * the `&&`. Letting short-circuit erase the unsupported operand would silently
 * launder unmodelled surface into a "provable" classification — exactly the
 * permissive guess the whole engine refuses to make.
 *
 * Every reachable syntactic sub-expression is therefore checked here, before
 * `evaluateTokens` is allowed to short-circuit anything. The operator/punctuation
 * vocabulary is already closed by `tokenizeExpression` (an unrecognised character
 * makes the whole expression unmodelled), so the remaining surface to validate is
 * the identifier/function leaves.
 *
 * @returns {boolean} true when EVERY leaf in the stream is inside the model.
 */
export function expressionIsFullyModeled(tokens) {
  if (!Array.isArray(tokens)) return false;
  for (const [index, token] of tokens.entries()) {
    if (token.type !== 'ident') continue;
    const isCall = tokens[index + 1]?.type === '(';
    if (isCall) {
      // A modelled function is `name` `(` `)` and nothing else: an argument list
      // is a form this engine does not model, even for a modelled name.
      if (!MODELED_FUNCTIONS.includes(token.value)) return false;
      if (tokens[index + 2]?.type !== ')') return false;
      continue;
    }
    // A modelled function name used OUTSIDE a call (`always && x`) is not a
    // modelled value either.
    if (!MODELED_IDENTIFIERS.includes(token.value)) return false;
  }
  return true;
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
  // operand of `||`) decides the whole expression. This is only sound because
  // `evaluateGithubExpression` has ALREADY proved, over the whole token stream,
  // that no sub-expression is outside the model — see `expressionIsFullyModeled`.
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
  // WHOLE-TREE MODELABILITY FIRST. Short-circuit evaluation may only run once
  // every reachable sub-expression is known to be inside the model, so no
  // unsupported operand can be hidden behind a `false &&` or a `true ||`.
  if (!expressionIsFullyModeled(tokens)) return UNMODELED;
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
//     * `find <dir> … -name '<pat>'` in a `run:` block, at any shell command
//       position, INCLUDING behind a modelled command wrapper (`command find …`,
//       `env LC_ALL=C find …`, `bash -c "find …"`)
//
//   FAIL CLOSED — recorded, never silently dropped:
//     * DEPENDENCY_UNREADABLE — an EXEC target that cannot be read (hard audit failure)
//     * DEPENDENCY_UNRESOLVABLE — a dynamic `import()`/`require()`, an
//       unresolvable relative specifier, a local `uses: ./…` that resolves to no
//       tracked action, a command-wrapper form outside the modelled subset, or a
//       closure that hit its node/depth bound
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
// A whole WORD that is shaped like a repository path. Used only to decide
// whether an UNSUPPORTED glob form is worth reporting, so it deliberately
// accepts the metacharacters `PATH_TOKEN_RE` excludes.
const SHELL_PATH_LIKE_RE = /^[.A-Za-z0-9_][^\s]*\/[^\s]*$/;
// Glob syntax the bounded engine does not model. A word carrying any of these
// UNQUOTED is reported, never silently expanded to nothing.
const UNSUPPORTED_GLOB_CHAR_RE = /[[\]{}+]/;
// `find` options this engine models. `-name` selects; `-type`/`-print`/`-print0`
// do not change WHICH files are visited. EVERY other option is outside the
// subset => DEPENDENCY_UNRESOLVABLE, never an approximation.
const FIND_SUPPORTED_OPTIONS = Object.freeze(['-name', '-type', '-print', '-print0']);
const FIND_OPTIONS_WITH_VALUE = Object.freeze(['-name', '-type']);
const MODULE_EXTENSIONS = Object.freeze(['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '.json']);

// --- bounded shell tokenizer ---------------------------------------------------
//
// A `run:` block is SHELL, not text. Deciding "is this word a command?" with a
// regex anchored at "start of line, `;`, `|`, `&` or `(`" silently omits every
// other real command position — `if find …`, `then find …`, `do find …`,
// `{ find …`, an `elif`/`else`/`while`/`until` head — and simultaneously
// mistakes the word `find` inside `echo '(find …)'` for an invocation, because
// a regex cannot tell an executable token from quoted DATA.
//
// This tokenizer is the bounded replacement. It is NOT a shell: it recognises
// exactly the structure the governance model needs — word boundaries, quoting,
// escaping, command substitution and command position — and every construct
// outside that structure is REPORTED (so the caller emits
// DEPENDENCY_UNRESOLVABLE) rather than skipped.
//
//   command position = start of script | newline | `;` | `;;` | `&&` | `||`
//                    | `|` | `&` | `(` | `)` | `{` | `}` | after one of the
//                      control keywords below | after a `VAR=value` prefix
//                    | the command a modelled WRAPPER runs (see ARGV_WRAPPERS)
//
// `)` is included because it is how a `case` arm introduces its command list.

const SHELL_SEPARATORS = Object.freeze([';;', '&&', '||', ';', '|', '&', '(', ')', '{', '}', '\n']);
// Keywords that occupy no command slot: the word after them is still a command.
const SHELL_COMMAND_KEYWORDS = Object.freeze([
  'if',
  'then',
  'elif',
  'else',
  'while',
  'until',
  'do',
  // `time` is NOT here: it is a WRAPPER (`time -p find …` would otherwise put
  // `-p` in command position and hide the `find`). See ARGV_WRAPPERS.
  '!',
]);
const SHELL_ASSIGNMENT_PREFIX_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;
// Constructs whose expansion this engine does not model. These are OPERATORS,
// so they only count when the tokenizer meets them in EXECUTABLE position:
// `echo '<< documentation text'` and `echo "<(not executable)"` are DATA and
// must produce neither a dependency nor an unresolvable row. The detection
// therefore happens inside the lexical scan below, never against raw text.
const SHELL_UNMODELED_CONSTRUCTS = Object.freeze([
  ['<<', 'here-document redirection'],
  ['<(', 'process substitution'],
  ['>(', 'process substitution'],
]);
const MAX_SHELL_SUBSTITUTION_DEPTH = 4;

// --- command wrappers ----------------------------------------------------------
//
// A wrapper is a command whose ARGUMENTS are themselves a command: `command find
// …`, `env LC_ALL=C find …`, `bash -c "find …"`. Reading only the head word
// makes the wrapped command — and every dependency it carries — disappear
// silently, which is exactly the failure mode this contract exists to prevent.
//
// The rule is uniform and has no third option: a wrapper is either UNWRAPPED
// deterministically (the wrapped words are re-resolved as a command in their own
// right) or it is REPORTED, so the caller emits DEPENDENCY_UNRESOLVABLE. No
// wrapper form is ever skipped.

// Wrappers that exec the remaining words as a command in the same argument
// vector, with the option set this engine is willing to model. Every OTHER
// option is outside the subset and is reported.
//
//   command  POSIX "run this command, ignoring functions/aliases". `-p` only
//            changes the PATH searched, not WHICH command runs.
//   exec     replaces the shell with the wrapped command — same dependencies.
//   nohup    runs the wrapped command detached — same dependencies.
//   time     times the wrapped command. `-p` selects POSIX output only.
//   builtin  is intentionally NOT peeled. It can only invoke a shell builtin;
//            treating an external dependency command such as `find` as its
//            operand would invent execution that Bash never performs.
const ARGV_WRAPPERS = Object.freeze({
  command: ['-p'],
  exec: [],
  nohup: [],
  time: ['-p'],
});
// Shells whose `-c` argument is a nested shell PROGRAM (a literal one is parsed
// recursively; a computed one is reported).
const SHELL_C_COMMANDS = Object.freeze(['sh', 'bash', 'dash', 'ksh', 'zsh']);
// A path-qualified executable is normalised only when its EXACT literal path is
// a key of this closed map. A basename test would be a trust hole: `/custom/bash`
// and `/evil/find` are not the shell and the finder this engine models, they are
// arbitrary programs that merely borrowed a familiar file name, and modelling
// them would invent dependency facts (or, worse, silently resolve none) for code
// the engine has never seen.
//
// The set is derived deliberately, not generated: it is exactly the two
// directories in which a POSIX/FHS system installs the tools this engine models
// (`/bin` and `/usr/bin`, which are the same directory on a merged-/usr system)
// crossed with the modelled executables themselves — the sh-family shells whose
// `-c` program is parsed recursively, plus `env`, `find` and `nohup`. Any other
// location (`/usr/local/bin`, `/opt/homebrew/bin`, a relative `./bin/bash`, a
// path with a `.` or `..` segment) is a different installation this engine has
// not audited, so it stays outside the model and fails closed.
const PATH_QUALIFIED_COMMAND_PATHS = Object.freeze({
  '/bin/sh': 'sh',
  '/usr/bin/sh': 'sh',
  '/bin/bash': 'bash',
  '/usr/bin/bash': 'bash',
  '/bin/dash': 'dash',
  '/usr/bin/dash': 'dash',
  '/bin/ksh': 'ksh',
  '/usr/bin/ksh': 'ksh',
  '/bin/zsh': 'zsh',
  '/usr/bin/zsh': 'zsh',
  '/bin/env': 'env',
  '/usr/bin/env': 'env',
  '/bin/find': 'find',
  '/usr/bin/find': 'find',
  '/bin/nohup': 'nohup',
  '/usr/bin/nohup': 'nohup',
});
// These names only have the wrapper semantics modelled here when the shell
// itself resolves them. `env command ...` and `nohup command ...` ask an
// external program to execute a shell-only builtin and are therefore invalid in
// this model (and ordinarily invalid at runtime), not recursive wrapper chains.
const SHELL_CONTEXT_ONLY_COMMANDS = Object.freeze(['command', 'exec', 'builtin', 'time']);
// Known command-running wrappers that are deliberately OUTSIDE the supported
// subset. Listing one here does not model it; it makes the boundary fail closed
// instead of letting a dependency-bearing operand disappear behind its name.
const OUT_OF_MODEL_COMMAND_WRAPPERS = Object.freeze(['sudo']);
// How many wrappers may be peeled off one command (`env FOO=x command find …`).
const MAX_WRAPPER_UNWRAP_DEPTH = 4;

// Machine-readable boundary of the governance shell model. Growing any list is
// a deliberate contract change; everything outside it fails closed.
export const SUPPORTED_SHELL_MODEL = Object.freeze({
  separators: SHELL_SEPARATORS,
  commandKeywords: SHELL_COMMAND_KEYWORDS,
  wrappers: Object.freeze(['command', 'exec', 'nohup', 'time', 'env']),
  shellCCommands: SHELL_C_COMMANDS,
  pathQualifiedCommandPaths: Object.freeze(Object.keys(PATH_QUALIFIED_COMMAND_PATHS).sort()),
  findOptions: FIND_SUPPORTED_OPTIONS,
  unsupportedPolicy: 'DEPENDENCY_UNRESOLVABLE',
});

/** Which wrapper family a command name belongs to, or null for an ordinary command. */
function wrapperKindOf(name) {
  if (name === 'env') return 'env';
  if (name === 'builtin') return 'builtin';
  if (OUT_OF_MODEL_COMMAND_WRAPPERS.includes(name)) return 'unsupported';
  if (Object.prototype.hasOwnProperty.call(ARGV_WRAPPERS, name)) return 'argv';
  if (SHELL_C_COMMANDS.includes(name)) return 'shell-c';
  return null;
}

/** Resolve a static executable word without erasing quote/path provenance. */
function commandIdentityOf(candidate) {
  if (!candidate || candidate.dynamic || candidate.substitution) {
    return { name: null, reason: 'command name is computed at run time' };
  }
  const value = candidate.value;
  // A RELATIVE path in command position (`./bin/bash`, `bin/bash`) keeps its
  // whole spelling as the command name. That name is in neither this allowlist
  // nor any wrapper/shell list, so it is treated as an ordinary unknown command
  // and can never borrow modelled semantics from its basename either.
  if (!value.startsWith('/')) return { name: value, pathQualified: false };
  // EXACT literal match only. The basename is deliberately never consulted, so
  // `/custom/bash`, `/evil/find` and `/custom/env` resolve to nothing and are
  // reported as unresolved instead of being modelled as the tools they imitate.
  if (!Object.prototype.hasOwnProperty.call(PATH_QUALIFIED_COMMAND_PATHS, value)) {
    return { name: null, reason: `path-qualified executable is outside the supported model (${value})` };
  }
  return { name: PATH_QUALIFIED_COMMAND_PATHS[value], pathQualified: true };
}

// Skip opaque here-document DATA without pretending to interpret it. The
// construct still emits an unresolved fact; this helper merely resumes lexical
// scanning after a simple literal delimiter so later real commands do not
// disappear. Delimiter expansion, indentation beyond `<<-`, multiple dynamic
// delimiters, and every other form remain outside the model.
function resumeAfterLiteralHereDocument(text, start) {
  const header = /^<<(-)?[ \t]*(?:'([^'\r\n]+)'|"([^"\r\n]+)"|([A-Za-z_][A-Za-z0-9_]*))[^\r\n]*(?:\r?\n|$)/.exec(
    text.slice(start),
  );
  if (!header) return null;
  const stripTabs = header[1] === '-';
  const delimiter = header[2] ?? header[3] ?? header[4];
  let cursor = start + header[0].length;
  while (cursor <= text.length) {
    const newline = text.indexOf('\n', cursor);
    const end = newline === -1 ? text.length : newline;
    let line = text.slice(cursor, end).replace(/\r$/, '');
    if (stripTabs) line = line.replace(/^\t+/, '');
    if (line === delimiter) return newline === -1 ? text.length : newline + 1;
    if (newline === -1) break;
    cursor = newline + 1;
  }
  return text.length;
}

/**
 * Tokenize a shell body into commands.
 *
 * @returns {{commands: {name: string|null, words: object[]}[], unmodeled: string[]}}
 *   Each word carries `value` (the shell-normalised token), `raw` (its exact
 *   source spelling), `literalText` (the exact statically recoverable argument
 *   text), `quotedOnly` (every character came from quoted/escaped text, which
 *   suppresses glob expansion but NOT execution in command position), `dynamic`
 *   (an unexpanded `$VAR`/`${…}` took part) and `substitution` (a
 *   `$(…)`/backtick command substitution took part).
 */
export function tokenizeShell(source, depth = 0) {
  const text = String(source ?? '');
  const commands = [];
  const unmodeled = [];
  if (depth > MAX_SHELL_SUBSTITUTION_DEPTH) {
    unmodeled.push(`command substitution nested deeper than ${MAX_SHELL_SUBSTITUTION_DEPTH}`);
    return { commands, unmodeled };
  }

  let words = [];
  let word = null;

  const startWord = (sourceIndex = i) => {
    if (word === null) {
      word = {
        value: '',
        literalText: '',
        raw: '',
        sourceStart: sourceIndex,
        quotedOnly: true,
        quoted: false,
        dynamic: false,
        substitution: false,
        empty: true,
      };
    }
    return word;
  };
  const addLiteral = (chunk, quoted, sourceIndex = i) => {
    const current = startWord(sourceIndex);
    current.value += chunk;
    current.literalText += chunk;
    current.empty = false;
    if (quoted) current.quoted = true;
    if (!quoted) current.quotedOnly = false;
  };
  const endWord = (sourceEnd = i) => {
    if (word === null) return;
    word.raw = text.slice(word.sourceStart, sourceEnd);
    delete word.sourceStart;
    words.push(word);
    word = null;
  };
  const endCommand = (sourceEnd = i) => {
    endWord(sourceEnd);
    if (words.length) commands.push({ words });
    words = [];
  };
  const noteUnmodeled = (detail) => {
    if (!unmodeled.includes(detail)) unmodeled.push(detail);
  };
  const absorb = (nested) => {
    for (const command of nested.commands) commands.push(command);
    for (const detail of nested.unmodeled) noteUnmodeled(detail);
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      endWord();
      i += 1;
      continue;
    }

    // A `#` only starts a comment where a WORD could start.
    if (ch === '#' && word === null) {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }

    // UNSUPPORTED STRUCTURE IS LEXICAL, NOT TEXTUAL. Control reaches this point
    // only for characters the shell would EXECUTE: everything inside `'…'`,
    // inside `"…"`, or preceded by a `\` is consumed by the branches below and
    // never sees this test. So `echo '<< documentation text'` and
    // `echo "<(not executable)"` stay clean, while a REAL here-document or a
    // REAL process substitution is still reported. The characters themselves
    // are then handled normally, so a `<(find …)` still exposes its `find`.
    if (ch === '<' || ch === '>') {
      const construct = SHELL_UNMODELED_CONSTRUCTS.find(([needle]) => text.startsWith(needle, i));
      if (construct) {
        noteUnmodeled(`${construct[1]} (\`${construct[0]}\`)`);
        if (construct[0] === '<<') {
          // The delimiter/body grammar is deliberately outside this bounded
          // model. Once a real here-document begins, its remaining text is
          // opaque data; parsing body lines as commands would invent execution.
          // A simple literal terminator lets lexical scanning resume AFTER the
          // body so a later real command still cannot disappear silently.
          endCommand(i);
          i = resumeAfterLiteralHereDocument(text, i) ?? text.length;
          continue;
        }
      }
    }

    // A separator ends the current word AND the current command, so both
    // `foo; bar` and `foo;bar` put `bar` in command position.
    //
    // `{` and `}` are the exception: they only GROUP when they stand alone as a
    // word (`{ find …; }`). Attached to a word they are brace-expansion syntax
    // (`./scripts/{alpha,beta}.mjs`), which must stay ONE word so the caller can
    // report it as an unmodelled glob instead of shredding it into fragments
    // that resolve to nothing.
    const separator = SHELL_SEPARATORS.find((candidate) => {
      if (!text.startsWith(candidate, i)) return false;
      if (candidate === '{') return word === null && /^[\s;&|)]|^$/.test(text.slice(i + 1, i + 2) || '');
      if (candidate === '}') return word === null;
      return true;
    });
    if (separator !== undefined) {
      endCommand();
      i += separator.length;
      continue;
    }

    if (ch === '\\') {
      addLiteral(text[i + 1] ?? '', true, i);
      i += 2;
      continue;
    }

    if (ch === "'") {
      startWord(i).quoted = true;
      const close = text.indexOf("'", i + 1);
      if (close === -1) {
        unmodeled.push('unterminated single-quoted string');
        addLiteral(text.slice(i + 1), true);
        i = text.length;
        continue;
      }
      addLiteral(text.slice(i + 1, close), true);
      i = close + 1;
      continue;
    }

    if (ch === '"') {
      startWord(i).quoted = true;
      let j = i + 1;
      let closed = false;
      while (j < text.length) {
        if (text[j] === '\\') {
          const escaped = text[j + 1] ?? '';
          // Inside double quotes Bash only removes a backslash before $, `, ",
          // \\ or newline. Before every other character the backslash remains
          // part of argv and may be significant to a nested `-c` shell.
          if (escaped === '\n' || (escaped === '\r' && text[j + 2] === '\n')) {
            j += escaped === '\r' ? 3 : 2;
            continue;
          }
          const chunk = ['$', '`', '"', '\\'].includes(escaped) ? escaped : `\\${escaped}`;
          addLiteral(chunk, true, j);
          j += 2;
          continue;
        }
        if (text[j] === '"') {
          closed = true;
          j += 1;
          break;
        }
        // A command substitution EXECUTES even inside double quotes.
        if (text[j] === '$' && text[j + 1] === '(') {
          const inner = readShellSubstitution(text, j + 2, ')');
          if (inner === null) {
            unmodeled.push('unterminated command substitution');
            j = text.length;
            break;
          }
          absorb(tokenizeShell(inner.source, depth + 1));
          startWord(i).substitution = true;
          j = inner.end;
          continue;
        }
        if (text[j] === '`') {
          const inner = readShellSubstitution(text, j + 1, '`');
          if (inner === null) {
            unmodeled.push('unterminated command substitution');
            j = text.length;
            break;
          }
          absorb(tokenizeShell(inner.source, depth + 1));
          startWord(i).substitution = true;
          j = inner.end;
          continue;
        }
        if (text[j] === '$') {
          startWord(i).dynamic = true;
          startWord(i).literalText += '$';
          j += 1;
          continue;
        }
        addLiteral(text[j], true);
        j += 1;
      }
      if (!closed && j >= text.length) unmodeled.push('unterminated double-quoted string');
      i = j;
      continue;
    }

    if (ch === '$' && text[i + 1] === '(') {
      const inner = readShellSubstitution(text, i + 2, ')');
      if (inner === null) {
        unmodeled.push('unterminated command substitution');
        i = text.length;
        continue;
      }
      absorb(tokenizeShell(inner.source, depth + 1));
      startWord(i).substitution = true;
      i = inner.end;
      continue;
    }

    if (ch === '`') {
      const inner = readShellSubstitution(text, i + 1, '`');
      if (inner === null) {
        unmodeled.push('unterminated command substitution');
        i = text.length;
        continue;
      }
      absorb(tokenizeShell(inner.source, depth + 1));
      startWord(i).substitution = true;
      i = inner.end;
      continue;
    }

    if (ch === '$') {
      startWord(i).dynamic = true;
      startWord(i).literalText += '$';
      i += 1;
      continue;
    }

    addLiteral(ch, false);
    i += 1;
  }
  endCommand();

  // --- resolve command position -------------------------------------------------
  // Every `commands` element above is one separator-delimited word list. Control
  // keywords and `VAR=value` prefixes occupy no command slot, so the executable
  // token is the first word past them.
  //
  // A WRAPPER is peeled only when its execution context permits it. `command`
  // and `exec` are shell builtins; `env` and `nohup` execute external programs.
  // An impossible composition therefore stops here and is REPORTED instead of
  // inventing dependencies from words that cannot execute.
  const resolved = [];
  const isStaticLiteral = (candidate) => Boolean(candidate) && !candidate.dynamic && !candidate.substitution;

  const resolveCommand = (allWords, start, unwrapDepth, executionContext = 'shell') => {
    let index = start;
    while (executionContext === 'shell' && index < allWords.length) {
      const candidate = allWords[index];
      // A control keyword only counts as one when it is a bare, unquoted word.
      if (candidate.quotedOnly === false && SHELL_COMMAND_KEYWORDS.includes(candidate.value)) {
        index += 1;
        continue;
      }
      if (candidate.quotedOnly === false && SHELL_ASSIGNMENT_PREFIX_RE.test(candidate.value)) {
        index += 1;
        continue;
      }
      break;
    }
    const head = allWords[index];
    if (!head) return true;
    const identity = commandIdentityOf(head);
    const name = identity.name;
    const record = {
      name,
      rawName: head.raw,
      nameQuoted: head.quoted,
      pathQualified: identity.pathQualified === true,
      executionContext,
      words: allWords.slice(index),
      argv: allWords.slice(index + 1),
      dependencyScan: true,
    };
    resolved.push(record);
    if (name === null) {
      record.dependencyScan = false;
      noteUnmodeled(identity.reason);
      return false;
    }

    if (executionContext === 'external' && SHELL_CONTEXT_ONLY_COMMANDS.includes(name)) {
      record.dependencyScan = false;
      noteUnmodeled(`invalid wrapper composition: external execution context cannot invoke shell-only \`${name}\``);
      return false;
    }

    const wrapper = wrapperKindOf(name);
    if (wrapper === null) return true;
    if (wrapper === 'unsupported') {
      record.dependencyScan = false;
      noteUnmodeled(`\`${name}\` command wrapper is outside the supported model`);
      return false;
    }
    if (unwrapDepth >= MAX_WRAPPER_UNWRAP_DEPTH) {
      record.dependencyScan = false;
      noteUnmodeled(`command wrappers nested deeper than ${MAX_WRAPPER_UNWRAP_DEPTH} (\`${name}\`)`);
      return false;
    }

    if (wrapper === 'builtin') {
      // This bounded engine does not model any dependency-bearing shell builtin.
      // With an operand, `builtin` is therefore unresolved; specifically,
      // `builtin find` must never be treated as execution of external `find`.
      if (index + 1 < allWords.length) {
        record.dependencyScan = false;
        noteUnmodeled(`\`builtin\` target is outside the supported shell-builtin subset (${allWords[index + 1].value})`);
        return false;
      }
      return true;
    }

    if (wrapper === 'argv' || wrapper === 'env') {
      let next = index + 1;
      while (next < allWords.length) {
        const candidate = allWords[next];
        if (candidate.dynamic || candidate.substitution) {
          record.dependencyScan = false;
          noteUnmodeled(`\`${name}\` wrapper argument is computed at run time`);
          return false;
        }
        if (wrapper === 'env' && SHELL_ASSIGNMENT_PREFIX_RE.test(candidate.value)) {
          // A deterministic `NAME=value` assignment changes the ENVIRONMENT,
          // never which command runs, so it is skipped.
          next += 1;
          continue;
        }
        if (candidate.value.startsWith('-')) {
          const supported = wrapper === 'env' ? [] : ARGV_WRAPPERS[name];
          if (!supported.includes(candidate.value)) {
            record.dependencyScan = false;
            noteUnmodeled(`\`${name}\` wrapper option outside the supported model (${candidate.value})`);
            return false;
          }
          next += 1;
          continue;
        }
        break;
      }
      // `env`, `env FOO=bar` or a bare `command` with nothing left runs no
      // wrapped command at all, so there is nothing to hide.
      if (next >= allWords.length) return true;
      record.dependencyScan = false;
      const nextContext = wrapper === 'env' || name === 'nohup' ? 'external' : executionContext;
      return resolveCommand(allWords, next, unwrapDepth + 1, nextContext);
    }

    // `sh -c <program>`: the program is a nested shell body.
    const cIndex = allWords.findIndex((candidate, at) => at > index && isStaticLiteral(candidate) && candidate.value === '-c');
    if (cIndex === -1) return true; // e.g. `bash scripts/build.sh` — a path, not a program string
    record.dependencyScan = false;
    if (cIndex !== index + 1) {
      noteUnmodeled(`\`${name} -c\` invocation carries options outside the supported model`);
      return false;
    }
    const program = allWords[cIndex + 1];
    if (!program) {
      noteUnmodeled(`\`${name} -c\` declares no program argument`);
      return false;
    }
    if (program.dynamic || program.substitution) {
      noteUnmodeled(`\`${name} -c\` program is computed at run time`);
      return false;
    }
    if (depth + 1 > MAX_SHELL_SUBSTITUTION_DEPTH) {
      noteUnmodeled(`\`-c\` shell program nested deeper than ${MAX_SHELL_SUBSTITUTION_DEPTH}`);
      return false;
    }
    // `literalText` was accumulated directly from the original source token.
    // It deliberately preserves nested-shell escapes that the normalised token
    // representation cannot safely reconstruct (for example \', \< and \; in
    // an outer double-quoted program). Missing raw provenance is fail closed.
    if (typeof program.raw !== 'string' || typeof program.literalText !== 'string') {
      noteUnmodeled(`\`${name} -c\` literal program text could not be recovered exactly`);
      return false;
    }
    const nested = tokenizeShell(program.literalText, depth + 1);
    for (const command of nested.commands) resolved.push(command);
    for (const detail of nested.unmodeled) noteUnmodeled(detail);
    return nested.unmodeled.length === 0;
  };

  for (const command of commands) resolveCommand(command.words, 0, 0, 'shell');
  return { commands: resolved, unmodeled };
}

/** A bounded, readable rendering of a tokenized command for an audit fact. */
export function describeShellCommand(command) {
  const rendered = command.words
    .map((word) => (word.substitution ? '$(…)' : word.dynamic ? `${word.value}$…` : word.value))
    .join(' ')
    .trim();
  return rendered.length > 160 ? `${rendered.slice(0, 157)}...` : rendered;
}

/**
 * Parse a tokenized `find` argument list against the supported subset.
 * @returns {{dir: string, namePattern: string}|{unsupported: string}}
 */
export function parseFindInvocation(argv) {
  let dir = null;
  let namePattern = null;
  for (let index = 0; index < argv.length; index += 1) {
    const word = argv[index];
    if (word.substitution || word.dynamic) return { unsupported: 'argument is computed at run time' };
    const value = word.value;
    if (value.startsWith('-')) {
      if (!FIND_SUPPORTED_OPTIONS.includes(value)) return { unsupported: value };
      if (!FIND_OPTIONS_WITH_VALUE.includes(value)) continue;
      const operand = argv[index + 1];
      if (!operand || operand.substitution || operand.dynamic) return { unsupported: `${value} operand is not a literal` };
      index += 1;
      if (value === '-name') {
        if (namePattern !== null) return { unsupported: 'more than one -name pattern' };
        namePattern = operand.value;
      }
      continue;
    }
    // A non-option operand before any option is a search root. More than one
    // root, or a root that is itself a glob, is outside the subset.
    if (namePattern !== null || dir !== null) return { unsupported: `unexpected operand ${value}` };
    if (/[*?[\]{}]/.test(value)) return { unsupported: `search root is a glob (${value})` };
    dir = value;
  }
  if (dir === null) return { unsupported: 'no literal search root' };
  if (namePattern === null) return { unsupported: 'no -name pattern' };
  return { dir, namePattern };
}

// Read the interior of a `$(…)` / `` `…` `` substitution, tracking nesting and
// quoting so the scan cannot desynchronise. Returns null when it never closes.
function readShellSubstitution(text, start, closer) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === "'" && closer === ')') {
      const close = text.indexOf("'", i + 1);
      if (close === -1) return null;
      i = close + 1;
      continue;
    }
    if (closer === ')' && ch === '(') {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === closer) {
      if (closer === ')' && depth > 0) {
        depth -= 1;
        i += 1;
        continue;
      }
      return { source: text.slice(start, i), end: i + 1 };
    }
    i += 1;
  }
  return null;
}

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
// Keywords after which a `/` can only begin a REGEX LITERAL, never a division.
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);
// Sticky (`y`) so the lexers can match AT an offset without slicing the whole
// remaining source on every character — that slicing is quadratic, and these
// scanners run over every executed file of every job.
const JS_WORD_RE = /[A-Za-z_$][\w$]*/y;
const JS_NUMBER_RE = /(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?)n?/y;
function matchAt(regexp, text, index) {
  regexp.lastIndex = index;
  return regexp.exec(text);
}

// Keywords whose parenthesised HEAD is a statement head, so the `)` that closes
// it is followed by a statement — where a `/` begins a regex. Every other `)`
// closes an expression or an argument list, where a `/` is division.
const CONTROL_HEAD_KEYWORDS = new Set(['if', 'while', 'for', 'with']);

/**
 * Is a `/` at this point the start of a REGEX LITERAL (rather than division)?
 * Decided from the previous significant TOKEN — see `lexJavaScript`.
 */
function regexAllowedAfter(previous) {
  switch (previous.type) {
    case 'none':
      return true;
    case 'word':
      return REGEX_PRECEDING_KEYWORDS.has(previous.value);
    case 'number':
    case 'string':
    case 'template':
    case 'regex':
      return false;
    default:
      if (previous.value === ')') return previous.controlHead === true;
      if (previous.value === ']') return false;
      if (previous.value === '++' || previous.value === '--') return false;
      return true;
  }
}

/**
 * Consume a regex literal starting at `start` (the opening `/`), including its
 * flags. Returns the index after it, or null when it does not close on its line.
 */
function readRegexLiteral(text, start) {
  let j = start + 1;
  let inClass = false;
  while (j < text.length) {
    const ch = text[j];
    if (ch === '\\') {
      j += 2; // an escaped `/` never closes the literal
      continue;
    }
    if (ch === '\n') return null;
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) {
      j += 1;
      while (j < text.length && /[a-z]/.test(text[j])) j += 1;
      return j;
    }
    j += 1;
  }
  return null;
}

// Read a `${…}` template expression, starting just after the `${`. Returns the
// verbatim expression source and the index after its closing `}`, or null when
// the literal never closes.
//
// This is CODE, so it is scanned with the same token-aware rules as
// `lexJavaScript`: nested braces, quoted strings, nested template literals AND
// REGEX LITERALS. Skipping the regex rule here is not a cosmetic gap — an
// interior such as `String(v).replace(/'/g, `'\\''`)` contains a quote INSIDE a
// regex, and a scan that reads it as an opening string literal desynchronises,
// which is exactly how following executable code disappears.
function readBalancedExpression(text, start) {
  let depth = 0;
  let i = start;
  let previous = { type: 'none', value: '' };
  const parenStack = [];
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (ch === '/' && regexAllowedAfter(previous)) {
      const end = readRegexLiteral(text, i);
      if (end !== null) {
        previous = { type: 'regex', value: '/' };
        i = end;
        continue;
      }
    }
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
      previous = { type: 'string', value: quote };
      continue;
    }
    if (ch === '`') {
      const nested = scanTemplateLiteral(text, i);
      if (nested === null) return null;
      previous = { type: 'template', value: '`' };
      i = nested.end;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      previous = { type: 'punct', value: '{' };
      i += 1;
      continue;
    }
    if (ch === '}') {
      if (depth === 0) return { source: text.slice(start, i), end: i + 1 };
      depth -= 1;
      previous = { type: 'punct', value: '}' };
      i += 1;
      continue;
    }
    const word = matchAt(JS_WORD_RE, text, i);
    if (word) {
      previous = { type: 'word', value: word[0] };
      i += word[0].length;
      continue;
    }
    const number = matchAt(JS_NUMBER_RE, text, i);
    if (number) {
      previous = { type: 'number', value: number[0] };
      i += number[0].length;
      continue;
    }
    if (ch === '(') {
      parenStack.push({ controlHead: previous.type === 'word' && CONTROL_HEAD_KEYWORDS.has(previous.value) });
      previous = { type: 'punct', value: '(' };
      i += 1;
      continue;
    }
    if (ch === ')') {
      const frame = parenStack.pop();
      previous = { type: 'punct', value: ')', controlHead: frame?.controlHead === true };
      i += 1;
      continue;
    }
    const pair = text.slice(i, i + 2);
    if (pair === '++' || pair === '--') {
      previous = { type: 'punct', value: pair };
      i += 2;
      continue;
    }
    if (!/\s/.test(ch)) previous = { type: 'punct', value: ch };
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
  const unmodeled = [];
  let skeleton = '';
  // The previous SIGNIFICANT TOKEN, not the previous character. A single-char
  // preceder set cannot tell `return /re/` (a regex) from `total / count`
  // (division), and getting that wrong is not a cosmetic miss: mis-lexing
  // `return /['"]/.test(x)` as division makes the `'` open a bogus string
  // literal that then swallows every executable call after it.
  let previous = { type: 'none', value: '' };
  // What each open `(` was introduced by, so a `)` knows whether it closed a
  // control-flow head (`if (a) /re/.test(b)` — regex) or an expression / call
  // argument list (`(a + b) / c` — division).
  const parenStack = [];
  const note = (detail) => {
    if (!unmodeled.includes(detail)) unmodeled.push(detail);
  };

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
    if (ch === '/' && regexAllowedAfter(previous)) {
      const end = readRegexLiteral(text, i);
      if (end !== null) {
        skeleton += ' ';
        previous = { type: 'regex', value: '/' };
        i = end;
        continue;
      }
      // A `/` in regex position that does not close on its line is a construct
      // this lexer cannot disambiguate. Fail closed: REPORT it rather than
      // silently pick a reading that may swallow executable code.
      note(`unterminated regex literal near "${text.slice(i, i + 40).split('\n')[0]}"`);
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
        skeleton += `${strings.length - 1}`;
        previous = { type: 'template', value: '`' };
        i = template.end;
        continue;
      }
      note('unterminated template literal');
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
        if (sc === '\n') break; // unterminated single-line string
        value += sc;
        j += 1;
      }
      if (closed) {
        strings.push({ quote: ch, value });
        skeleton += `${strings.length - 1}`;
        previous = { type: 'string', value: ch };
        i = j;
        continue;
      }
      note(`unterminated string literal near "${text.slice(i, i + 40).split('\n')[0]}"`);
    }
    // A whole IDENTIFIER/KEYWORD is ONE token, so `return` stays distinguishable
    // from the bare `n` a per-character scan would have left behind.
    const word = matchAt(JS_WORD_RE, text, i);
    if (word) {
      skeleton += word[0];
      previous = { type: 'word', value: word[0] };
      i += word[0].length;
      continue;
    }
    const number = matchAt(JS_NUMBER_RE, text, i);
    if (number) {
      skeleton += number[0];
      previous = { type: 'number', value: number[0] };
      i += number[0].length;
      continue;
    }
    // `++` / `--` are ONE token: consuming them as two `+` characters would
    // leave `+` as the previous token and turn a following division into a
    // bogus regex literal.
    const pair = text.slice(i, i + 2);
    if (pair === '++' || pair === '--') {
      skeleton += pair;
      previous = { type: 'punct', value: pair };
      i += 2;
      continue;
    }
    skeleton += ch;
    if (ch === '(') {
      parenStack.push({ controlHead: previous.type === 'word' && CONTROL_HEAD_KEYWORDS.has(previous.value) });
      previous = { type: 'punct', value: '(' };
      i += 1;
      continue;
    }
    if (ch === ')') {
      const frame = parenStack.pop();
      if (frame === undefined) note('unbalanced closing parenthesis; regex vs division position is not decidable');
      previous = { type: 'punct', value: ')', controlHead: frame?.controlHead === true };
      i += 1;
      continue;
    }
    if (!/\s/.test(ch)) previous = { type: 'punct', value: ch };
    i += 1;
  }
  return { skeleton, strings, unmodeled };
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

    // SHELL STRUCTURE FIRST. Command position, quoting and command substitution
    // are decided by the bounded tokenizer, not by a regex guessing where a
    // command "usually" starts. Structure the tokenizer does not model is
    // reported, never ignored.
    const { commands, unmodeled } = tokenizeShell(folded);
    for (const detail of unmodeled) {
      note(unresolvable, source, `shell structure outside the supported model: ${detail}`);
    }

    // `find` — supported subset: `find <dir> [-type x] -name <pattern>`, which
    // searches RECURSIVELY. The expansion therefore has to include BOTH the
    // direct children of <dir> and every nested descendant. Anything that
    // changes which files the command visits (`-maxdepth`, `-path`, `-regex`,
    // `-exec`, `-prune`, boolean operators) is outside the subset and is
    // recorded rather than approximated. `find` is recognised at EVERY shell
    // command position (`if find …`, `then find …`, `do find …`, `{ find …`,
    // after `&&`/`||`/`|`/`;`/a newline, inside `$(…)`) and NEVER inside quoted
    // data such as `echo '(find src/data -maxdepth 1 …)'`.
    for (const command of commands) {
      if (command.dependencyScan === false) continue;
      if (command.name !== 'find') continue;
      const invocation = describeShellCommand(command);
      const parsed = parseFindInvocation(command.argv);
      if (parsed.unsupported) {
        note(unresolvable, source, `find form outside the supported subset (${parsed.unsupported}): ${invocation}`);
        continue;
      }
      const root = normalizeRepoPath(parsed.dir);
      // `**/` matches ZERO or more whole segments, so `dir/direct.ts` and
      // `dir/nested/file.ts` both resolve from one recursive expansion.
      const expanded = expandGlob(`${root}/**/${parsed.namePattern}`, tracked);
      if (expanded === null) {
        note(unresolvable, source, `find -name pattern is outside the supported glob subset: ${parsed.namePattern}`);
        continue;
      }
      if (expanded.length === 0) {
        note(unresolvable, source, `find expands to no tracked file: ${invocation}`);
        continue;
      }
      for (const path of expanded) addRead(path);
    }

    for (const command of commands) {
      if (command.dependencyScan === false) continue;
      for (const word of command.words) {
        // A word made only of quoted/escaped text is DATA: the shell never
        // glob-expands it, so it can neither resolve nor be "unresolvable".
        // Its literal value is still checked against the tracked file set,
        // because `node "scripts/x.mjs"` really does run that file.
        const globbable = word.quotedOnly === false;
        const candidateWord = word.value;

        // A whole word carrying UNMODELLED glob syntax — brace expansion
        // (`./scripts/{alpha,beta}.mjs`), a character class (`./scripts/[ab].mjs`),
        // a negated class — must be reported. `./` is stripped BEFORE the
        // repository-root test, which is exactly what used to make these forms
        // disappear: `.` is not a tracked top-level directory.
        if (globbable && SHELL_PATH_LIKE_RE.test(candidateWord) && UNSUPPORTED_GLOB_CHAR_RE.test(candidateWord)) {
          const rooted = candidateWord.replace(/^\.\//, '');
          if (repoRoots.has(rooted.split('/')[0])) {
            note(unresolvable, source, `shell glob form outside the supported subset: ${candidateWord}`);
            continue;
          }
        }

        for (const [token] of candidateWord.matchAll(PATH_TOKEN_RE)) {
          if (token.includes('*') || token.includes('?')) {
            if (!globbable) continue; // quoted `*` is a literal asterisk, not a glob
            const expanded = expandGlob(normalizeRepoPath(token), tracked);
            if (expanded === null) {
              note(unresolvable, source, `shell glob form outside the supported subset: ${token}`);
              continue;
            }
            if (expanded.length === 0 && repoRoots.has(token.replace(/^\.\//, '').split('/')[0])) {
              note(unresolvable, source, `shell glob expands to no tracked file: ${token}`);
              continue;
            }
            for (const path of expanded) {
              if (isExecutable(path)) enqueueExec(path, depth + 1, source);
              else addRead(path);
            }
            continue;
          }
          const normalized = normalizeRepoPath(token);
          if (!tracked.has(normalized)) continue;
          if (isExecutable(normalized)) enqueueExec(normalized, depth + 1, source);
          else addRead(normalized);
        }
      }
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
    const { skeleton, strings, unmodeled } = lexJavaScript(raw);
    // FAIL CLOSED ON THE LEXER ITSELF. A construct the lexer cannot safely
    // disambiguate could hide an executable dependency-bearing call behind a
    // mis-read regex/string boundary, so it is reported rather than skipped.
    for (const detail of unmodeled ?? []) {
      note(unresolvable, path, `source could not be lexed unambiguously: ${detail}`);
    }
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

// --- reproducible unresolved-dependency metrics ------------------------------
//
// COUNT TERMINOLOGY IS DEFINED HERE, IN CODE, AND NOWHERE ELSE.
//
// The R2 write-up quoted "42 distinct forms", a number no one could reproduce
// because "form" was never defined anywhere executable. Prose metrics are not
// auditable, so this function is now the single definition and every document
// quotes ITS output. There is deliberately no "distinct forms" metric.
//
// Every DEPENDENCY_UNRESOLVABLE detail is a FACT of the shape
// `<origin> :: <reason>`, where `origin` is the file or step the engine was
// scanning and `reason` is what it could not resolve. The split is at the FIRST
// ` :: `, because a reason may itself contain that sequence.
//
//   unresolvedRows              one per (portfolio entry, gap) pair. The same
//                               fact counted once per job that depends on it.
//   distinctOriginReasonFacts   distinct whole `<origin> :: <reason>` strings.
//   distinctReasons             distinct `<reason>` strings, origin removed.
//   distinctOrigins             distinct `<origin>` strings.
//
// @param {{entries: {knownGaps?: {code: string, detail: string}[]}[]}} portfolio
export function summarizeUnresolvedDependencies(portfolio) {
  let unresolvedRows = 0;
  const facts = new Set();
  const reasons = new Set();
  const origins = new Set();
  for (const entry of Array.isArray(portfolio?.entries) ? portfolio.entries : []) {
    for (const gap of Array.isArray(entry?.knownGaps) ? entry.knownGaps : []) {
      if (gap?.code !== 'DEPENDENCY_UNRESOLVABLE') continue;
      const detail = String(gap.detail ?? '');
      unresolvedRows += 1;
      facts.add(detail);
      const { origin, reason } = splitUnresolvedFact(detail);
      origins.add(origin);
      reasons.add(reason);
    }
  }
  return {
    unresolvedRows,
    distinctOriginReasonFacts: facts.size,
    distinctReasons: reasons.size,
    distinctOrigins: origins.size,
  };
}

// --- enforcement readiness ----------------------------------------------------
//
// A SEPARATE, DETERMINISTIC QUESTION from integrity: may this portfolio be used
// as blocking enforcement authority?
//
// WHICH ENTRIES CARRY BLOCKING AUTHORITY — the definition is exact, and it is
// the whole reason an advisory job's unresolved dependency does not veto
// enforcement:
//
//   BLOCKING                       participates. The job can fail a pull request
//                                  to master today, so an enforcement decision
//                                  would rest on its dependency surface. Stage-2
//                                  migration candidates are a strict subset of
//                                  this set (candidacy requires BLOCKING) and
//                                  are reported separately for visibility.
//   UNMODELED                      participates, fail closed. Its semantics were
//                                  never proven, so it cannot be shown to sit
//                                  OUTSIDE blocking authority. (Integrity already
//                                  fails on this state; readiness does not
//                                  quietly disagree.)
//   ADVISORY                       does NOT participate. `continue-on-error`
//                                  means it cannot fail a PR, so it holds no
//                                  blocking authority and its unresolved
//                                  dependencies cannot corrupt one.
//   NON_PR                         does NOT participate. It never runs on a PR
//                                  to master at all.
//   CONDITIONAL_PRODUCTION_ONLY    does NOT participate. Its `if` is provably
//                                  false for pull requests.
//
// An advisory/non-PR entry that LATER becomes blocking is not a loophole: its
// classification is re-derived from the YAML by the integrity audit, so the day
// it can fail a PR it enters this set automatically.
export const BLOCKING_AUTHORITY_CLASSIFICATIONS = Object.freeze(['BLOCKING', 'UNMODELED']);

/**
 * Does this entry participate in blocking enforcement authority?
 * @returns {{participates: boolean, reason: string}}
 */
export function participatesInBlockingAuthority(entry) {
  const classification = entry?.classification;
  if (classification === 'BLOCKING') {
    return {
      participates: true,
      reason:
        entry?.stage2MigrationCandidate === true
          ? 'blocking-capable and a stage-2 migration candidate'
          : 'blocking-capable: it can fail a pull request to master today',
    };
  }
  if (classification === 'UNMODELED') {
    return {
      participates: true,
      reason: 'semantics are unprovable, so it cannot be shown to sit outside blocking authority',
    };
  }
  return {
    participates: false,
    reason: `holds no blocking authority (${String(classification)})`,
  };
}

const FACT_SEPARATOR = ' :: ';

/** Split a `<origin> :: <reason>` gap detail at its FIRST separator. */
function splitUnresolvedFact(detail) {
  const text = String(detail ?? '');
  const index = text.indexOf(FACT_SEPARATOR);
  if (index === -1) return { origin: '', reason: text };
  return { origin: text.slice(0, index), reason: text.slice(index + FACT_SEPARATOR.length) };
}

function summarizeBy(rows, key) {
  const buckets = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!buckets.has(value)) buckets.set(value, { [key]: value, rows: 0, entries: new Set() });
    const bucket = buckets.get(value);
    bucket.rows += 1;
    bucket.entries.add(row.entryId);
  }
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, entries: bucket.entries.size }))
    .sort((a, b) => b.rows - a.rows || String(a[key]).localeCompare(String(b[key])));
}

/**
 * Deterministic enforcement-readiness evaluation over a portfolio snapshot.
 *
 * This function makes NO claim about integrity. It answers only whether the
 * portfolio may become blocking enforcement authority, and it fails closed on a
 * malformed or empty portfolio.
 *
 * @param {{entries?: object[]}} portfolio
 */
export function evaluateEnforcementReadiness(portfolio) {
  const blockers = [];
  const entries = Array.isArray(portfolio?.entries) ? portfolio.entries : null;
  if (entries === null) {
    return {
      enforcementReady: false,
      integrityImpliesEnforcementAuthority: false,
      blockingAuthorityEntries: 0,
      stage2MigrationCandidates: 0,
      unresolvedBlockingRows: 0,
      affectedBlockingEntries: 0,
      rows: [],
      affected: [],
      reasonSummary: [],
      originSummary: [],
      outsideBlockingAuthority: { unresolvedRows: 0, entries: 0, byClassification: {} },
      blockers: ['portfolio declares no entries array — readiness fails closed'],
    };
  }

  const rows = [];
  const outsideRows = [];
  const blockingEntries = [];
  let stage2MigrationCandidates = 0;

  for (const entry of entries) {
    const authority = participatesInBlockingAuthority(entry);
    if (authority.participates) {
      blockingEntries.push(entry);
      if (entry?.stage2MigrationCandidate === true) stage2MigrationCandidates += 1;
    }
    for (const gap of Array.isArray(entry?.knownGaps) ? entry.knownGaps : []) {
      if (!ENFORCEMENT_BLOCKING_GAP_CODES.includes(gap?.code)) continue;
      const { origin, reason } = splitUnresolvedFact(gap?.detail);
      const row = {
        entryId: String(entry?.id ?? ''),
        workflowFile: String(entry?.workflowFile ?? ''),
        jobId: String(entry?.jobId ?? ''),
        checkContext: String(entry?.checkContext ?? ''),
        classification: String(entry?.classification ?? ''),
        migrationState: String(entry?.migrationState ?? ''),
        stage2MigrationCandidate: entry?.stage2MigrationCandidate === true,
        authorityReason: authority.reason,
        code: gap.code,
        origin,
        reason,
        detail: String(gap?.detail ?? ''),
      };
      if (authority.participates) rows.push(row);
      else outsideRows.push(row);
    }
  }

  const affectedIds = new Set(rows.map((row) => row.entryId));
  const affected = blockingEntries
    .filter((entry) => affectedIds.has(String(entry?.id ?? '')))
    .map((entry) => ({
      entryId: String(entry?.id ?? ''),
      workflowFile: String(entry?.workflowFile ?? ''),
      jobId: String(entry?.jobId ?? ''),
      checkContext: String(entry?.checkContext ?? ''),
      classification: String(entry?.classification ?? ''),
      migrationState: String(entry?.migrationState ?? ''),
      stage2MigrationCandidate: entry?.stage2MigrationCandidate === true,
      unresolvedRows: rows.filter((row) => row.entryId === String(entry?.id ?? '')).length,
    }))
    .sort((a, b) => b.unresolvedRows - a.unresolvedRows || a.entryId.localeCompare(b.entryId));

  if (entries.length === 0) blockers.push('portfolio is empty — readiness fails closed');
  if (rows.length > 0) {
    blockers.push(
      `${rows.length} unresolved dependency row(s) remain inside blocking authority across ${affected.length} entry(ies)`,
    );
  }

  const outsideByClassification = {};
  for (const row of outsideRows) {
    outsideByClassification[row.classification] = (outsideByClassification[row.classification] ?? 0) + 1;
  }

  return {
    enforcementReady: blockers.length === 0,
    // Stated in the RESULT, not just the docs: readiness is the only thing that
    // can confer enforcement authority, and integrity never does.
    integrityImpliesEnforcementAuthority: false,
    blockingAuthorityEntries: blockingEntries.length,
    stage2MigrationCandidates,
    unresolvedBlockingRows: rows.length,
    affectedBlockingEntries: affected.length,
    rows: rows.sort(
      (a, b) => a.entryId.localeCompare(b.entryId) || a.detail.localeCompare(b.detail),
    ),
    affected,
    reasonSummary: summarizeBy(rows, 'reason'),
    originSummary: summarizeBy(rows, 'origin'),
    outsideBlockingAuthority: {
      unresolvedRows: outsideRows.length,
      entries: new Set(outsideRows.map((row) => row.entryId)).size,
      byClassification: outsideByClassification,
    },
    blockers,
  };
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

    // --- 5b. UNRESOLVED-DEPENDENCY FIDELITY ---------------------------------
    // Unresolved dependency facts are DATA for integrity, never a free pass.
    // They are exactly the rows enforcement readiness consumes, so a row that
    // silently disappears, is reworded, or is invented would corrupt the
    // readiness verdict while the snapshot still "matched". The comparison is a
    // sorted MULTISET, so a duplicated row is drift too, and it is asserted
    // separately from the whole-`knownGaps` comparison above so the failure
    // names this specific corruption instead of dumping an entire gap array.
    const unresolvedOf = (source) =>
      (Array.isArray(source?.knownGaps) ? source.knownGaps : [])
        .filter((gapEntry) => gapEntry?.code === 'DEPENDENCY_UNRESOLVABLE')
        .map((gapEntry) => String(gapEntry.detail ?? ''))
        .sort();
    const storedUnresolved = unresolvedOf(entry);
    const derivedUnresolved = unresolvedOf(match);
    const missingUnresolved = derivedUnresolved.filter((detail) => !storedUnresolved.includes(detail));
    const inventedUnresolved = storedUnresolved.filter((detail) => !derivedUnresolved.includes(detail));
    check(
      `portfolio entry ${entry.id} records every live unresolved dependency fact (none silently dropped or reworded)`,
      missingUnresolved.length === 0,
      missingUnresolved.join(' | '),
    );
    check(
      `portfolio entry ${entry.id} records no unresolved dependency fact the derivation does not produce`,
      inventedUnresolved.length === 0,
      inventedUnresolved.join(' | '),
    );
    check(
      `portfolio entry ${entry.id} unresolved dependency row COUNT matches the derivation`,
      storedUnresolved.length === derivedUnresolved.length,
      `stored=${storedUnresolved.length} derived=${derivedUnresolved.length}`,
    );

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
