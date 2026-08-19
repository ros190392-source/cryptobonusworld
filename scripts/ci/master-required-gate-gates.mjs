#!/usr/bin/env node
// Stage-2 (S2-03 / S2-04) BLOCKER REGISTRY and per-gate APPLICABILITY model for
// the unified master required gate (issue #366).
//
// WHAT THIS FILE IS. S2-01/S2-02 delivered ONE always-reporting required check
// context ("Master required gate") that executed the material work in a single
// job. S2-03 turned that single job into a bounded DAG, S2-04 BATCH 01 widened
// it from two blockers to four, and S2-04 BATCH 02 widens it to six:
//
//     classify -> { contact-utility, exchange-preview-family,
//                   global-header-interaction, public-first-screen-budget,
//                   public-navigation, public-seo-metadata }
//              -> Master required gate
//
// S2-04 added NO new mechanism. Every trust property below is the S2-03 one,
// reached by registering more gates in the same closed registry; the only
// structural change batch 01 made is that the per-gate inert set is DERIVED from
// the registry (see deriveIrrelevantPaths) instead of hand-listed, because
// hand-listing cross-gate exclusivity is quadratic and therefore forgettable.
// Batch 02 adds no structural change at all: two registry rows, and every
// consumer — workflow, contract test, mutation suite, parity proof, emitter
// behaviour suite and aggregator — picks them up by iterating GATE_IDS.
//
// BATCH 02 IS THE FIRST STAGE IN WHICH THE REGISTERED GATES DISAGREE ABOUT THE
// INDEXABILITY STEP'S CONDITION, and that disagreement is faithfully recorded
// rather than normalised away. `cbw-exchange-preview-family.yml` guards the
// inventory with `always() && steps.build.outcome == 'success'` (so it still
// runs after a failed browser smoke), while `cbw-contact-utility.yml` leaves it
// unguarded (so a failed smoke skips it). Normalising the two into one shape
// would have SILENTLY CHANGED the red/green behaviour of one of them; each
// gate's `steps[].condition` therefore mirrors its OWN legacy job, and the
// parity suite re-derives both from the legacy YAML on every run.
//
// Every blocker job in that DAG is declared HERE, once, in a closed registry.
// The workflow, the contract test, the mutation suite and the aggregator all read
// the SAME registry, so a gate cannot be added to one of them and silently
// forgotten by the others.
//
// THE NOT_APPLICABLE CONTRACT — why it is a negative allowlist.
//
// A blocker job that does not need to run must still produce a DETERMINISTIC,
// MACHINE-READABLE outcome. GitHub's `skipped` conclusion is NOT that outcome:
// a job skips for many reasons (an upstream failure, a cancelled run, a job-level
// `if` that silently evaluated to the empty string) and every one of them looks
// identical from the aggregator's side. "Skipped" is therefore never accepted as
// proof of anything; NOT_APPLICABLE must be JUSTIFIED by exact changed-file
// classification.
//
// The justification model mirrors the S2-01 classifier exactly, and for the same
// reason. A POSITIVE "these paths make the gate relevant" list is fail-OPEN:
// every input nobody thought to enumerate — a new build-time module, a new data
// file, a future config — would classify the gate NOT_APPLICABLE and skip real
// blocking work under a SUCCESS conclusion. So the model is the opposite:
//
//   * a changed path is IRRELEVANT to a gate ONLY if it appears verbatim in that
//     gate's `irrelevantPaths`
//   * every other path, including every unknown/new path            -> RELEVANT
//   * one relevant path anywhere in the change set                  -> APPLICABLE
//   * an unresolvable or empty change set                           -> APPLICABLE
//   * a malformed / traversing / absolute path                      -> RELEVANT
//
// So NOT_APPLICABLE is only ever reached when EVERY changed file is provably
// inert for that gate. Every gate runs a full `astro build`, so their inert sets
// are necessarily tiny: the four root governance documents already proven inert
// by the S2-01 allowlist (and re-proved inert on every run by the dependency
// drift scanner), plus the exclusive legacy workflow file and exclusive gate
// script of every OTHER registered gate. Nothing else is claimed to be inert,
// and the contract test re-proves on every run that each inert entry really is
// outside this gate's S2-02 dependency closure.
//
// This file has NO main(). It is pure so the contract test, the mutation suite,
// the producer, the per-gate result emitter and the aggregator can all drive it
// with hostile inputs. It imports only node builtins (transitively too), because
// the aggregator and the result emitter run in jobs that deliberately do NOT run
// `npm ci` when their gate is not applicable.

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { NON_MATERIAL_PATHS, normalizePath, runnerTempDir } from './master-required-gate-classify.mjs';

// The closed set of applicability values a gate may be assigned by the
// classifier. There is deliberately no third "unknown" value: an unprovable
// applicability is APPLICABLE, which runs the work.
export const APPLICABILITY_VALUES = Object.freeze(['APPLICABLE', 'NOT_APPLICABLE']);

