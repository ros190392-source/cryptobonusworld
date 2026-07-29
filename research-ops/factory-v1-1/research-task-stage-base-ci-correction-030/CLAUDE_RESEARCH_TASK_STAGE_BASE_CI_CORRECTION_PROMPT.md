# Claude execution prompt — Research-Task Stage-Base CI Correction 030

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: #86  
Blocked capture Issue: #85  
Source Deep Research Issue: #84  
Protected pilot PR: #69  
Expected correction branch: `correction/researchops-subscription-factory-v1-1-research-task-stage-base-ci-030`

## Owner authorization

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030
```

This authorizes only the governed Factory correction in Issue #86 and the frozen contract/state/prompt. It does not authorize publishing to `main`, changing PR #69, rerunning Source Truth Review, import, production, or deploy.

## Exact protected facts

```text
approved main base:
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1

protected master:
998fcedd7d9febbec5b130d4765dfeaafc40960b

protected pilot PR #69 head:
923c2b58406f84b4355094f2e71f20a1931f70ea

trusted pilot transition base:
6ce489ff10655f65e62a76d1a5635aa80e73b44a

failing workflow run:
30446016864
```

## Mandatory reads

Read completely before editing:

1. Issue #86.
2. Issue #85.
3. Issue #84.
4. PR #69 and all comments relevant to runs `30354217948` and `30446016864`.
5. This complete directory:

```text
research-ops/factory-v1-1/research-task-stage-base-ci-correction-030/
```

6. Current Factory files:

```text
.github/workflows/cbw-researchops-factory-validate.yml
research-ops/factory-v1-1/bin/researchops.mjs
research-ops/factory-v1-1/lib/boundary.mjs
research-ops/factory-v1-1/lib/stage.mjs
research-ops/factory-v1-1/lib/model.mjs
research-ops/factory-v1-1/lib/evidence.mjs
research-ops/factory-v1-1/lib/validate.mjs
research-ops/factory-v1-1/lib/eventintegrity.mjs
research-ops/factory-v1-1/lib/bootstrap.mjs
research-ops/factory-v1-1/lib/roles.mjs
research-ops/factory-v1-1/lib/lineage.mjs
research-ops/factory-v1-1/fixtures/run.mjs
```

7. Exact protected task evidence at commits `6ce489f…` and `923c2b5…`, read-only.
8. Workflow job logs for run `30446016864`.

## Frozen setup verification

The owner setup directory must contain exactly these three files before worker changes:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_CONTRACT.md
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_STATE.json
CLAUDE_RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_PROMPT.md
```

Verify they were added after exact approved base `dcc8069…`, additions only. Do not modify them.

Stop if the branch, base, Issue, protected refs, setup identity, allowed paths, or authorization floor differs.

## Problem statement

The current workflow validates a `research/**` PR from the trusted PR base SHA. That remains correct for cumulative ancestry and path scope. It is insufficient for stage validation when the task root was introduced earlier in the same long-lived PR and has since advanced beyond `PREPARED`.

For PR #69, current workflow evaluates:

```text
babe80f… → 923c2b5…
```

The task root is absent at `babe80f…`, so the boundary treats the cumulative root as a new creation and rejects head state `RESEARCH_CAPTURED`.

The valid task mutation segment is:

```text
6ce489f… → 923c2b5…
PREPARED → RESEARCH_CAPTURED
```

Do not solve this by blindly using `HEAD^`.

## Required architecture of the fix

Implement two simultaneous enforcement layers for research-task PRs.

### Layer A — cumulative PR scope

Continue to verify from trusted GitHub event metadata:

- canonical `research/**` head branch;
- `main` base branch;
- exact checked-out trusted head;
- full non-shallow history;
- trusted base/head ancestry;
- cumulative `PR base → head` changed paths;
- exactly one governed task root;
- no Factory/workflow/application/production/other-root escape;
- task identity and branch binding.

No cumulative path-scope check may be removed or narrowed to only the last commit.

### Layer B — trusted task mutation chain

When the task root is absent at the PR base, derive the task's actual mutation history from Git objects.

Preferred fail-closed model:

1. Walk the trusted head's first-parent ancestry backward while the task root exists.
2. Compare task-root tree objects between each commit and its first parent.
3. Record only commits where the task-root tree changes.
4. Continue until the first parent where the task root is absent.
5. Reverse the collected mutation segments into chronological order.
6. Require one unique linear chain.
7. Validate introduction as absent → exact `PREPARED` skeleton.
8. Validate every later segment with canonical `checkStageTransition` and `checkHistoryAppendOnly` semantics.
9. Require the current head task-root tree to equal the final mutation segment's head tree.
10. Require the current head TASK_STATE identity and branch to match the task root and trusted PR branch.

Main-sync merge commits may appear in first-parent history. They are acceptable only when their task-root tree is byte-identical to their first parent and therefore create no task mutation segment.

A merge commit that changes the task-root tree must fail closed unless a fully deterministic unique predecessor proof is implemented. Rejecting all root-changing merge commits is acceptable and preferred.

Do not rely on commit messages, author identity, timestamps, comments, PR body, mutable task fields, or environment-provided transition SHAs.

## Implementation boundaries

Modify only the minimum necessary subset of:

```text
.github/workflows/cbw-researchops-factory-validate.yml
research-ops/factory-v1-1/bin/researchops.mjs
research-ops/factory-v1-1/lib/boundary.mjs
research-ops/factory-v1-1/lib/stage.mjs
research-ops/factory-v1-1/lib/taskhistory.mjs
research-ops/factory-v1-1/fixtures/run.mjs
```

