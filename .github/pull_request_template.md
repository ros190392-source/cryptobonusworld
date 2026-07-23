<!-- CBW governed pull-request template. Fill every section. Never paste secrets. -->

## Task
- **Task ID:**
- **Linked issue:** #
- **Base branch:** <!-- master | main -->
- **Base SHA:**
- **Head branch:**
- **Executor:** CLAUDE_CODE

## Scope
- **Exact changed-file scope:** <!-- list every changed path -->

Task contract path: `REPLACE-ME.json`
<!--
  Canonical task-contract marker (read by the master-side advisory gate).
  - Replace REPLACE-ME.json with the committed repository-relative task-contract
    path, e.g. `owner-ops/ai-ops/tasks/CBW-EXAMPLE-001.json`.
  - Governed PRs MUST provide a valid contract path; the REPLACE-ME.json
    placeholder deliberately fails the advisory gate until it is replaced.
  - Legacy pre-foundation PRs may instead use exactly this line (no backticks):
    Task contract path: legacy PR (no contract)
  - Keep the marker on its own line; do not add bold markdown inside it.
-->


## Validation results
- **ai-ops:validate:**
- **build:**
- **security result (deploy code / secrets):**
- **affiliate impact:** <!-- none / describe -->
- **factual / evidence impact:** <!-- none / describe -->
- **production impact:** <!-- none / describe -->

## Repair
- **Repair attempts used (max 2):**
- **Failure categories addressed:**

## Authorization flags
- [ ] implementation authorized
- [ ] merge authorized (separate owner decision)
- [ ] deploy authorized (owner-approved master SHA)
- [ ] production binding authorized
- [ ] publication authorized
- [ ] affiliate activation authorized

## Explicit confirmations
- [ ] **No merge performed** by this PR's author.
- [ ] **No deployment performed.**
- [ ] **No secret included** (no password, private key, recovery code, API secret or session cookie).
- [ ] `main` and `master` were not merged into each other.

## Owner decision
<!-- Reserved for the owner: APPROVE / REQUEST CHANGES / BLOCK, and merge/deploy authorization. -->
