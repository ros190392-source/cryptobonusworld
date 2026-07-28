# CBW Continuous Exchange Market Intelligence System V1

> **Status:** architecture draft for owner approval. Non-production. This package defines
> standards and data models only. It creates no runtime service, database, redirect, crawler,
> page or CTA, and grants no merge, publication, deploy or `master` authority.

Master architecture document and cross-link hub for the CryptoBonusWorld continuous
market-intelligence platform. Normative terms **MUST**, **MUST NOT**, **SHOULD**, **MAY** are used
per RFC-2119 sense.

## 1. Purpose, scope and non-goals

**Purpose.** Turn CryptoBonusWorld into an evidence-backed, continuously monitored market-intelligence
platform where every published fact about an exchange in a country is traceable to timestamped,
hashed evidence and is kept fresh by dependency-based monitoring.

**Scope.** Global exchange facts; `Exchange × Country` market profiles; canonical claims and evidence;
source monitoring; affiliate-offer verification; autonomous-but-gated content updates; SEO
information architecture; and a bounded Binance × Kazakhstan vertical slice.

**Non-goals.** This document does not implement runtime code, does not execute Deep Research, does
not publish pages, and does not change rankings, CTAs, affiliate routes, sitemap, indexability or
`MIGRATION_5`. Those are downstream, owner-gated phases in
[the implementation roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md).

## 2. Primary entities

- `Exchange × Country` is the **primary market entity**.
- `Exchange × Country × Affiliate Campaign` is the **monitored affiliate-offer entity**.
- Global exchange facts are stored **once** on the exchange core and are never duplicated into market
  profiles; market-specific facts are never promoted into global records. See
  [the market passport standard](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md) and
  [the data schema](../../schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json).

## 3. Component architecture

```text
                +------------------------+
   sources ---> |  Source Watcher /      |  anonymous, robots-respecting fetch
   (Tier 0-4)   |  Evidence Capture      |----> Evidence Object Store (R2/S3-style)
                +-----------+------------+        immutable, content-addressed snapshots
                            |                     (bytes never in DB or Git)
                            v
                +------------------------+
                |  Extraction / Claim    |----> Canonical Operational Store (PostgreSQL-style)
                |  Validator / Conflict  |        ExchangeCore, MarketProfile, Claim,
                |  Resolver / Freshness  |        ClaimVersion (append-only, superseded not deleted)
                +-----------+------------+
                            |  dependency fan-out
                            v
                +------------------------+
                |  Impact Analyzer /     |----> Publication Bindings (claim -> surface)
                |  Content Patch Gen /   |        Green / Amber / Red lanes
                |  QA / Publication Ctrl |----> Git Governance Records (review/decision/receipts)
                +-----------+------------+
                            |
                            v
                +------------------------+
                |  Owner gates -> publish |----> Preview -> QA -> Live verify -> Rollback
                |  Live Verify / Rollback |
                +------------------------+

   Search / vector index  ..... retrieval aid only, NEVER a source of truth
```

## 4. Data ownership by component

| Component | Authoritative for | Never stores |
| --- | --- | --- |
| Canonical Operational Store (PostgreSQL-style) | Entities, claims, versions, freshness, schedules | Evidence bytes; rendered prose |
| Evidence Object Store (R2/S3-style) | Immutable snapshot bytes, screenshots, redirect chains | Canonical truth; authority decisions |
| Git Governance Records | Owner receipts, review/decision records, architecture | Live data; secrets |
| Search / Vector Index | Retrieval acceleration | Anything authoritative — it is rebuildable and non-authoritative |

## 5. Event-driven and scheduled flows

- **Scheduled:** each source has a [schedule policy](../../schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json)
  with a base interval and a shorter critical interval; freshness rechecks are scheduled per
  [freshness policy](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json).
- **Event-driven:** a material `SnapshotChange` emits a `ChangeEvent` that fans out through the
  [change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)
  to affected claims, market profiles and publication bindings.

## 6. Trust and authority boundaries

- Agents **propose and validate**; they **MUST NOT** directly mutate production authority. See
  [agent roles](./CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md).
- High-risk changes — regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership,
  affiliate URL/code, CTA, production binding and deploy — are **owner-gated** and **MUST NOT**
  auto-publish. See [the autonomous update policy](./CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md).
- Public affiliate verification defaults to anonymous **L0–L3**; **L4** requires a separate owner
  authorization. See [the affiliate verification standard](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md).

## 7. Source-to-publication end-to-end flow

1. Source Watcher detects a change ([source monitoring standard](./CBW_SOURCE_MONITORING_STANDARD_V1.md)).
2. Evidence Capture stores an immutable snapshot with a content hash.
3. Extraction and Claim Validator update `Claim`/`ClaimVersion` with confidence, limitations and effective dates.
4. Conflict Resolver and Freshness Engine reconcile disagreements and freshness.
5. Impact Analyzer fans out to publication bindings.
6. Content Patch Generator proposes a patch on a Green/Amber/Red lane.
7. QA and (for Amber/Red) owner gates decide.
8. Publication Controller publishes; Live Verification confirms; Rollback reverts on mismatch.