`taskhistory.mjs` may be created as a dependency-free helper. No other implementation file is authorized.

Do not modify `stage.mjs` unless reuse/extraction is genuinely necessary. Never weaken its state transition map, exact stage additions, deterministic skeleton, or history rules.

## CLI and workflow behavior

The protected-base CLI must remain the enforcement authority.

The workflow may continue to generate the cumulative `PR base → head` NUL-delimited name-status stream. The CLI/boundary must additionally derive and validate the task mutation chain from trusted Git objects.

The final successful output for a progressed task must expose deterministic evidence, for example:

```text
BOUNDARY mode=RESEARCH_TASK taskRoots=[...]
TASK_CHAIN root=...
TRANSITION ABSENT -> PREPARED base=<sha> head=<sha>
TRANSITION PREPARED -> RESEARCH_CAPTURED base=<sha> head=<sha>
RESULT: BOUNDARY OK
```

Exact wording may differ, but root, states, and transition SHAs must be machine-readable and shown in logs.

For the protected pilot reproduction, output must include exactly:

```text
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
```

Do not hard-code those values in production logic. They are regression expectations only.

## Mandatory fixtures

Preserve every existing fixture. Add positive and negative fixtures for all Issue #86 cases, including:

- initial exact PREPARED creation;
- exact PREPARED → RESEARCH_CAPTURED;
- no-task-change main-sync merge;
- arbitrary `HEAD^` not trusted;
- skipped state;
- history rewrite/reorder/truncation;
- earlier-stage mutation;
- twelfth output file;
- missing output file;
- two task roots;
- mixed research/factory paths;
- root/taskId mismatch;
- branch mismatch;
- parallel/incomparable mutations;
- root-changing merge ambiguity;
- head tree mismatch;
- authorization floor unchanged.

Use synthetic deterministic Git repositories or pure helper inputs where appropriate. Do not weaken tests to fit the implementation.

Record the final fixture count and require zero failures.

## Exact pilot reproduction

Use the real repository commits read-only.

At minimum, execute an equivalent of the production protected-base boundary check against:

```text
trusted PR base for the recorded failed event:
babe80fe2bdcb7891dddf63aa8064532626a8fba

trusted head:
923c2b58406f84b4355094f2e71f20a1931f70ea

head branch:
research/kz-binance-kz-p0-d

base branch:
main
```

Require cumulative scope remains one task root and the chain resolves the exact capture segment `6ce489f… → 923c2b5…` as `PREPARED → RESEARCH_CAPTURED`.

Also validate the task at `923c2b5…` with `--require-package` and require package/state validity.

Do not push or change PR #69. Do not rerun its workflow under this task.

## Validation before result records

Require:

1. frozen setup unchanged;
2. changed implementation files are a subset of the exact allowlist;
3. no task-root or protected pilot mutation;
4. all Factory `.mjs` syntax checks pass;
5. all original and new fixtures pass, zero failures;
6. exact pilot reproduction passes;
7. local correction-branch workflow-equivalent boundary passes;
8. `git diff --check` passes;
9. main remains `dcc8069…`;
10. master remains `998fced…`;
11. PR #69 remains `923c2b5…`, open/draft/unmerged;
12. Issues #84/#85 remain open;
13. all 18 authorizations remain false.

## Commits and result records

Create an implementation commit containing only allowed implementation files.

Then create exactly:

```text
research-ops/factory-v1-1/research-task-stage-base-ci-correction-030/RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_RESULT.json
research-ops/factory-v1-1/research-task-stage-base-ci-correction-030/RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_RESULT.md
```

The result records must include:

- decision;
- approved base and frozen setup SHA;
- implementation commit and final recording commit;
- exact modified implementation inventory;
- algorithm and trust model;
- positive/negative fixture inventory and final count;
- exact pilot reproduction output with both SHAs;
- syntax, fixture, diff and local validation evidence;
- real correction PR workflow run and step evidence;
- unchanged main/master/PR #69/Issues #84/#85;
- all authorization flags false;
- limitations and next separately authorized step.

Commit the two result files in one recording commit. Push ordinary non-force to the existing correction branch.

Use the existing draft PR for this branch. Do not create another PR, mark ready, merge, rebase, reset, squash, cherry-pick, force-push, or delete branches.

## Real correction PR workflow

Wait for the exact final recording commit's real workflow.

Require every applicable step to execute and succeed under protected-base Factory governance, including:

```text
ENFORCEMENT: DESCENDANT (protected base policy)
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
```

The correction PR's own workflow does not prove the pilot passed; the separate exact pilot reproduction is also mandatory.

## Hard prohibitions

Do not:

- modify or rerun PR #69;
- edit any of its 11 research files or TASK_STATE;
- close Issues #84/#85;
- begin Source Truth Review;
- publish this correction to main;
- import/canonicalize research;
- change rankings, Top-10, CTA, promo, affiliate route, publication binding, sitemap, indexability, or MIGRATION_5;
- touch master or production;
- deploy;
- create V5.

## Final decision

Return exactly one:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_READY_FOR_OWNER_APPROVAL
```

or:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_BLOCKED
```

Return a final report titled:

```text
CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030 — Final Report
```

READY does not authorize merge. Leave the correction PR draft/open/unmerged for independent owner audit.