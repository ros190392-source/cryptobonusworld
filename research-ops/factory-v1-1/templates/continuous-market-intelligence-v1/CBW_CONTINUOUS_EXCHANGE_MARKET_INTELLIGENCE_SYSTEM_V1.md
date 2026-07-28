# CBW Continuous Exchange Market Intelligence System V1

> **Status:** architecture draft for owner approval. Non-production. Defines standards and data models
> only — no runtime service, database, redirect, crawler, page or CTA — and grants no merge,
> publication, deploy or `master` authority. **Owner Audit Correction 026** applied: corrected
> canonical vocabularies, two-layer state model, claim-type source authority, operational affiliate
> fields, complete monitoring SLA matrix, and inline handoff-envelope Deep Research flow.

Master architecture document and cross-link hub. Normative terms **MUST**, **MUST NOT**, **SHOULD**,
**MAY** apply.

## 1. Purpose, scope and non-goals

**Purpose.** Make CryptoBonusWorld an evidence-backed, continuously monitored market-intelligence
platform where every published fact about an exchange in a country is traceable to timestamped,
hashed evidence and kept fresh by dependency-based monitoring.

**Scope.** Global exchange facts; `Exchange × Country` market profiles; canonical claims and evidence;
source monitoring; real public affiliate-offer observation; autonomous-but-gated content updates; SEO
information architecture; and a bounded Binance × Kazakhstan vertical slice.

**Non-goals.** No runtime code, no Deep Research execution, no publication, no ranking/CTA/affiliate
route/sitemap/indexability/`MIGRATION_5` change. Those are downstream owner-gated phases in
[the implementation roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md).

## 2. Primary entities

- `Exchange × Country` is the **primary market entity**.
- `Exchange × Country × Affiliate Campaign` is the **monitored affiliate-offer entity**.
- Global exchange facts are stored **once** on the exchange core and never duplicated into market
  profiles; market facts are never promoted to global. See
  [the market passport standard](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md) and
  [the data schema](../../schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json).

## 3. Component architecture

```text
   sources (families) -> Source Watcher / Evidence Capture -> Evidence Object Store (R2/S3-style)
                                                              immutable content-addressed snapshots
                              |                               (bytes never in DB or Git)
                              v
   Extraction / Claim Validator / Conflict Resolver / Freshness Engine -> Canonical Operational Store
                              |  dependency fan-out                        (PostgreSQL-style, append-only)
                              v
   Impact Analyzer / Content Patch Generator / QA / Publication Controller -> Publication Bindings
                              |                                               Git Governance Records
                              v
   Owner gates -> Preview -> QA -> Publish -> Live Verify -> Rollback
   Search / vector index ..... retrieval aid only, NEVER a source of truth
```

## 4. Data ownership by component

| Component | Authoritative for | Never stores |
| --- | --- | --- |
| Canonical Operational Store | Entities, claims, versions, freshness, schedules | Evidence bytes; rendered prose |
| Evidence Object Store | Immutable snapshot bytes, screenshots, redirect chains | Canonical truth; authority decisions; secrets |
| Git Governance Records | Owner receipts, review/decision records, architecture | Live data; secrets |
| Search / Vector Index | Retrieval acceleration | Anything authoritative — it is rebuildable |

## 5. Two-layer state model (Correction 026)

**Pipeline stage** is a non-terminal process position; **task outcome** is the terminal result of one
iteration. They are distinct vocabularies and are never conflated. Likewise **freshness state**,
**claim-verification state** and **source-health state** are three independent dimensions. See
[the change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)
and [the agent state machine](./CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md).

## 6. Trust and authority boundaries

- Agents **propose and validate**; they **MUST NOT** directly mutate production authority.
- High-risk changes — regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership,
  affiliate URL/code, CTA enable, production binding, deploy — are **owner-gated** and never auto-published.
  See [the autonomous update policy](./CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md).
- Source authority is **claim-type-specific**; there is no universal "higher tier always wins" rule.
- Public affiliate verification defaults to anonymous **L0–L3**; **L4** requires separate owner
  authorization. See [the affiliate verification standard](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md).

## 7. Source-to-publication end-to-end flow

Detect change → capture immutable snapshot → extract/validate claim (confidence, verification state,
limitations, dates) → resolve conflicts by **claim-type authority** → freshness → impact fan-out →
patch on Green/Amber/Red lane → QA and (Amber/Red) owner gate → publish → live-verify → rollback on
mismatch. See [source monitoring](./CBW_SOURCE_MONITORING_STANDARD_V1.md).

