# CMI Architecture V1 — Controlled Stack Merge 027 Result

**Task:** `CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027`
**Governing Issue:** #82 · **Role:** closeout / one-time control-plane publication
**Decision:** **`CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_PUBLISHED_TO_MAIN`**

> **Stage 2 is pending** the real green audit workflow on this exact result commit and one final
> ordinary fast-forward. Post-Stage-2 evidence is supplied by the external final report. These result
> records are **not** amended after Stage 2.

## Owner authority & one-time scope

Owner issued exactly `AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027`.
This authorizes one two-stage ordinary non-force fast-forward publication of the accepted
Architecture 025 + Correction 026 stack to control-plane `main`. Only `factoryMergeToMainAuthorized`
was temporarily true; it is consumed after successful Stage 2. It authorizes no `master`, production,
deploy, import, Binance research, capture, ranking, CTA, promo, affiliate routing, publication
binding, sitemap, indexability or `MIGRATION_5`.

## Frozen setup

| Field | Value |
| --- | --- |
| Audit branch | `closeout/researchops-factory-v1-1-cmi-architecture-controlled-stack-merge-027` |
| Started at approved cumulative head | `272ffa266647a899684954ed04a1eb09803d3b2b` |
| Frozen setup HEAD | `5a3c98d1d6f72cfbfe7e1186d991d04f9465ed33` |

Setup added exactly the three governance records (CONTRACT, STATE, PROMPT), additions-only.
STATE identity: role `closeout`; base branch `correction/...owner-audit-026`; approved base
`272ffa2`; no allowed implementation files; exactly one true authorization
`factoryMergeToMainAuthorized`; all other 17 false.

## Source evidence (preflight, before Stage 1)

- `origin/main` = `babe80fe2bdcb7891dddf63aa8064532626a8fba`; `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b`.
- **PR #79** (Issue #78): OPEN/draft/unmerged, base `main`, head `6d5a06b3ec3992b2760a2ca352d62f66d49ca82e`; final workflow `30365356842` = success.
- **PR #81** (Issue #80): OPEN/draft/unmerged, base Architecture-025 branch, head `272ffa266647a899684954ed04a1eb09803d3b2b`; final workflow `30370715416` = success.
- **PR #69** (protected Binance pilot): OPEN/draft/unmerged, head `6ce489ff10655f65e62a76d1a5635aa80e73b44a`, exactly 14 files, no auto-merge.

## Ancestry & cumulative inventory

- Ancestry `babe80f -> 6d5a06b -> 272ffa2` verified; merge-base(`babe80f`, `272ffa2`) = `babe80f`; **10 ahead / 0 behind**.
- Cumulative diff `babe80f..272ffa2` = **exactly 25 paths**: 5 Architecture 025 records + 5 Correction 026 records + 9 Markdown standards + 6 JSON models. No other path.

## Validation at cumulative head

- `node --check` clean for every Factory `*.mjs`; fixtures **235 passed / 0 failed**.
- All six JSON models parse; each `schemaVersion` = `"1.0.0"`; shared canonical enum keys identical across models; corrected vocabularies present (`FRESH/DUE_SOON/STALE/EXPIRED`, `SUPPORTED/CONFLICTED/UNDER_REVIEW/UNSUPPORTED`, `HEALTHY/DEGRADED/UNAVAILABLE/BLOCKED/RETIRED`, `L0..L4`).
- No operational field name ends in `Placeholder`; no secrets or live CBW affiliate values; examples use `example.invalid`.
- **54** Markdown relative links resolve; roadmap phases `1,2,2b,3–11` each carry all nine labelled fields; Deep Research companion matches the handoff protocol and Factory package top-level shape.
- `git diff --check`: **all worker-authored architecture content is clean** (9 templates + 6 schemas + 025/026 result records). The only warnings across `babe80f..272ffa2` are 21 intentional Markdown hard-break (two-trailing-space) lines in four **owner-authored** governance records (025 PROMPT/CONTRACT, 026 PROMPT/CONTRACT) — frozen owner-setup boundary files not modifiable in this task that already passed their own green workflows.

## Stage 1 publication (done)

```bash
git push origin 272ffa266647a899684954ed04a1eb09803d3b2b:refs/heads/main
```

Ordinary non-force fast-forward `babe80f..272ffa2 -> main`. Immediately verified:
`origin/main` = `272ffa266647a899684954ed04a1eb09803d3b2b`; `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b`
(unchanged); PR #69 = `6ce489f...` (unchanged). No force/reset/rebase/squash/cherry-pick/PR-merge/admin-bypass/protection change.

## Stage 2 (intended, pending)

After this result commit's real workflow is green (`ENFORCEMENT: DESCENDANT (protected base policy)` ·
`BOUNDARY mode=FACTORY_GOVERNANCE` · `RESULT: BOUNDARY OK` · `Factory-governance PR: no research-task
root to validate.`), and with `origin/main` re-verified `= 272ffa2`, perform exactly one ordinary
non-force fast-forward:

```bash
git push origin <AUDIT_RESULT_SHA>:refs/heads/main
```

Final cumulative diff `babe80f..`final main must equal **30 paths** = 25 source stack + 3 Merge 027
setup records + 2 Merge 027 result records. Exactly two `main` pushes total; no third audit commit and
no third push.

## Accepted implementation notes (non-blocking)

1. Runtime `advertisedCurrency` must support digital-asset codes such as `USDT`, not only ISO-4217 fiat.
2. The immutable Factory research prompt requires `sourceTier`; future research packages retain it for
   prompt compatibility while mapping to canonical `sourceFamily`. `sourceTier` never becomes a
   universal authority rule.

## Unchanged / prohibitions / blockers

`master` `998fced` and Binance pilot PR #69 `6ce489f` (14 files) unchanged. No Factory
code/workflow/README, Architecture 025, Correction 026, PR #69, `master`, production, ranking, CTA,
promo, affiliate route, publication binding, sitemap, indexability or `MIGRATION_5` change; no Deep
Research, capture, affiliate browsing, deploy, import, branch deletion or V5 creation. **No blockers.**
On successful Stage 2, `factoryMergeToMainAuthorized` is consumed and **all 18 active authorizations
are false**.
