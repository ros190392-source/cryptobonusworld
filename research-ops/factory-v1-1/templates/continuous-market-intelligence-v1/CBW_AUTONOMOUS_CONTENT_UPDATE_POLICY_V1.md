# CBW Autonomous Content Update Policy V1

> Architecture standard for Green / Amber / Red update lanes. Non-production. **Owner Audit
> Correction 026:** uses canonical offer/outcome states and the two-layer state model. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)
> and [publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

Agents **propose and validate**; they **MUST NOT** directly mutate production authority. Each proposed
change is routed to exactly one lane and terminates in one **task outcome**.

## 1. Lanes

| Lane | Meaning | Auto-publish |
| --- | --- | --- |
| `GREEN` | Low-risk, well-evidenced, non-critical | **MAY** auto-publish after QA |
| `AMBER` | Moderate risk or single-source | Held for QA + two-source/primary-authority gate; critical never auto |
| `RED` | High-risk / critical | **Owner approval required**; never auto-publish |

## 2. Entry criteria and examples

- **GREEN** — formatting; a non-critical fee snapshot refresh with a fresh official source; adding a
  supporting source to an already-`SUPPORTED`, `HIGH` claim.
- **AMBER** — a semantic change to a non-critical claim; any single-source update; a claim moving
  `MEDIUM`→`HIGH`. Example: a product becoming `AVAILABLE_WITH_LIMITS` per one reputable source.
- **RED** — regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership, affiliate
  URL/code, CTA enable, production binding, deploy. Example: a regulator marking the exchange
  restricted in Kazakhstan.

## 3. Two-source / primary-authority requirements

`AMBER` changes need two independent sources or one **claim-type primary authority** (per the source
monitoring standard). `RED` changes always need a primary authority **and** an owner decision.

## 4. Freshness and verification gates

A change **MUST NOT** publish while the claim is `CONFLICTED`/`UNDER_REVIEW`/`UNSUPPORTED`, or while it
is `STALE`/`EXPIRED`. Such changes hold in `AMBER` (non-critical) or `RED` (critical).

## 5. Generated patch and preview

Every change produces a `ContentPatchProposal` and a non-production preview. Owners and QA review
previews, never live pages.

## 6. Semantic vs formatting

`FORMATTING` changes MAY be `GREEN`. `SEMANTIC` changes to a critical binding **MUST** be `RED`.

## 7. Owner approvals and authority separation

Proposal, QA and publication are separated duties. The Publication Controller publishes only after the
required gate (QA for `GREEN`; QA + owner for `RED`). No agent both proposes and publishes an
owner-gated surface.

## 8. Live verification and rollback

After publication the Live Verification agent confirms the live surface matches the approved patch; on
`MISMATCH` it triggers rollback and the iteration's task outcome is `ROLLED_BACK`.

## 9. Task outcomes

Each iteration ends in exactly one terminal outcome: `PUBLISHED`, `NO_MATERIAL_CHANGE`,
`OWNER_REVIEW_REQUIRED`, `BLOCKED`, `SOURCE_UNAVAILABLE`, `CONFLICT_UNRESOLVED`, `ROLLED_BACK`.

## 10. Emergency safe states

Immediate fail-safe states without an owner: a binding may move to `SUPPRESSED`/under-review, and an
affiliate CTA may be `FAILSAFE_SUPPRESSED` or `GEO_SUPPRESSED`. Fail-safe suppression is always
allowed; re-enabling is owner-gated.

## 11. Prohibited fully automatic changes

Never auto-publish: regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership,
affiliate URL/code, CTA enable, production binding, deploy. These are always `RED` and owner-gated,
consistent with the all-false authorization floor.