// The reason -> applicability mapping, in the same shape and for the same reason
// as REASON_MATERIALITY in the classifier: a reason PINS its applicability, so a
// contradictory pair (`NOT_APPLICABLE` justified by `relevant-path-changed`) is
// structurally impossible rather than merely unlikely. Both fail-closed reasons
// pin APPLICABLE; only the one affirmative reason pins NOT_APPLICABLE.
export const APPLICABILITY_REASONS = Object.freeze({
  'unresolved-or-empty-change-set': 'APPLICABLE',
  'relevant-path-changed': 'APPLICABLE',
  'only-gate-irrelevant-paths': 'NOT_APPLICABLE',
});

export const VALID_APPLICABILITY_REASONS = Object.freeze(Object.keys(APPLICABILITY_REASONS));

// True when the (applicability, reason) pair is semantically possible.
export function isConsistentApplicability(applicability, reason) {
  if (!APPLICABILITY_VALUES.includes(applicability)) return false;
  if (!Object.prototype.hasOwnProperty.call(APPLICABILITY_REASONS, reason)) return false;
  return APPLICABILITY_REASONS[reason] === applicability;
}

// The closed outcome vocabulary a blocker job may publish. FAIL is present so the
// vocabulary is closed and total — a blocker that reaches its emitter in a broken
// state names FAIL explicitly instead of emitting nothing — but the aggregator
// accepts only ACCEPTED_GATE_OUTCOMES. Anything outside GATE_OUTCOMES, and
// anything inside it but outside ACCEPTED_GATE_OUTCOMES, fails the gate closed.
export const GATE_OUTCOMES = Object.freeze(['PASS', 'NOT_APPLICABLE', 'FAIL']);
export const ACCEPTED_GATE_OUTCOMES = Object.freeze(['PASS', 'NOT_APPLICABLE']);

// Paths proven inert for EVERY gate: the exact S2-01 non-material allowlist. Each
// entry is a root-level human-readable governance document, is not a workflow
// trigger anywhere, and is re-proved on every run by
// scripts/ci/master-required-gate-allowlist-drift.mjs to be referenced by no
// tracked build/test/runtime/gate file. Importing the list rather than restating
// it means the two allowlists can never drift apart.
export const UNIVERSALLY_INERT_PATHS = Object.freeze([...NON_MATERIAL_PATHS]);

// The two step-condition shapes a blocking step may carry inside a unified
// blocker job, and nothing else. Keeping this closed is what lets the workflow
// contract reject an invented condition instead of merely noticing it is
// different.
//
//   'applicability'              gated purely on this gate's validated
//                                applicability decision.
//   'applicability-after-build'  the legacy workflows guard the indexability
//                                inventory with `always() && steps.build.outcome
//                                == 'success'` so it still runs — and can still
//                                fail the job — when the step before it failed.
//                                That exact condition is preserved, conjoined
//                                with applicability, so the unified job's
//                                red/green behaviour matches the legacy job's in
//                                every reachable state.
export const STEP_CONDITIONS = Object.freeze(['applicability', 'applicability-after-build']);

/** The exact `if:` text a blocking step must carry, derived, never hand-written. */
export function stepConditionExpression(gateId, condition) {
  const output = `needs.${CLASSIFY_JOB_ID}.outputs.${GATES[gateId].outputName}`;
  if (condition === 'applicability') return `${output} == 'APPLICABLE'`;
  if (condition === 'applicability-after-build') {
    return `always() && ${output} == 'APPLICABLE' && steps.build.outcome == 'success'`;
  }
  throw new Error(`master-required-gate: unknown step condition ${JSON.stringify(condition)}`);
}

/**
 * The closed blocker registry, BEFORE the derived fields are attached.
 *
 * `gateScript` — the ONE hard-gate script that is exclusive to this gate: the
 * script the legacy workflow exists to run, which nothing else in the DAG
 * executes or reads. Together with `legacyWorkflow` it forms this gate's
 * EXCLUSIVE SURFACE (see `gateExclusiveSurface` below), which is the only thing
 * any OTHER gate is permitted to treat as inert. The shared indexability
 * inventory is deliberately NOT a gateScript anywhere: FOUR gates run it
 * (global-header-interaction, public-seo-metadata, contact-utility and
 * exchange-preview-family), so it is exclusive to none of them and can never
 * become inert for any of them.
 *
 * `legacyReportingStep` — the NAME of this legacy job's terminal non-blocking
 * reporting step, or null when it has none. Declaring it is what makes the
 * parity suite's exclusion auditable in both directions: a gate declaring null
 * fails if such a step appears, and a gate declaring a name fails if the step
 * vanishes, is renamed, stops being the job's LAST ACTUAL step (a `uses:` step
 * appended after it is enough), stops being `if: always()`, or stops being
 * provably summary-only. See `terminalReportingStep`.
 *
 * `steps` — the exact blocking step sequence this gate must execute when it IS
 * applicable, with the step id each one carries (the ids are load-bearing: the
 * result emitter reads `steps.<id>.outcome` for every one of them) and the legacy
 * step `if` each one is reproducing.
 * scripts/ci/master-required-gate-parity-test.mjs proves the sequence is
 * command-for-command equivalent to the legacy path-filtered workflow, and that
 * the unified job really runs it.
 */
