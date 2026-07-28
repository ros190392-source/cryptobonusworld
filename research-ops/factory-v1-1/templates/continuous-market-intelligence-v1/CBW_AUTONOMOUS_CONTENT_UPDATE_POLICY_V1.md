# CBW Autonomous Content Update Policy V1

> Architecture standard for the Green / Amber / Red update lanes. Non-production.
> Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)
> and [publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

Agents **propose and validate** content changes; they **MUST NOT** directly mutate production
authority. Every proposed change is routed to exactly one lane.

## 1. Lanes

| Lane | Meaning | Auto-publish |
| --- | --- | --- |
| `GREEN` | Low-risk, well-evidenced, non-critical | **MAY** auto-publish after QA |
| `AMBER` | Moderate risk or single-source | Held for QA + two-source/primary gate; **MUST NOT** auto-publish critical |
| `RED` | High-risk / critical | **Owner approval required**; **MUST NOT** auto-publish |

## 2. Entry criteria and examples

- **GREEN** — formatting fixes; a non-critical fee snapshot refresh with a fresh `TIER_0_OFFICIAL`
  source; adding a new supporting source to an already-`HIGH` claim. Example: updating a spot-fee
  snapshot date after re-capturing the official fee page.
- **AMBER** — a semantic change to a non-critical claim; any single-source update; a claim moving from
  `MEDIUM` to `HIGH`. Example: a product becoming `AVAILABLE_WITH_LIMITS` per one reputable source.
- **RED** — regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership, affiliate
  URL/code, CTA enable, production binding, deploy. Example: a regulator marking the exchange
  restricted in Kazakhstan.

## 3. Two-source / primary-source requirements

`AMBER` changes to a claim **MUST** have either two independent sources or one `TIER_0_OFFICIAL` /
`TIER_1_REGULATOR` primary source. `RED` changes always require a primary source **and** an owner
decision.

## 4. Conflict and freshness gates

A change **MUST NOT** publish while an `OPEN` conflict exists on the claim, or while the governing
claim is `STALE`/`EXPIRED`. Such changes hold in `AMBER` (non-critical) or `RED` (critical).

## 5. Generated patch and preview

Every change produces a `ContentPatchProposal` and a non-production `PreviewArtifact`. Owners and QA
review previews, never live pages, before publication.

## 6. Semantic vs formatting changes

`FORMATTING` changes (whitespace, ordering, presentation) **MAY** be `GREEN`. `SEMANTIC` changes
(altered facts, numbers, statuses) to a critical binding **MUST** be `RED`.

## 7. Owner approvals and publication authority separation

Proposal, QA and publication are separated duties. The Publication Controller publishes only after the
required gate (QA for `GREEN`; QA + owner for `RED`). No agent both proposes and publishes an
owner-gated surface.

## 8. Live verification and rollback

After publication the Live Verification agent confirms the live surface matches the approved patch.
On `MISMATCH` it triggers a `RollbackAction` to the previous publication version.

## 9. Emergency safe states

The platform **MUST** support immediate fail-safe states without an owner: a binding may move to
`UNDER_REVIEW`, and an affiliate CTA may be suppressed (`SUPPRESSED_BROKEN` / `SUPPRESSED_GEO`).
Fail-safe suppression is always allowed; re-enabling is owner-gated.

## 10. Prohibited fully automatic changes

The following **MUST NEVER** be published fully automatically: regulatory verdicts, sanctions,
security incidents, ratings, Top-10 membership, affiliate URL/code, CTA enable, production binding and
deploy. These are always `RED` and owner-gated, consistent with the all-false authorization floor in
the Factory V1.1 governance.
