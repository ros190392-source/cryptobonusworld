# ResearchOps Factory V1.1 — Correction 010 Independent Validation (Task 011)

- **Validation task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011`
- **Governing issue:** #50 · **Correction PR:** #49 · **Validation PR:** #51
- **Validated correction commit:** `2b9fecd8540070c92f1d1ba382ba05b64597a7e6`
- **Correction initial head:** `289d6471…` · **Original validation:** `2f95f8a…` · **Implementation:** `02997bb…`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Validated at:** 2026-07-26 · Node v24 (Node 20-compatible), dependency-free

## Executive verdict

**`VALIDATED_WITH_CORRECTIONS_REQUIRED`.**

The nine Validation-009 corrections (C1–C9) are genuinely implemented and independently
reproducible: the force-package flag, shared state/evidence derivation, fail-closed workflow
discovery, task-root deletion rejection, wired append-only boundary CLI, `--tasks-dir` removal,
strict eleven-file inventory, reference-field typing, and minimum TASK_STATE/IDENTITY/GITHUB_PLAN
schema all pass positive and negative probes. The authorization/security floor is intact — no
probe could authorize master, canonical import, production, deploy, Binance, or any merge beyond a
single exact owner receipt.

However, the mandatory new adversarial probes A–L surfaced **ten reproducible control gaps** that
the green 63/0 fixture run and the successful advisory workflow did not catch. Per Issue #50, a
reproducible path escape (A), rename/boundary bypass (B), stage-mutation bypass (E), arbitrary
workflow authorization (D), malformed-JSON acceptance (H), and invalid-UTF-8 acceptance (J) each
independently disqualify a clean owner-merge verdict. The correction is therefore **not** ready for
owner-merge review and requires a second correction pass.

## Exact rerun results

- `node --check` on every factory `.mjs`: **CLEAN**.
- Independent fixtures `node fixtures/run.mjs`: **63 passed / 0 failed** (baseline claim confirmed).
- `git diff --check`: **clean**.
- Direct CLI smoke: create exit 0 · validate human/JSON exit 0 · status human/JSON exit 0 ·
  `--require-package` empty → exit 1 · `--tasks-dir` → `unknown flag` (exit 2) ·
  check-boundary factory→0, deletion→1, empty→1 · owner receipt valid→ok, deploy-escalation→rejected.
- Baseline: correction diff is exactly the reported **14 files**; `validation-009/**`,
  `governance/**`, `research-ops-pilot/**`, correction CONTRACT/STATE/PROMPT and real
  `research-ops/tasks/**` are **unchanged** across the range; `origin/main`/`origin/master` match
  the fixed SHAs; PR #49 remains **draft/unmerged**, based on `2f95f8a…`.

## C1–C9 correction matrix

| # | Correction | Verdict | Basis |
|---|---|---|---|
| C1 | force-package flag | **PASS** | `--require-package` on empty skeleton fails closed |
| C2 | state/evidence consistency | **PASS** | 8 higher states w/ empty package fail validate + status |
| C3 | workflow discovery fail-closed | **PASS** | verified base/head, no `\|\| true`, empty diff refused |
| C4 | task-root deletion rejected | **PASS** | `D` under a task root → exit 1 |
| C5 | CI append-only boundary wired | **PASS (note)** | boundary invoked; but shallow — see B/D/E |
| C6 | `--tasks-dir` confinement | **PASS (note)** | flag removed; but cwd-relative — see A |
| C7 | nested package entries | **PASS** | nested/hidden/extra each fail |
| C8 | reference field typing | **PASS** | null/string/object/number/dup/unresolved rejected |
| C9 | structural/schema | **PASS** | TASK_STATE/IDENTITY/GITHUB_PLAN enforced (scope: not the 4 research JSONs — see H) |

## A–L adversarial probe matrix

| Probe | Area | Verdict | Finding |
|---|---|---|---|
| A | repo-root confinement | **CORRECTION_REQUIRED** | create writes `<cwd>/research-ops/tasks/`; escapes to a temp dir and to a subdir; no worktree-root resolution, no fail-closed |
| B | rename/copy boundary | **CORRECTION_REQUIRED** | only destination parsed; forbidden-source rename hidden; unknown status codes accepted |
| C | PR-mode identity | **CORRECTION_REQUIRED** | mode derived from paths only; factory-only change passes as FACTORY_GOVERNANCE regardless of branch/PR |
| D | workflow allowlist | **CORRECTION_REQUIRED** | entire `.github/workflows/` allowlisted; `deploy-production.yml` change accepted |
| E | stage-aware append-only | **CORRECTION_REQUIRED** | closed-stage modifications (00-contract, re-manifested 20-, 50-) accepted; one-root ≠ append-only |
| F | GITHUB_PLAN binding | **CORRECTION_REQUIRED** | `taskBranch`/`pullRequest.head` not cross-bound to `TASK_STATE.branch` |
| G | identity grammar | **CORRECTION_REQUIRED** | malformed-but-equal `country='zz9!'`, `exchange='../evil'` pass validate |
| H | all 9 research JSON shapes | **CORRECTION_REQUIRED** | `research-run`, `offer-eligibility-review`, `schema-normalization-notes`, `import-readiness` accept `[]` |
| I | owner receipt structure | **PASS** | only exact research-record merge passes; all escalations rejected |
| J | invalid UTF-8 | **CORRECTION_REQUIRED** | invalid bytes in md/JSON pass; only BOM/CR checked |
| K | higher-stage markers | **CORRECTION_REQUIRED** | zero-byte and malformed-JSON markers satisfy VALIDATED; existence-only |
| L | actual workflow/boundary | **PASS** | run 30206225962 succeeded read-only; boundary matrix behaves as designed for covered cases |

## Material weaknesses

1. **Path confinement is cwd-relative, not worktree-bound (A, HIGH).** `createTask` uses
   `process.cwd()`; the CLI reproducibly created skeletons under an external temp dir and under a
   repo subdirectory. C6 closed the `--tasks-dir` flag but not the confinement objective.
2. **Append-only is single-root, not stage-aware (E, HIGH).** Modifying closed earlier stages
   within one task root is accepted. Combined with rename handling (B), immutable governed content
   can be mutated or relocated without the boundary objecting.
3. **Rename/copy source paths are never evaluated (B, HIGH).** Destination-only parsing lets a
   rename hide deletion/movement of a forbidden or immutable source; unknown status codes pass.
4. **Factory mode over-authorizes workflows (D, HIGH).** Any `.github/workflows/**` file — including
   deploy/production workflows — is accepted under factory governance.
5. **Structural/encoding validation is incomplete (H, J, K, MEDIUM).** Four research JSONs accept
   arbitrary shapes; invalid UTF-8 is accepted; higher-stage gates accept empty/malformed markers.
6. **Mode and plan binding lack trusted anchors (C, F, G, MEDIUM/LOW).** Mode is path-only; plan
   branch fields and identity grammar are not cross-checked.

The authorization floor itself was not breached by any probe — these are boundary and
validation-completeness gaps, not privilege escalations.

## Workflow judgment

The factory validation workflow is correctly **read-only** (`contents: read`,
`persist-credentials: false`), fail-closed at discovery, and performs no merge, deploy, or AI call;
its advisory run on `2b9fecd` succeeded. The two failing runs on the head
(`telegram-reports.yml`, `critical-alerts.yml`) are unrelated pre-existing push workflows outside
the factory scope. **A green workflow is not sufficient evidence:** the workflow delegates
append-only enforcement to a boundary whose semantics are incomplete (B/C/D/E), so CI success does
not establish the append-only guarantee it appears to assert.

## Merge-readiness judgment

**Not ready for owner-merge review.** Six of the disqualifying conditions named in Issue #50
(A, B, D, E, H, J) are independently reproducible. The correct next step is a second correction
pass, then re-validation.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-012`.

## Remaining limitations of this validation

- GitHub Actions cannot be executed locally; the workflow was assessed by reading the committed YAML
  and inspecting the actual PR #49 run plus independent boundary simulation.
- Executable UTF-8 and marker probes were run through the library validators; production CI would
  observe the same functions, so results transfer.
- Symlink-based attacks on markers/packages are separately blocked by `findUnsafeEntries`; Windows
  checkouts under-report the executable bit, so the exec-bit rejection is best-effort on this host
  (behaviour is exercised on Linux CI).

## Authorization confirmation

This validation authorizes **no** merge, import, activation, production change, deploy or Binance
pilot. Every authorization in `FACTORY_CORRECTION_VALIDATION.json` is **false**, including
`researchRecordMergeToMainAuthorized`. `main`, `master`, completed OKX records, governance,
validation-009 and production were **not** modified. PRs #44, #46, #49 and #51 remain
draft/unmerged; none was marked ready.