const GATE_DEFINITIONS = Object.freeze({
  // S2-04 BATCH 02. The legacy job leaves the indexability inventory UNGUARDED,
  // so it carries GitHub's implicit `success()` and a failed Chromium smoke
  // skips it. `condition: 'applicability'` reproduces exactly that; giving it
  // the `applicability-after-build` shape the other indexability steps use
  // would have made the inventory run in a state the legacy job never runs it
  // in, which is a behaviour change wearing the costume of consistency.
  'contact-utility': Object.freeze({
    id: 'contact-utility',
    jobId: 'contact-utility',
    jobName: 'Contact utility (unified blocker)',
    outputName: 'gate_contact_utility',
    applicabilityEnv: 'GATE_CONTACT_UTILITY_APPLICABILITY',
    resultEnv: 'GATE_CONTACT_UTILITY_RESULT',
    jobResultEnv: 'GATE_CONTACT_UTILITY_JOB_RESULT',
    evidenceEnv: 'GATE_CONTACT_UTILITY_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-contact-utility.yml',
    legacyJobId: 'contact-utility',
    legacyReportingStep: null,
    gateScript: 'scripts/ui/contact-utility-browser-smoke.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'contact',
        command: 'node scripts/ui/contact-utility-browser-smoke.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
    ]),
  }),
  // S2-04 BATCH 02. OWNER-PREVIEW ONLY. Registering this gate as a blocker grants
  // it no publication, indexing, ranking or affiliate authority; it proves the
  // owner's preview routes still render and still stay out of the index, which is
  // the same thing the legacy gate proved and nothing more. The legacy job DOES
  // guard the inventory with `always() && steps.build.outcome == 'success'`, so
  // this gate's indexability step is `applicability-after-build` — the opposite
  // of contact-utility's, because the legacy jobs genuinely differ.
  'exchange-preview-family': Object.freeze({
    id: 'exchange-preview-family',
    jobId: 'exchange-preview-family',
    jobName: 'Exchange preview family (unified blocker)',
    outputName: 'gate_exchange_preview_family',
    applicabilityEnv: 'GATE_EXCHANGE_PREVIEW_FAMILY_APPLICABILITY',
    resultEnv: 'GATE_EXCHANGE_PREVIEW_FAMILY_RESULT',
    jobResultEnv: 'GATE_EXCHANGE_PREVIEW_FAMILY_JOB_RESULT',
    evidenceEnv: 'GATE_EXCHANGE_PREVIEW_FAMILY_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-exchange-preview-family.yml',
    legacyJobId: 'exchange-preview-family',
    legacyReportingStep: 'Summary',
    gateScript: 'scripts/ui/exchange-preview-family-browser-smoke.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'browser',
        command: 'node scripts/ui/exchange-preview-family-browser-smoke.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability-after-build',
        legacyIf: "always() && steps.build.outcome == 'success'",
      }),
    ]),
  }),
  'global-header-interaction': Object.freeze({
    id: 'global-header-interaction',
    jobId: 'global-header-interaction',
    jobName: 'Global header interaction (unified blocker)',
    outputName: 'gate_global_header_interaction',
    applicabilityEnv: 'GATE_GLOBAL_HEADER_INTERACTION_APPLICABILITY',
    resultEnv: 'GATE_GLOBAL_HEADER_INTERACTION_RESULT',
    jobResultEnv: 'GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT',
    evidenceEnv: 'GATE_GLOBAL_HEADER_INTERACTION_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-global-header-interaction.yml',
    legacyJobId: 'global-header-interaction',
    legacyReportingStep: null,
    gateScript: 'scripts/ui/global-header-interaction-browser-smoke.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'smoke',
        command: 'node scripts/ui/global-header-interaction-browser-smoke.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability-after-build',
        legacyIf: "always() && steps.build.outcome == 'success'",
      }),
    ]),
  }),
  'public-first-screen-budget': Object.freeze({
    id: 'public-first-screen-budget',
    jobId: 'public-first-screen-budget',
    jobName: 'Public first-screen budget (unified blocker)',
    outputName: 'gate_public_first_screen_budget',
    applicabilityEnv: 'GATE_PUBLIC_FIRST_SCREEN_BUDGET_APPLICABILITY',
    resultEnv: 'GATE_PUBLIC_FIRST_SCREEN_BUDGET_RESULT',
    jobResultEnv: 'GATE_PUBLIC_FIRST_SCREEN_BUDGET_JOB_RESULT',
    evidenceEnv: 'GATE_PUBLIC_FIRST_SCREEN_BUDGET_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-public-first-screen-budget.yml',
    legacyJobId: 'public-first-screen-budget',
    legacyReportingStep: null,
    gateScript: 'scripts/ui/public-first-screen-budget-browser-smoke.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'first-screen',
        command: 'node scripts/ui/public-first-screen-budget-browser-smoke.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
    ]),
  }),
  'public-navigation': Object.freeze({
    id: 'public-navigation',
    jobId: 'public-navigation',
    jobName: 'Public navigation boundary (unified blocker)',
    outputName: 'gate_public_navigation',
    applicabilityEnv: 'GATE_PUBLIC_NAVIGATION_APPLICABILITY',
    resultEnv: 'GATE_PUBLIC_NAVIGATION_RESULT',
    jobResultEnv: 'GATE_PUBLIC_NAVIGATION_JOB_RESULT',
    evidenceEnv: 'GATE_PUBLIC_NAVIGATION_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-public-navigation-boundary.yml',
    legacyJobId: 'public-navigation',
    legacyReportingStep: null,
    gateScript: 'scripts/seo/public-navigation-boundary-test.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'navigation',
        command: 'node scripts/seo/public-navigation-boundary-test.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
    ]),
  }),
  'public-seo-metadata': Object.freeze({
    id: 'public-seo-metadata',
    jobId: 'public-seo-metadata',
    jobName: 'Public SEO metadata (unified blocker)',
    outputName: 'gate_public_seo_metadata',
    applicabilityEnv: 'GATE_PUBLIC_SEO_METADATA_APPLICABILITY',
    resultEnv: 'GATE_PUBLIC_SEO_METADATA_RESULT',
    jobResultEnv: 'GATE_PUBLIC_SEO_METADATA_JOB_RESULT',
    evidenceEnv: 'GATE_PUBLIC_SEO_METADATA_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-public-seo-metadata.yml',
    legacyJobId: 'public-seo-metadata',
    legacyReportingStep: null,
    gateScript: 'scripts/seo/public-seo-metadata-schema-test.mjs',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'schema',
        command: 'node scripts/seo/public-seo-metadata-schema-test.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability-after-build',
        legacyIf: "always() && steps.build.outcome == 'success'",
      }),
    ]),
  }),
});

