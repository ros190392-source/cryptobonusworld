# Claude Code execution prompt — ResearchOps Subscription Factory V1.1

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-008`

## Repository

- remote: `ros190392-source/cryptobonusworld`
- local source repo: `C:\projects\CryptoBonusWorld`
- target branch: `feat/researchops-subscription-factory-v1-1`
- base branch: `main`
- required base SHA: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected production-authority branch: `master`
- required unchanged master SHA: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- governing issue: `#43`
- draft PR: `#44`
- isolated worktree: `C:\projects\CryptoBonusWorld-researchops-factory-v1-1`

## Phase 0 — safety verification

Do not modify the current source worktree.

Run from `C:\projects\CryptoBonusWorld`:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git worktree list
git fetch origin --prune
```

Require:

```text
origin/main = 04157b9dfb140918a8569a5026da747b429e5ed3
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Resolve the current head of:

```text
origin/feat/researchops-subscription-factory-v1-1
```

Require it to equal the current PR #44 head before any implementation work. If PR #44 or the branch moved unexpectedly, stop with:

`FACTORY BASELINE MISMATCH`

Create or safely reuse the isolated worktree:

```text
C:\projects\CryptoBonusWorld-researchops-factory-v1-1
```

Use the tracked remote branch. Do not delete, detach or overwrite any existing worktree automatically.

All implementation work must occur only in that isolated worktree.

## Phase 1 — mandatory reads

Read completely:

- GitHub Issue #43;
- draft PR #44 metadata and changed files;
- `research-ops/factory-v1-1/governance/FACTORY_CONTRACT.md`;
- `research-ops/factory-v1-1/governance/FACTORY_STATE.json`;
- `research-ops/factory-v1-1/governance/OWNER_AUTHORIZATION_RECEIPT.json`;
- this prompt;
- `research-ops-pilot/protocols/CBW_SUBSCRIPTION_RESEARCH_HANDOFF_V1.md`;
- the completed OKX task structure under `research-ops-pilot/tasks/CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1/` as a read-only reference;
- current factory-relevant `.github/workflows/**` files;
- current `main` repository structure.

Do not edit completed OKX research records.

## Phase 2 — foundation audit

Before coding, determine and report:

1. whether a root `package.json` actually exists in the checked-out `main` tree;
2. whether `npm ci` is valid on `main`;
3. which existing AI Ops validators can be reused without importing production code from `master`;
4. whether any existing workflow assumes application files that are absent from `main`;
5. the exact implementation file plan within the authorized boundary.

The canonical factory CLI must remain directly runnable with Node 20 and built-in modules only:

```text
node research-ops/factory-v1-1/bin/researchops.mjs <command>
```

Do not create a new root package manifest merely to provide npm aliases.

## Phase 3 — implementation requirements

Implement the factory defined by Issue #43.

### Required commands

```text
create
validate
status
```

Use strict argument parsing. Reject unknown flags, duplicate flags, missing values, unsafe paths, invalid task IDs and unsupported states.

### `create`

Create a deterministic task under:

```text
research-ops/tasks/<TASK_ID>/
```

Required inputs:

- country code and name;
- exchange ID and name;
- batch ID;
- priority;
- task ID.

Create-only: fail if the task path already exists. Never overwrite.

Generate:

- `00-contract/IDENTITY.json`;
- `00-contract/DEEP_RESEARCH_PROMPT.md`;
- `00-contract/SOURCE_TRUTH_REVIEW_CONTRACT.md`;
- `00-contract/CORRECTION_CONTRACT.md`;
- `00-contract/VALIDATION_CONTRACT.md`;
- `00-contract/OWNER_CLOSEOUT_CONTRACT.md`;
- `00-contract/GITHUB_PLAN.json`;
- empty stage directories represented safely where necessary;
- `TASK_STATE.json` in `PREPARED` state;
- exact required eleven-file inventory;
- every authorization false.

The generated GitHub plan must define one task branch and one draft PR to `main`; it must not execute a merge.

### `validate`

Validate both freshly prepared and progressed task states.

At minimum implement:

