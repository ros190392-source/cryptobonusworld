# CBW AI Ops — Default-Branch Authority (v1)

This document explains why a specific, narrow set of AI Ops control-plane files lives on **`main`**
(the repository default branch) rather than on `master`.

## Why these files are on `main`

- **`main` is the repository default branch.** GitHub activates certain repository features only from
  the default branch.
- **Issue Forms** (`.github/ISSUE_TEMPLATE/*.yml`, `config.yml`) become selectable in the "New issue"
  chooser only when present on the default branch.
- **The pull-request template** (`.github/pull_request_template.md`) is applied to new PRs only from
  the default branch.
- **`workflow_dispatch` control workflows** (`cbw-ai-ops-manual-validate.yml`,
  `cbw-ai-ops-repair-request.yml`) are dispatchable from the Actions UI only when defined on the
  default branch.

## What stays on `master`

`master` remains the production/site/code/architecture/governance authority: application code,
production content, architecture, `owner-ops/**` governance, the AI Ops validators
(`scripts/ai-ops/**`), the master-side advisory PR gate
(`.github/workflows/cbw-pr-advisory-gate.yml`) and `CODEOWNERS`.

## Non-negotiable separation

- `main` and `master` are **never merged wholesale** in either direction and **never rebased** onto
  each other.
- Code/content/architecture/governance PRs target `master`; default-branch Issue Form / PR template /
  control-workflow PRs target `main`.
- Cross-authority changes require **separate task contracts**.
- The existing `main` workflows `critical-alerts.yml` and `telegram-reports.yml` are left
  **byte-identical** by this change.

## Control plane is not an autonomous worker

The `main`-side control plane collects structured input (Issue Forms), standardizes PRs (template),
and offers **manually dispatched, read-only** validation and repair-request preparation. It performs
no autonomous execution: no merge, no deploy, no code changes, no external AI provider calls, and it
requests or stores no secrets.