/**
 * The EXCLUSIVE SURFACE of one gate: the two files that exist solely to serve it.
 * Nothing else may ever be claimed exclusive, because "exclusive" is precisely
 * what licenses another gate to skip work on it.
 */
export function gateExclusiveSurface(gateId) {
  const gate = GATE_DEFINITIONS[gateId];
  if (!gate) return [];
  return [gate.legacyWorkflow, gate.gateScript];
}

/**
 * The inert set of one gate, DERIVED, never hand-listed.
 *
 * S2-03 spelled the cross-gate entries out by hand, which was tractable for two
 * gates and quadratic in maintenance for four: a fifth gate would have required
 * an author to remember to add its two exclusive files to every existing gate,
 * and forgetting would have been silent (it fails safe — more work runs — but it
 * also means the inert model stops describing reality). Deriving it removes the
 * bookkeeping entirely: a gate's inert set is the S2-01 non-material allowlist
 * plus the exclusive surface of every OTHER registered gate, and nothing else.
 *
 * Two properties this preserves by construction:
 *   * a gate is NEVER inert on its own workflow file or its own gate script,
 *     because its own surface is excluded from the union;
 *   * a file that two gates share (the indexability inventory) is exclusive to
 *     neither and therefore appears in no inert set at all.
 *
 * The claim is still not taken on trust. The contract test re-derives every
 * gate's LIVE S2-02 dependency closure — legacy job and unified job both — and
 * fails if any entry here appears in it, or if any real dependency is missing
 * from the relevant side.
 */
function deriveIrrelevantPaths(gateId) {
  const foreign = Object.keys(GATE_DEFINITIONS)
    .filter((otherId) => otherId !== gateId)
    .flatMap((otherId) => gateExclusiveSurface(otherId))
    .sort();
  return Object.freeze([...UNIVERSALLY_INERT_PATHS, ...foreign]);
}

/**
 * The closed blocker registry.
 *
 * `irrelevantPaths` — EXACT repo-relative paths only. No prefixes and no globs:
 * a prefix would let a future file dropped into that directory inherit inert
 * status without anyone deciding it is inert, which is the same fail-open failure
 * in a different shape (the identical rule the S2-01 allowlist follows).
 */
export const GATES = Object.freeze(
  Object.fromEntries(
    Object.entries(GATE_DEFINITIONS).map(([gateId, gate]) => [
      gateId,
      Object.freeze({ ...gate, irrelevantPaths: deriveIrrelevantPaths(gateId) }),
    ]),
  ),
);

// Stable, sorted, closed. Every consumer iterates THIS, so a gate that exists in
// the workflow but not here (or here but not in the workflow) is a contract
// failure rather than a silently unaggregated job.
export const GATE_IDS = Object.freeze(Object.keys(GATES).sort());

// The blocking command sequence of a gate, DERIVED from its step list so the two
// can never disagree. Consumers that only care about "what does this gate run"
// (the parity proof, the result emitter's arity check) read this.
export function gateCommands(gateId) {
  return GATES[gateId].steps.map((step) => step.command);
}

/** Every step of a job that executes a shell command. `uses:` steps are infrastructure. */
export function runSteps(job) {
  return allSteps(job).filter((step) => typeof step?.run === 'string');
}

/**
 * Every step of a job, WHATEVER its shape — `run:`, `uses:`, or any other
 * legitimate step form. Terminality is judged against THIS, never against the
 * run-step projection: see `terminalReportingStep`.
 */
export function allSteps(job) {
  return Array.isArray(job?.steps) ? job.steps : [];
}

