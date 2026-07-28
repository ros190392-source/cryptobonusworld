# CBW Agent Roles and State Machine V1

> Architecture standard for specialized agents and the deterministic pipeline state machine.
> Non-production. Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> States/keys align with [the change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json).

All agents **propose and validate**; none directly mutates production authority. Every agent action is
idempotent under its idempotency key and re-entrant under its concurrency lock.

## 1. Agents

Each agent below lists **purpose · trusted inputs · outputs · forbidden actions · retry policy ·
idempotency key · escalation**.

1. **Source Watcher** — detect changes · registry + schedule · `SnapshotChange` · MUST NOT fetch
   blocked/robots-disallowed sources · exp. backoff, max 5 · `sourceId+contentHash` · alert on repeated block.
2. **Evidence Capture** — store immutable snapshots · fetch result · `EvidenceSnapshot` (hash, object key)
   · MUST NOT alter captured bytes · exp. backoff, max 5 · `sourceId+capturedAt+contentHash` · dead-letter on repeated error.
3. **Extraction Agent** — normalize content to fields · snapshot + parser profile · extracted field set
   · MUST NOT invent unsupported facts · max 3 · `snapshotId+parserProfileId` · escalate on parser failure.
4. **Claim Validator** — update claims/versions · extracted fields + evidence edges · `Claim`/`ClaimVersion`,
   confidence · MUST NOT set confidence above `LOW` without non-contradicted evidence · max 3 ·
   `claimId+snapshotId` · escalate to Conflict Resolver on contradiction.
5. **Conflict Resolver** — reconcile disagreements · conflicting edges + tiers · `Conflict` resolution ·
   MUST NOT resolve by discarding higher-tier evidence · max 3 · `conflictId` · escalate to owner (RED) when unresolvable on a critical claim.
6. **Freshness Engine** — apply freshness SLAs · claims + freshness policy · updated `freshnessState`,
   recheck schedule · MUST NOT keep a claim `FRESH` when its source is unavailable · scheduled ·
   `claimId+policyCycle` · alert on critical `EXPIRED`.
7. **Impact Analyzer** — fan out to bindings · `ChangeEvent` + dependency graph · `AffectedClaim/MarketProfile/PublicationBinding`
   · MUST NOT skip a dependent binding · max 3 · `changeEventId` · escalate on missing dependency data.
8. **Content Patch Generator** — propose patches · impacted bindings · `ContentPatchProposal` + lane ·
   MUST NOT publish · max 3 · `changeEventId+bindingId` · route RED to owner.
9. **QA Agent** — validate previews · preview + checks · `QAVerdict` · MUST NOT approve owner-gated
   surfaces alone · max 3 · `contentPatchProposalId` · route `NEEDS_OWNER` to owner.
10. **Publication Controller** — publish approved patches · QA/owner approvals · `PublicationAction`,
    `PublicationVersion` · MUST NOT publish without the required gate · max 3 · `patchProposalId+approvalId` ·
    escalate on gate mismatch.
11. **Live Verification / Rollback Agent** — verify live and revert · publication version · `LiveVerification`,
    `RollbackAction` · MUST NOT leave a `MISMATCH` live · max 3 · `publicationVersionId` · alert + rollback on mismatch.

## 2. Deterministic state machine

```text
DETECTED -> EVIDENCE_CAPTURED -> EXTRACTED -> VALIDATED
VALIDATED -> CONFLICTED -> (resolved) -> IMPACT_ASSESSED
VALIDATED -> IMPACT_ASSESSED -> PATCH_PROPOSED -> QA_PASSED
QA_PASSED --(GREEN)--> PUBLISHED -> LIVE_VERIFIED
QA_PASSED --(RED/AMBER-critical)--> AWAITING_OWNER -> PUBLISH_APPROVED -> PUBLISHED -> LIVE_VERIFIED
PUBLISHED|LIVE_VERIFIED --(MISMATCH)--> ROLLED_BACK
any -> REJECTED | SUPPRESSED
```

**Terminal states:** `LIVE_VERIFIED`, `ROLLED_BACK`, `REJECTED`, `SUPPRESSED`.

## 3. Concurrency locks

The platform holds distinct advisory locks so parallel agents never corrupt shared state:

- **source lock** (per `sourceId`) — one active fetch/capture per source;
- **claim lock** (per `claimId`) — one active validation/version write per claim;
- **market-profile lock** (per `marketProfileId`) — one active profile recompute;
- **publication-target lock** (per binding/route) — one active publish/rollback per target.

A held lock defers rather than duplicates work; duplicated messages are dropped by idempotency key.

## 4. Idempotency and deduplication

Every message carries an idempotency key (section 1). A repeat with the same key is a no-op. Change
events are deduplicated on `snapshotChangeId`. Retries are bounded; exhausted messages go to the
dead-letter queue and raise a `MonitorAlert`.

## 5. Escalation

Any critical, conflicted or owner-gated decision escalates to `AWAITING_OWNER` per
[the autonomous update policy](./CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md); no agent overrides an
owner gate.
