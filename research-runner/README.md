# CryptoBonusWorld Multi-AI Research Runner v0.1

Status: architecture/bootstrap only. No production publication, ranking mutation, deploy, indexability change or site update is authorized by this runner.

## Purpose

This runner is the GitHub control plane for one GEO research cycle. It keeps three research engines independent until RAW freeze, validates their outputs, and hands the frozen packages to the ChatGPT Control Room / GEO Market Editor for cross-audit and consolidation.

Research engines:

1. `codex` — OpenAI/Codex independent research line.
2. `claude` — Anthropic Claude Code independent research line.
3. `gemini` — Google Gemini via `agy` independent research line.

ChatGPT is the orchestration/control-room layer, not counted as one of the three votes. It may additionally perform its own research, but canonical promotion still requires the same consolidation rules.

## Core invariant: independence before freeze

Each engine receives the same frozen request and prompt but a separate output directory. During RAW capture no engine may read another engine's output directory. A completed engine package is immutable for the rest of that run. Majority vote never determines truth; source quality and direct evidence do.

## GitHub lifecycle

1. ChatGPT creates a GitHub issue titled `[CBW-RESEARCH] <RUN_ID>` with label `cbw-research-run` and a strict JSON request body.
2. `.github/workflows/cbw-multi-ai-research.yml` runs on a self-hosted Windows runner labelled `cbw-research`.
3. The workflow checks out the repository, validates the request and calls `scripts/Invoke-CbwResearchRun.ps1`.
4. The runner invokes Codex, Claude Code and Gemini in isolated directories.
5. Each engine must produce the exact output contract.
6. The runner validates all three packages and writes a frozen run manifest.
7. The workflow uploads/records RAW artifacts. It does NOT consolidate, rank or publish.
8. ChatGPT Control Room reads the frozen outputs, performs independent cross-audit and decides whether to open targeted dispute runs or a separate consolidation run.
9. Only the accepted consolidated knowledge package is promoted to the CryptoBonusWorld Library.

## Standard RAW layout

```text
research-runs/<RUN_ID>/
  REQUEST.json
  FROZEN_PROMPT.md
  CODEX_RAW/
    run.json
    candidates.json
    sources.jsonl
    claims.jsonl
    contradictions.json
    gaps.json
    report.md
    manifest.json
  CLAUDE_RAW/
    ...same contract...
  GEMINI_RAW/
    ...same contract...
  FREEZE_MANIFEST.json
```

For later phases the domain payload may differ, but every engine always emits provenance, sources, claims, contradictions, gaps and a manifest.

## Canonical knowledge rule

`*_RAW` is evidence intake, never site truth. The website may consume only an accepted GEO knowledge package after cross-audit/consolidation and publication gates.

## Secrets and authentication

Never commit provider credentials. On a self-hosted Windows runner, Codex/Claude/agy should use their existing local authenticated profiles or environment secrets configured outside the repository. GitHub issue bodies must contain no secrets.

## Safety floor

The runner cannot by itself:

- modify public ranking or scores;
- modify exchange availability truth;
- publish/deploy the site;
- alter DNS/domain/robots/indexability;
- enable affiliate CTAs;
- promote RAW output to canonical Library knowledge.

Those are later explicit control-room actions.