// ---------------------------------------------------------------------------
// SUMMARY-ONLY SHELL POLICY
// ---------------------------------------------------------------------------
//
// The question this answers is narrow and adversarial: does this `run:` body do
// NOTHING except put text into the GitHub step summary?
//
// It is stated as a POSITIVE ALLOWLIST, and that shape is the whole point. A
// denylist of dangerous executables ("not npm, not node") is unbounded — python,
// python3, bash, sh, pwsh, powershell, git, curl, wget, ./script, chmod, cp, mv,
// rm, and every executable nobody thought of — and each name missing from it is
// a silent hole through which real work hides behind a reporting name. An
// allowlist inverts the default: anything not recognised as pure summary text is
// blocking work, so the unknown case is the SAFE case.

/**
 * The ONLY command a reporting step may invoke.
 *
 * `echo` alone, and the singular is the point. `echo` is a shell builtin whose
 * ENTIRE effect is bytes on stdout: it cannot assign a variable, export one,
 * open a file, or change any state the next command can observe. That makes the
 * policy STATELESS — every line can be judged on its own, because no line can
 * change what a later line means.
 *
 * `printf` used to be here and was REMOVED, because it breaks exactly that
 * property. Bash's builtin `printf` takes `-v NAME`, which assigns to a shell
 * variable instead of printing:
 *
 *     printf -v GITHUB_STEP_SUMMARY /tmp/not-summary >> "$GITHUB_STEP_SUMMARY"
 *     echo "payload" >> "$GITHUB_STEP_SUMMARY"
 *
 * Both lines pass a per-line "command is allowlisted, redirect names the
 * approved target" test, yet the SECOND redirect expands a variable the FIRST
 * line rewrote — the payload lands in an attacker-chosen file while the body
 * reads as summary-only. No amount of option parsing fixes this safely: it
 * would mean modelling `printf`'s full option grammar and then trusting that
 * model, when the only thing the real legacy summary step ever needed was
 * `echo`. Under-accepting costs a summary step its exclusion and nothing more;
 * over-accepting is how blocking work disappears. So `printf` stays out, and
 * any body containing it remains BLOCKING work.
 */
const SUMMARY_ONLY_COMMANDS = new Set(['echo']);

/**
 * Words that could carry state or option semantics, rejected wherever they
 * appear — command position or argument position, and regardless of the command
 * they sit next to.
 *
 * `NAME=value` is a shell assignment (`GITHUB_STEP_SUMMARY=/tmp/x`, or the
 * prefix form `GITHUB_STEP_SUMMARY=/tmp/x echo hi`), and a leading `-` is an
 * option, which is how `printf -v` smuggled an assignment past a
 * command-name-only allowlist. Neither has any business in prose destined for a
 * markdown summary — every argument in the real legacy step is a quoted string
 * — so both are refused structurally rather than reasoned about per command.
 */
const STATE_MUTATING_WORD = /^(?:-|[A-Za-z_][A-Za-z0-9_]*=)/;

/**
 * The ONLY redirection destinations, as EXACT source spellings, because quoting
 * changes the meaning. `'$GITHUB_STEP_SUMMARY'` is deliberately absent: single
 * quotes suppress expansion, so it appends to a workspace file literally named
 * `$GITHUB_STEP_SUMMARY` — a side effect on the checkout, not a summary write.
 */
const SUMMARY_REDIRECT_TARGETS = new Set([
  '"$GITHUB_STEP_SUMMARY"',
  '"${GITHUB_STEP_SUMMARY}"',
  '$GITHUB_STEP_SUMMARY',
  '${GITHUB_STEP_SUMMARY}',
]);

/**
 * The shells this validator is written for. A `run:` body under `shell: python`
 * or `shell: pwsh` is not shell at all, so validating it with a POSIX-sh reader
 * would be reading a different language and reaching a confident wrong answer.
 */
const SUMMARY_ONLY_SHELLS = new Set(['bash', 'sh']);

/**
 * Tokenize ONE line of the conservative shell subset this policy accepts.
 *
 * Returns `null` — meaning "not obviously summary-only, treat the step as
 * blocking" — the moment it meets anything outside that subset. It is not a
 * general shell parser and does not try to be: every construct it does not
 * model is a REJECTION, never a guess.
 *
 * Rejected outright (unquoted): command substitution (`` ` `` and `$(`),
 * pipelines and lists (`|`, `&`, `;`), subshells (`(`, `)`), input redirection
 * and heredocs (`<`, `<<`), truncating redirection (`>`), and backslash
 * escapes. Only `>>` survives, and only pointing at the step summary.
 *
 * @param {string} line one already-trimmed logical line
 * @returns {{raw: string, operator: boolean}[]|null} tokens, or null to reject
 */
