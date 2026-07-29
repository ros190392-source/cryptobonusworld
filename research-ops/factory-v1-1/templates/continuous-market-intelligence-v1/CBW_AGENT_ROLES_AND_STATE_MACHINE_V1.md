# CBW Agent Roles and State Machine V1

> Architecture standard for specialized agents and the two-layer state model. Non-production.
> **Owner Audit Correction 026:** pipeline stage, task outcome, claim-verification state, freshness
> state and publication state are modelled **separately**. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> States/keys align with [the change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json).

All agents **propose and validate**; none mutates production authority. Every action is idempotent
under its key and re-entrant under its lock.

## 1. Five separate state vocabularies

- **pipelineStage** (non-terminal position): `DISCOVER`, `CAPTURE`, `EXTRACT`, `VERIFY`, `RESOLVE`,
  `UPDATE_CLAIM`, `ANALYZE_IMPACT`, `PATCH`, `QA`, `POLICY_GATE`, `PUBLISH`, `LIVE_VERIFY`, `ROLLBACK`.
- **taskOutcome** (terminal): `PUBLISHED`, `NO_MATERIAL_CHANGE`, `OWNER_REVIEW_REQUIRED`, `BLOCKED`,
  `SOURCE_UNAVAILABLE`, `CONFLICT_UNRESOLVED`, `ROLLED_BACK`.
- **claimVerificationState**: `SUPPORTED`, `CONFLICTED`, `UNDER_REVIEW`, `UNSUPPORTED`.
- **freshnessState**: `FRESH`, `DUE_SOON`, `STALE`, `EXPIRED`.
- **publicationState**: `UNBOUND`, `BOUND`, `PREVIEW`, `QA`, `OWNER_REVIEW`, `PUBLISHED`, `SUPPRESSED`, `ROLLED_BACK`.

A pipeline stage is **never** a terminal outcome.

## 2. Agents

Each agent: **purpose · trusted inputs · outputs · forbidden actions · retry · idempotency key · escalation**. Each owns one or more pipeline stages.

1. **Source Watcher** (`DISCOVER`) — detect changes · registry+schedule · `SnapshotChange` · MUST NOT fetch blocked/robots-disallowed · exp backoff max 5 · `sourceId+contentHash` · alert on repeated block; `SOURCE_UNAVAILABLE` when exhausted.
2. **Evidence Capture** (`CAPTURE`) — store immutable snapshots · fetch result · `EvidenceSnapshot` · MUST NOT alter bytes or store secrets/cookies · max 5 · `sourceId+capturedAt+contentHash` · dead-letter on repeated error.
3. **Extraction Agent** (`EXTRACT`) — normalize to fields · snapshot+parser profile · extracted set · MUST NOT invent unsupported facts · max 3 · `snapshotId+parserProfileId` · escalate on parser failure.
4. **Claim Validator** (`VERIFY`) — set `claimVerificationState`/confidence · fields+evidence · `Claim`/`ClaimVersion` · MUST NOT set `SUPPORTED` without non-contradicted evidence · max 3 · `claimId+snapshotId` · escalate contradictions to Conflict Resolver.
5. **Conflict Resolver** (`RESOLVE`) — apply claim-type authority · conflicting edges · `Conflict` resolution · MUST NOT drop higher-authority evidence for the claim type · max 3 · `conflictId` · unresolved critical → `CONFLICT_UNRESOLVED` (owner).
6. **Freshness Engine** (part of `UPDATE_CLAIM`) — apply freshness SLAs · claims+policy · `freshnessState`, recheck schedule · MUST NOT keep `FRESH` when source unavailable · scheduled · `claimId+policyCycle` · alert on critical `EXPIRED`.
7. **Impact Analyzer** (`ANALYZE_IMPACT`) — fan out to bindings · `ChangeEvent`+graph · affected records · MUST NOT skip a dependent binding · max 3 · `changeEventId` · escalate on missing dependency.
8. **Content Patch Generator** (`PATCH`) — propose patches+lane · impacted bindings · `ContentPatchProposal` · MUST NOT publish · max 3 · `changeEventId+bindingId` · route RED to owner.
9. **QA Agent** (`QA`) — validate previews · preview+checks · `QAVerdict` · MUST NOT approve owner-gated surfaces alone · max 3 · `contentPatchProposalId` · `NEEDS_OWNER` → owner.
10. **Publication Controller** (`POLICY_GATE`,`PUBLISH`) — publish approved · approvals · `PublicationAction`/`PublicationVersion` · MUST NOT publish without the gate · max 3 · `patchProposalId+approvalId` · escalate on gate mismatch.
11. **Live Verification / Rollback Agent** (`LIVE_VERIFY`,`ROLLBACK`) — verify live and revert · publication version · `LiveVerification`/`RollbackAction` · MUST NOT leave a `MISMATCH` live · max 3 · `publicationVersionId` · mismatch → `ROLLED_BACK`.

## 3. Required outcome examples

- no hash/material change → `NO_MATERIAL_CHANGE`;
- critical ambiguity needing owner → `OWNER_REVIEW_REQUIRED`;
- source unavailable after bounded retries → `SOURCE_UNAVAILABLE`;
- unresolved evidence conflict → `CONFLICT_UNRESOLVED`;
- validation/policy failure → `BLOCKED`;
- successful live-verified publication → `PUBLISHED`;
- mismatch then rollback → `ROLLED_BACK`.

## 4. Concurrency locks

Distinct advisory locks: **source** (per `sourceId`), **claim** (per `claimId`), **market-profile**
(per `marketProfileId`), **publication-target** (per binding/route). A held lock defers rather than
duplicates; duplicated messages are dropped by idempotency key.

## 5. Idempotency, deduplication, dead-letter

Every message carries an idempotency key; repeats are no-ops; change events dedupe on
`snapshotChangeId`. Retries are bounded; exhausted messages go to the dead-letter queue and raise a
`MonitorAlert`.