## 8. Queues, locks, idempotency, deduplication, retries, dead-letter

- Every pipeline message carries an **idempotency key** (see the change/impact and source models).
- **Concurrency locks** exist per source, per claim, per market profile and per publication target
  (detailed in [agent roles](./CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md)).
- Retries use bounded exponential backoff and respect `Retry-After`; exhausted messages go to a
  **dead-letter** queue and raise a `MonitorAlert`. Duplicate change events with the same idempotency
  key are deduplicated.

## 9. Auditability, versioning, rollback, disaster recovery

- Claims and publications are **append-only and versioned**; superseded records are retained, never
  destructively overwritten.
- The operational store is reconstructable from evidence snapshots plus Git governance records; the
  search index is fully rebuildable and therefore non-authoritative.
- Every publication has a live-verification record and a defined rollback target.

## 10. Security, secrets, privacy

- No secrets, credentials, real affiliate URLs/codes or bonus amounts appear in any governed record
  or in this package.
- Fetching is honest and identifiable; it **MUST NOT** use fake identity, proxy, location spoofing,
  account automation, KYC submission or financial transactions.

## 11. Scaling model (exchanges × countries)

Scale is achieved by **dependency-based monitoring** — one changed source fans out only to its
dependents — rather than full daily re-research of every market profile. A second country is added by
creating market profiles and source-dependency edges, not by copying global facts.

## 12. Observability, SLO categories, alert severities

- SLO categories: **freshness SLA** (critical claims rechecked within policy), **evidence integrity**
  (every published claim has a non-contradicted snapshot), **publication safety** (no auto-publish of
  owner-gated surfaces).
- Alert severities: `INFO`, `WARNING`, `HIGH`, `CRITICAL` (see the source/monitoring model).

## 13. Package index (every artifact reachable from here)

Standards:
[Market Passport](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md) ·
[Affiliate Verification](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md) ·
[Source Monitoring](./CBW_SOURCE_MONITORING_STANDARD_V1.md) ·
[Autonomous Update Policy](./CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md) ·
[Agent Roles & State Machine](./CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md) ·
[SEO & Quick Answer](./CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md) ·
[Implementation Roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md) ·
[Deep Research Companion](./CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md)

Models:
[Data Schema](../../schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json) ·
[Claim/Evidence/Freshness](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json) ·
[Publication Binding](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json) ·
[Affiliate Campaign/Offer](../../schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json) ·
[Source Registry/Monitoring](../../schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json) ·
[Change Event/Impact](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)

Factory context: [Factory V1.1 README](../../README.md).

## 14. Canonical shared enums

All standards and models in this package **MUST** use these exact enum vocabularies:

- **claim confidence:** `HIGH`, `MEDIUM`, `LOW`, `UNVERIFIED`
- **freshness state:** `FRESH`, `AGING`, `STALE`, `EXPIRED`
- **source tier:** `TIER_0_OFFICIAL`, `TIER_1_REGULATOR`, `TIER_2_REPUTABLE`, `TIER_3_COMMUNITY`, `TIER_4_UNVERIFIED`
- **affiliate verification level:** `L0_UNVERIFIED`, `L1_LINK_RESOLVED`, `L2_OFFER_CAPTURED`, `L3_TERMS_CONFIRMED`, `L4_ACCOUNT_CONFIRMED`
- **affiliate offer status:** `ACTIVE`, `CHANGED`, `EXPIRED`, `GEO_RESTRICTED`, `BROKEN_LINK`, `SUSPENDED`, `UNKNOWN`
- **monitoring health:** `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `BLOCKED`, `RETIRED`
- **change materiality:** `NONE`, `MINOR`, `MODERATE`, `MAJOR`, `CRITICAL`
- **policy lane:** `GREEN`, `AMBER`, `RED`
- **agent workflow state:** `DETECTED`, `EVIDENCE_CAPTURED`, `EXTRACTED`, `VALIDATED`, `CONFLICTED`, `IMPACT_ASSESSED`, `PATCH_PROPOSED`, `QA_PASSED`, `AWAITING_OWNER`, `PUBLISH_APPROVED`, `PUBLISHED`, `LIVE_VERIFIED`, `ROLLED_BACK`, `REJECTED`, `SUPPRESSED`
- **publication state:** `UNBOUND`, `BOUND`, `PREVIEW`, `QA`, `OWNER_REVIEW`, `PUBLISHED`, `SUPPRESSED`, `ROLLED_BACK`

## 15. Relationship to Factory V1.1

The immutable Factory V1.1 eleven-file Deep Research package remains the current governed research
envelope. Richer market-passport requirements are mapped into those eleven files by
[the Deep Research companion](./CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md) without adding
package files or mutating the repository during Deep Research.