function tokenizeSummaryOnlyLine(line) {
  const tokens = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === ' ' || char === '\t') {
      index += 1;
      continue;
    }
    // A `#` at a word boundary starts a comment; the rest of the line is prose.
    if (char === '#') return tokens;
    if (char === '>') {
      // `>>` and nothing else. `>` truncates, `>>>` is not sh — both rejected.
      if (line[index + 1] !== '>' || line[index + 2] === '>') return null;
      tokens.push({ raw: '>>', operator: true });
      index += 2;
      continue;
    }
    let raw = '';
    let quote = null;
    let rejected = false;
    while (index < line.length) {
      const inner = line[index];
      if (quote === "'") {
        // Single quotes suppress EVERY special meaning, so the contents need no
        // inspection at all — this is why `echo '> table |---|'` is fine.
        raw += inner;
        index += 1;
        if (inner === "'") quote = null;
        continue;
      }
      if (quote === '"') {
        if (inner === '`') { rejected = true; break; }
        if (inner === '$' && line[index + 1] === '(') { rejected = true; break; }
        if (inner === '\\') { rejected = true; break; }
        raw += inner;
        index += 1;
        if (inner === '"') quote = null;
        continue;
      }
      if (inner === ' ' || inner === '\t') break;
      if (inner === '>' || inner === '<') break;
      if (inner === '`' || inner === ';' || inner === '&' || inner === '|'
        || inner === '(' || inner === ')' || inner === '\\') { rejected = true; break; }
      if (inner === '$' && line[index + 1] === '(') { rejected = true; break; }
      if (inner === "'" || inner === '"') { quote = inner; raw += inner; index += 1; continue; }
      raw += inner;
      index += 1;
    }
    // An unterminated quote means the line does not stand alone, `<` means input
    // redirection or a heredoc, and an empty word means we stopped on an
    // operator we do not model. All three are rejections.
    if (rejected || quote !== null || raw === '') return null;
    tokens.push({ raw, operator: false });
  }
  return tokens;
}

/** Exactly `>> <the step summary>`, with nothing before or after it. */
function isSummaryRedirect(tokens) {
  return tokens.length === 2
    && tokens[0].operator && tokens[0].raw === '>>'
    && !tokens[1].operator && SUMMARY_REDIRECT_TARGETS.has(tokens[1].raw);
}

/**
 * Is this `run:` body PURE SUMMARY TEXT — nothing but `echo` whose only
 * destination is $GITHUB_STEP_SUMMARY?
 *
 * Accepts exactly two shapes, both of which must actually reach the summary:
 *
 *   1. `echo …  >> "$GITHUB_STEP_SUMMARY"` — a per-command redirect.
 *   2. `{ … } >> "$GITHUB_STEP_SUMMARY"` — a brace group of bare `echo`
 *      commands whose SINGLE redirect is the group's. This is the shape the real
 *      legacy Exchange Preview Family `Summary` step uses.
 *
 * Heredocs are NOT accepted. That is a deliberate fail-closed omission rather
 * than an oversight: recognising one correctly means modelling delimiter
 * quoting and expansion, and a summary step that starts using one simply stays
 * in the blocking set, where parity reports it loudly. Under-accepting can only
 * add work to the parity proof; over-accepting is how blocking work disappears.
 *
 * @param {unknown} body the step's `run:` text
 * @returns {boolean} true ONLY when the body is provably summary-only
 */
export function isSummaryOnlyReportingBody(body) {
  if (typeof body !== 'string' || body.length === 0) return false;
  if (body.includes('\0')) return false;
  let inGroup = false;
  let wroteToSummary = false;
  let ranSummaryCommand = false;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line === '{') {
      if (inGroup) return false; // nesting is not modelled
      inGroup = true;
      continue;
    }
    if (line.startsWith('}')) {
      if (!inGroup) return false;
      const closing = tokenizeSummaryOnlyLine(line.slice(1));
      if (closing === null || !isSummaryRedirect(closing)) return false;
      inGroup = false;
      wroteToSummary = true;
      continue;
    }
    const tokens = tokenizeSummaryOnlyLine(line);
    if (tokens === null || tokens.length === 0) return false;
    // THE ALLOWLIST. `python`, `bash`, `git`, `./script`, `chmod`, `export`,
    // `printf` and every other executable fail here by not being on it — no
    // denylist needed. `GITHUB_STEP_SUMMARY=/tmp/x` fails here too: an
    // assignment word is not `echo`.
    if (tokens[0].operator || !SUMMARY_ONLY_COMMANDS.has(tokens[0].raw)) return false;
    // NO WORD may look like an option or an assignment, anywhere in the line.
    // This is what makes the policy stateless: with `printf` gone there is no
    // allowlisted command that CAN mutate state, and this refuses the shapes
    // that would carry state even if one ever reappeared.
    if (tokens.some((token) => !token.operator && STATE_MUTATING_WORD.test(token.raw))) return false;
    const operatorAt = tokens.findIndex((token) => token.operator);
    if (operatorAt === -1) {
      // No redirect of its own: legitimate ONLY inside a group that redirects to
      // the summary. Outside one, the text goes to the log, not the summary.
      if (!inGroup) return false;
    } else {
      // A redirect inside a group would fight the group's own — reject rather
      // than reason about which one wins.
      if (inGroup) return false;
      if (!isSummaryRedirect(tokens.slice(operatorAt))) return false;
      wroteToSummary = true;
    }
    ranSummaryCommand = true;
  }
  if (inGroup) return false; // unterminated group
  return ranSummaryCommand && wroteToSummary;
}

