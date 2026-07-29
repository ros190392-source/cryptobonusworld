# CBW Continuous Exchange Market Intelligence Architecture V1 — Contract

**Task:** `CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-025`  
**Governing Issue:** #78  
**Role:** Factory V1.1 governed implementation / architecture freeze  
**Approved base:** `babe80fe2bdcb7891dddf63aa8064532626a8fba`  
**Base branch:** `main`  
**Protected production authority:** `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Owner receipt

The owner issued exactly:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-025
```

This authorizes creation of a non-production architecture package only. It grants no merge, research execution, import, affiliate-route mutation, CTA, ranking, publication, production, deploy or `master` authority.

## Architecture decision

CryptoBonusWorld is to become an evidence-backed continuous market-intelligence platform. The primary market entity is `Exchange × Country`; affiliate campaigns are scoped as `Exchange × Country × Affiliate Campaign`.

Canonical facts and claims are distinct from rendered page text. Every material claim must be evidence-backed, time-bounded, freshness-governed, historically versioned and connected to all content surfaces that depend on it.

## Exact implementation artifacts

The worker may create exactly these fifteen files and no other implementation artifact:

### Templates

1. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md`
2. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md`
3. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md`
4. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_SOURCE_MONITORING_STANDARD_V1.md`
5. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md`
6. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md`
7. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md`
8. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_IMPLEMENTATION_ROADMAP_V1.md`
9. `research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md`

### Schemas/models

10. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json`
11. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json`
12. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json`
13. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json`
14. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json`
15. `research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json`

No existing file may be changed.

## Required result records

After implementation, create exactly:

- `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_RESULT.json`
- `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_RESULT.md`

inside this governed task directory.

## Required architecture coverage

The complete package must define:

- global exchange core versus country market profile boundaries;
- legal, regulatory, registration, KYC, product, payment, P2P, fee, limit, security, restriction, history and offer entities;
- canonical PostgreSQL-style operational store;
- immutable evidence snapshots in object storage;
- governed Git evidence/review/decision records;
- search/index as retrieval aid only;
- source tiers, claims, support/contradiction edges, confidence, limitations and effective dates;
- freshness SLAs, stale handling, recheck scheduling and historical supersession;
- dependency-based monitoring and impact propagation;
- affiliate public verification L0–L3 and separately authorized L4;
- managed redirect-chain monitoring without inserting real URLs or credentials;
- Green/Amber/Red content-update lanes;
- specialized agents, deterministic state machine, retries, idempotency, locks and terminal states;
- claim-to-page/block/card/FAQ/meta/schema/CTA publication bindings;
- SEO intent clusters and quick-answer structures;
- preview, QA, owner gates, publication, live verification and rollback;
- bounded Binance × Kazakhstan vertical-slice roadmap;
- mapping of the richer Market Passport requirements into the immutable Factory V1.1 eleven-file Deep Research package.

## Affiliate safety

The architecture may describe public anonymous link verification only. It must not include or request:

- account creation or login;
- KYC submission;
- fake identity;
- VPN/proxy/location spoofing;
- referral-code submission;
- deposits, trades or financial transactions;
- real affiliate URLs, codes or bonus amounts.

L4 account-confirmed verification must be documented as a separately authorized future capability.

## Validation

Require:

- nine substantial Markdown standards with consistent terminology and relative cross-links;
- six parseable JSON documents with `schemaVersion: "1.0.0"`;
- consistent enums and IDs across all models;
- exact fifteen-file implementation inventory;
- no secrets, credentials, live offer values or unsupported exchange facts;
- no existing-file modifications;
- all Factory V1.1 `.mjs` syntax checks clean;
- fixtures remain `235 passed / 0 failed`;
- `git diff --check` clean;
- exact worker inventory equals fifteen architecture artifacts plus two result records;
- real governance workflow success with every enforcement step executed.

## Decision

Use exactly one:

- `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_READY_FOR_OWNER_APPROVAL`
- `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_BLOCKED`

## Hard boundaries

- no merge to `main`;
- no modification to PR #69, its branch or its fourteen task files;
- no Deep Research execution;
- no Factory V1.1 code or workflow change;
- no new Factory version;
- no runtime service, database, redirect, crawler, UI or content implementation;
- no `master`, production, deploy, import, ranking, CTA, promo, affiliate route, publication, sitemap, indexability or MIGRATION_5 action;
- no branch deletion;
- all eighteen active authorizations remain false.