## 8. Queues, locks, idempotency, deduplication, retries, dead-letter

Every pipeline message carries an **idempotency key**; concurrency **locks** exist per source, claim,
market profile and publication target; retries use bounded exponential backoff and respect
`Retry-After`; exhausted messages go to a **dead-letter** queue and raise an alert. Details in
[agent roles](./CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md).

## 9. Auditability, versioning, rollback, disaster recovery

Claims and publications are **append-only and versioned**; superseded records are retained, never
overwritten. The operational store is reconstructable from evidence snapshots plus Git records; the
search index is fully rebuildable and non-authoritative. Every publication has a live-verification
record and a rollback target.

## 10. Security, secrets, privacy (Correction 026)

Publicly observable affiliate values (landing URLs, public codes, visible offer figures) are
**evidence**, classified `PUBLIC_OBSERVED`, and may be recorded. **Credentials, private tokens,
session cookies, private affiliate-dashboard data (`SENSITIVE_SECRET`) and personal account data
(`PERSONAL_DATA`) are never collected in L0–L3 and never committed to Git.** Fetching is honest and
identifiable and **MUST NOT** use fake identity, proxy, location spoofing, account automation or
financial transactions.

## 11. Scaling model

Dependency-based monitoring fans one changed source out only to its dependents — not full daily
re-research. A second country adds market profiles and dependency edges, never duplicated global facts.

## 12. Observability, SLO categories, alert severities

SLO categories: **freshness SLA** (critical claims rechecked within policy, sub-day where required),
**evidence integrity**, **publication safety**. Alert severities: `INFO`, `WARNING`, `HIGH`,
`CRITICAL` (see the source/monitoring model).

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

## 14. Corrected canonical vocabularies (026)

All standards and models **MUST** use these exact vocabularies (old values appear only in a labelled
`legacyMappings`):

- **claim confidence:** `HIGH`, `MEDIUM`, `LOW`, `UNVERIFIED`
- **freshness state:** `FRESH`, `DUE_SOON`, `STALE`, `EXPIRED`
- **claim verification state:** `SUPPORTED`, `CONFLICTED`, `UNDER_REVIEW`, `UNSUPPORTED`
- **source health state:** `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `BLOCKED`, `RETIRED`
- **affiliate verification level:** `L0_UNVERIFIED`, `L1_LINK_RESOLVES`, `L2_OFFER_VISIBLE`, `L3_TERMS_ELIGIBLE`, `L4_ACCOUNT_CONFIRMED`
- **affiliate offer status:** `ACTIVE_VERIFIED`, `ACTIVE_LIMITED`, `UNDER_REVIEW`, `CODE_NOT_APPLIED`, `GEO_NOT_ELIGIBLE`, `LINK_BROKEN`, `OFFER_ENDED`, `SOURCE_UNAVAILABLE`, `CONFLICTED`
- **pipeline stage:** `DISCOVER`, `CAPTURE`, `EXTRACT`, `VERIFY`, `RESOLVE`, `UPDATE_CLAIM`, `ANALYZE_IMPACT`, `PATCH`, `QA`, `POLICY_GATE`, `PUBLISH`, `LIVE_VERIFY`, `ROLLBACK`
- **terminal task outcome:** `PUBLISHED`, `NO_MATERIAL_CHANGE`, `OWNER_REVIEW_REQUIRED`, `BLOCKED`, `SOURCE_UNAVAILABLE`, `CONFLICT_UNRESOLVED`, `ROLLED_BACK`
- **policy lane:** `GREEN`, `AMBER`, `RED`
- **publication state:** `UNBOUND`, `BOUND`, `PREVIEW`, `QA`, `OWNER_REVIEW`, `PUBLISHED`, `SUPPRESSED`, `ROLLED_BACK`
- **cta state:** `ENABLED`, `DISABLED`, `UNDER_REVIEW`, `GEO_SUPPRESSED`, `FAILSAFE_SUPPRESSED`
- **data classification:** `PUBLIC_OBSERVED`, `INTERNAL_COMMERCIAL`, `SENSITIVE_SECRET`, `PERSONAL_DATA`

## 15. Relationship to Factory V1.1

The immutable Factory V1.1 eleven-file Deep Research package remains the governed research envelope.
Deep Research emits a complete **inline** `CBW_HANDOFF_ENVELOPE_V1`; a separate authorized capture
task writes the exact eleven files into `20-research-output/`. See
[the Deep Research companion](./CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md). `schemaVersion`
remains `"1.0.0"` because this is a pre-approval correction of V1.