/**
 * Is this legacy step a TERMINAL NON-BLOCKING REPORTING step?
 *
 * S2-04 batch 02 is the first stage to migrate a legacy job that ends in one.
 * `cbw-exchange-preview-family.yml` closes with a `Summary` step that renders a
 * markdown table into $GITHUB_STEP_SUMMARY. It executes no repository command,
 * so demanding the unified blocker reproduce it would be demanding parity on
 * PROSE — and the unified job's counterpart is the result emitter, which is
 * already excluded from the parity comparison on exactly the same grounds.
 *
 * The danger in excluding anything from a parity proof is obvious: "it's only a
 * summary" is precisely how real blocking work gets dropped. So exclusion is
 * never asserted, it is EARNED. A step qualifies only when ALL FOUR hold, and
 * anything that fails even one stays in the blocking set — where parity will
 * demand the unified job reproduce it, loudly. The predicate is fail-CLOSED: the
 * default answer is "this is blocking work".
 *
 *   1. TERMINAL — it is the last ACTUAL step of the job, so no later step can
 *      observe it and it cannot gate anything. Terminality is judged against the
 *      COMPLETE step array, never against the run-step projection. Filtering to
 *      run steps first would let `Summary` followed by `uses: actions/…`
 *      qualify: the summary would be the last RUN step while a real action
 *      executed after it — the exclusion would then be hiding a step that DOES
 *      work, which is the precise failure this predicate exists to prevent.
 *   2. `if: always()` EXACTLY — it therefore never changes WHICH steps run. A
 *      narrower condition would make it observable in the failure cross-product.
 *   3. Its body is PROVABLY SUMMARY-ONLY under `isSummaryOnlyReportingBody` — a
 *      positive allowlist of `echo` writing only to
 *      $GITHUB_STEP_SUMMARY. Not "it mentions the summary and is not npm": that
 *      is a denylist, and every executable absent from a denylist (python, bash,
 *      pwsh, git, curl, ./script, chmod, …) is a hole.
 *   4. It runs under a shell this policy can actually read. `shell: python` or
 *      `shell: pwsh` means the body is not sh, so a sh reader's verdict on it
 *      would be confident and meaningless.
 *
 * @param {object} job the parsed legacy job
 * @returns {object|null} the step, or null when the job has no such step
 */
export function terminalReportingStep(job) {
  const steps = allSteps(job);
  const last = steps[steps.length - 1];
  if (!last || typeof last !== 'object') return null;
  // The last ACTUAL step must be the reporting step itself. A `uses:` step, or
  // any other step shape, occupying the final slot means the job does not end in
  // reporting and NOTHING may be excluded from it.
  if (typeof last.run !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(last, 'uses')) return null;
  if (String(last.if ?? '').trim() !== 'always()') return null;
  const shell = last.shell;
  if (shell !== undefined && shell !== null && !SUMMARY_ONLY_SHELLS.has(String(shell).trim())) return null;
  if (!isSummaryOnlyReportingBody(last.run)) return null;
  return last;
}

/**
 * The BLOCKING run steps of a legacy job: every run step except a proven
 * terminal reporting step. This is the sequence the unified blocker must
 * reproduce command-for-command.
 */
export function legacyBlockingSteps(job) {
  const steps = runSteps(job);
  const reporting = terminalReportingStep(job);
  // Removed BY IDENTITY, not by position. `slice(0, -1)` silently drops whatever
  // happens to sit last in the run-step projection, which is a different step
  // from the proven one the moment the job's shape changes.
  return reporting === null ? steps : steps.filter((step) => step !== reporting);
}

// The stable visible check context of the final aggregator. Branch protection
// names this string and nothing else.
export const FINAL_CHECK_CONTEXT = 'Master required gate';
export const FINAL_JOB_ID = 'master-required-gate';
export const CLASSIFY_JOB_ID = 'classify';

export const APPLICABILITY_SIDECAR_BASENAME = 'cbw-master-required-gate-applicability.json';

// Resolved through the classifier's OWN fail-closed RUNNER_TEMP helper — there is
// no second copy of that logic and therefore no second place for a
// process-global temp fallback to reappear.
export function applicabilityResultFilePath() {
  return join(runnerTempDir(), APPLICABILITY_SIDECAR_BASENAME);
}

/**
 * Applicability of ONE gate against an exact changed-path set.
 *
 * @param {string} gateId
 * @param {string[]|null} paths repo-relative changed paths, or null when the
 *   changed-file resolution itself failed.
 * @returns {{applicability: string, reason: string, relevant: string[]}}
 */
export function classifyGateApplicability(gateId, paths) {
  const gate = GATES[gateId];
  if (!gate) {
    // An unknown gate is not a reason to skip work. Fail closed.
    return { applicability: 'APPLICABLE', reason: 'unresolved-or-empty-change-set', relevant: [] };
  }
  if (!Array.isArray(paths) || paths.length === 0) {
    return { applicability: 'APPLICABLE', reason: 'unresolved-or-empty-change-set', relevant: [] };
  }
  const inert = new Set(gate.irrelevantPaths);
  const relevant = [];
  for (const path of paths) {
    // A path that does not normalize (non-string, empty, absolute, traversing)
    // is never inert — the same fail-closed rule the classifier applies.
    const normalized = normalizePath(path);
    if (normalized === null || !inert.has(normalized)) relevant.push(path);
  }
  return relevant.length > 0
    ? { applicability: 'APPLICABLE', reason: 'relevant-path-changed', relevant }
    : { applicability: 'NOT_APPLICABLE', reason: 'only-gate-irrelevant-paths', relevant: [] };
}