- directory and flat-inventory checks;
- state enum and transition checks;
- nine JSON parse checks;
- canonical UTF-8 without BOM and LF checks;
- MANIFEST byte-size and SHA-256 checks;
- unique source/claim/conflict/product/rail IDs;
- source and claim cross-reference resolution;
- all-false authorization floor;
- exact owner research-record merge receipt exception;
- rejection of canonical/production authorization escalation;
- executable, symlink, hidden payload and path-traversal checks;
- immutable prior-stage validation;
- append-only changed-file boundary validation when base/current refs are provided;
- JSON and Markdown validation reports.

Do not silently repair files during validation.

### `status`

Return deterministic human and JSON status output. Derive the state from `TASK_STATE.json` plus validated stage evidence. Do not claim a later state when required files are missing or invalid.

### Schemas and templates

Store versioned schemas and templates under `research-ops/factory-v1-1/`. Keep schemas narrow and explicit. Do not add arbitrary pass-through fields that could bypass authorization checks.

### Fixtures

Implement all Issue #43 fixture scenarios. Use temporary directories and Node built-ins. Tests must not write into tracked `research-ops/tasks/`.

Provide one command that runs the complete fixture suite directly with Node.

### Workflow

Create a factory-specific pull-request validation workflow that:

- scopes to `research-ops/**` and its own workflow path;
- uses `contents: read` only;
- uses Node 20;
- invokes the direct Node CLI/test runner;
- discovers changed task roots safely;
- fails closed;
- writes a clear step summary;
- never creates issues/branches/PRs;
- never merges;
- never deploys;
- never calls an AI provider.

A task-creation workflow is optional for this task. Prefer not to include it unless it can be proven create-only, idempotent and safe without broad permissions.

## Phase 4 — authorized write boundary

Allowed:

```text
research-ops/factory-v1-1/**
.github/workflows/<factory-specific-files>
package.json only if it already existed on main, and only additive aliases
```

Forbidden:

```text
research-ops-pilot/tasks/**
master
production code/data
canonical market-intelligence data
src/**
public/**
routes/pages
ranking/CTA/promo/affiliate bindings
sitemap/indexability
deployment configuration
```

The existing governance files may be read but must not be modified, except `FACTORY_STATE.json` may be updated at the end with implementation and validation results.

Do not create the Binance pilot task.

## Phase 5 — validation

Run at minimum:

1. syntax checks for every `.mjs` file;
2. full fixture suite;
3. create a valid task in a temporary directory;
4. validate the created task;
5. status the created task;
6. verify duplicate-create refusal;
7. verify every negative fixture fails for the expected reason;
8. workflow YAML structural review;
9. `git diff --check`;
10. changed-file boundary check against the initial implementation branch head;
11. compare `origin/master` to `998fcedd7d9febbec5b130d4765dfeaafc40960b` and require identical.

If a compatible package manifest exists and was not modified unsafely, run its relevant existing tests as well. Do not run deploy.

## Phase 6 — state update

Update only the permitted fields in:

```text
research-ops/factory-v1-1/governance/FACTORY_STATE.json
```

Set state to one of:

- `IMPLEMENTED_READY_FOR_VALIDATION` when all implementation tests pass;
- `IMPLEMENTATION_BLOCKED` when a material requirement remains unresolved.

Record:

- implementation commit remains null before commit;
- exact file count;
- fixture pass/fail counts;
- CLI validation outcome;
- workflow validation outcome;
- package-manifest finding;
- remaining limitations;
- all production/activation authorizations false.

## Phase 7 — commit and push

Before commit, compare against the initial implementation branch head and require every changed path to fall within the authorized boundary.

Commit implementation with:

```text
feat(researchops): build subscription factory v1.1
```

Push only:

```text
origin/feat/researchops-subscription-factory-v1-1
```

Do not merge PR #44. Do not mark it ready. Do not modify `main` or `master`. Do not deploy.

## Final report

Return:

1. PASS or BLOCKED;
2. initial implementation head;
3. final implementation commit SHA;
4. complete changed-file inventory;
5. foundation audit results;
6. CLI commands implemented;
7. generated task file inventory;
8. validation checks implemented;
9. fixture pass/fail counts;
10. workflow file and permissions;
11. whether a root package manifest exists and whether it was modified;
12. `git diff --check` result;
13. changed-file boundary result;
14. confirmation completed OKX records are unchanged;
15. confirmation `master` remains `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
16. confirmation all production/activation authorizations remain false;
17. confirmation Binance pilot was not created;
18. confirmation PR #44 remains draft and unmerged;
19. remaining limitations;
20. recommended independent validation task.

Stop after the final report.