/**
 * The whole decision for every registered gate, plus the evidence that justifies
 * it. `material` / `materialReason` are the S2-01 classification for the SAME
 * change set, carried here so the two statements can be cross-checked rather
 * than trusted independently.
 *
 * @returns {{gates: Record<string,string>, reasons: Record<string,string>,
 *   changedPaths: string[]|null, material: string, materialReason: string}}
 */
export function classifyAllGates({ paths, material, materialReason }) {
  const gates = {};
  const reasons = {};
  for (const gateId of GATE_IDS) {
    const decision = classifyGateApplicability(gateId, paths);
    gates[gateId] = decision.applicability;
    reasons[gateId] = decision.reason;
  }
  return {
    gates,
    reasons,
    changedPaths: Array.isArray(paths) ? [...paths].sort() : null,
    material: String(material),
    materialReason: String(materialReason),
  };
}

/**
 * Canonical serialization of a decision. Key order is FIXED here rather than
 * inherited from object construction order, because the digest below is the
 * evidence token every downstream job compares against — a digest that depends on
 * insertion order would differ between two identical decisions.
 */
export function canonicalizeDecision(decision, identity) {
  const gates = {};
  const reasons = {};
  for (const gateId of GATE_IDS) {
    gates[gateId] = String(decision?.gates?.[gateId]);
    reasons[gateId] = String(decision?.reasons?.[gateId]);
  }
  return JSON.stringify({
    gateIds: [...GATE_IDS],
    gates,
    reasons,
    changedPaths: Array.isArray(decision?.changedPaths) ? [...decision.changedPaths].sort() : null,
    material: String(decision?.material),
    materialReason: String(decision?.materialReason),
    headSha: String(identity?.headSha),
    runId: String(identity?.runId),
    runAttempt: String(identity?.runAttempt),
  });
}

// The EVIDENCE TOKEN. Every blocker job echoes the digest it was handed, and the
// aggregator requires an exact match against the classifier's own digest. A
// blocker that was launched from a different (stale, re-run, hand-edited)
// applicability decision therefore cannot have its NOT_APPLICABLE accepted.
export function applicabilityDigest(decision, identity) {
  return createHash('sha256').update(canonicalizeDecision(decision, identity)).digest('hex');
}

/**
 * Cross-check between the S2-01 materiality statement and the S2-03 applicability
 * statement for the SAME change set. Returns a list of human-readable
 * inconsistencies; empty means consistent.
 *
 * Two invariants, both derived from the fact that every gate's inert set is a
 * SUPERSET of the non-material allowlist:
 *
 *   1. material === 'false' means every changed path is on the non-material
 *      allowlist, which is inert for every gate, so EVERY gate must be
 *      NOT_APPLICABLE. A gate claiming APPLICABLE there means the two classifiers
 *      disagree about the same diff.
 *   2. a gate that is APPLICABLE for reason `relevant-path-changed` saw a path
 *      outside its inert set, which is therefore outside the non-material
 *      allowlist, so material MUST be 'true'.
 */
export function checkApplicabilityMaterialityConsistency({ gates, reasons, material }) {
  const errors = [];
  if (material !== 'true' && material !== 'false') {
    errors.push(`materiality ${JSON.stringify(material)} is not exactly "true" or "false"`);
    return errors;
  }
  for (const gateId of GATE_IDS) {
    const applicability = gates?.[gateId];
    const reason = reasons?.[gateId];
    if (!APPLICABILITY_VALUES.includes(applicability)) {
      errors.push(`gate ${gateId} applicability ${JSON.stringify(applicability)} is outside the closed vocabulary`);
      continue;
    }
    if (!isConsistentApplicability(applicability, reason)) {
      errors.push(
        `gate ${gateId} applicability ${JSON.stringify(applicability)} contradicts reason ${JSON.stringify(reason)}`,
      );
      continue;
    }
    if (material === 'false' && applicability !== 'NOT_APPLICABLE') {
      errors.push(
        `gate ${gateId} is ${applicability} while the change set classified NON-MATERIAL — every ` +
          'non-material path is inert for every gate, so the two classifications contradict each other',
      );
    }
    if (material === 'true' && applicability === 'NOT_APPLICABLE' && reason !== 'only-gate-irrelevant-paths') {
      errors.push(`gate ${gateId} claims NOT_APPLICABLE without the affirmative inert-paths justification`);
    }
    if (applicability === 'APPLICABLE' && reason === 'relevant-path-changed' && material !== 'true') {
      errors.push(
        `gate ${gateId} saw a relevant path while the change set classified NON-MATERIAL`,
      );
    }
  }
  return errors;
}
