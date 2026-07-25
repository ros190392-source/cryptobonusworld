# CBW — Kazakhstan × OKX P0-C Research Intake Queue v1

| Field | Value |
|---|---|
| **Queue ID** | `CBW-KZ-OKX-P0C-RESEARCH-QUEUE-v1` |
| **Task** | `CBW-KZ-OKX-P0-C-RESEARCH-INTAKE-001` |
| **Source of truth** | [Issue #21](https://github.com/ros190392-source/cryptobonusworld/issues/21) |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `d55629487f99ede1957f8118602efd1717f6d180` · origin/main `0a96f691f4d5b32003cc6b9e80db30436384496b` |
| **Country × Exchange** | Kazakhstan (`KZ`) × OKX · batch `KZ-P0-C` · priority **P0** |
| **Mode** | Repository inventory + research queue + intake package only (no research, no web, no conclusion, no commit-time production change) |
| **Date** | 2026-07-25 |

Companion machine-readable record: [CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.json](CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.json). No research was performed; no web browsing; no availability, KYC, registration, ranking, CTA, promo, affiliate or eligibility conclusion was made. Every URL is a research lead only. Repository routes and codes are implementation facts, not eligibility evidence.

## Recommendation: **APPROVE** — research intake prepared; research not started
OKX is the approved next exchange in the fixed Kazakhstan wave order `bybit → mexc → okx`; batch is **KZ-P0-C**. Bybit (positive precedent, `AVAILABLE_WITH_LIMITS`) and MEXC (restrictive precedent, `RESTRICTED`) already have canonical MI packages; both still carry `rankingEligibility`, `ctaEligibility` and `promoEligibility` = false. **No OKX MI cell, staging pipeline, canonical package, or MIGRATION_5 preview exists** (safe state).

## 1. Inputs reviewed (nothing modified)
KZ × Bybit canonical package and decisions (positive precedent); KZ × MEXC staging, decisions, canonical package and promoter (restrictive/conflict precedent); MI schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`, `restriction-event`), GEO schemas, reconciliation standards, research architecture and the task-contract schema/validator; branch-authority map; production KZ GEO records (`src/data/geoRankings.ts` MANUAL_OVERRIDES.kazakhstan) and `config/geo/kazakhstan.json`; OKX exchange registry (`src/data/exchanges.json`, `offers.ts`, `affiliate-links.ts`, `exchange-intelligence/okx.json`, `exchangePages/okx.ts`); legacy GEO passport `research/geo/kazakhstan/exchanges/okx.json`; the master Kazakhstan research queue OKX item; NO-PROXY research rules.

## 2. Current OKX repository inventory (committed truth only)
- **Legacy GEO passport** (`research/geo/kazakhstan/exchanges/okx.json`): `research_status: not_started`; availability + products all **UNKNOWN**; legal entity null; affiliate `/go/okx` + `CRYPTOBONUSW` (link/code `not_checked`, geo_eligible UNKNOWN, bonus not_checked); scores null; `cta: not_decided`, `index_eligible: false`; evidence `ev-kz-okx-terms-121`, `ev-kz-afsa-warning-003`; conflict `cf-kz-okx-terms-vs-regulator`; unknown `kz-okx-bonus-availability-004`; last checked 2026-07-14.
- **Production** (`geoRankings.ts` okx override): availability **unknown** · bonusAvailability **unknown** · route `/go/okx` · code `CRYPTOBONUSW` (implementation facts only) · confidence **partial** · restrictionNote (KZ absent from OKX Risk & Compliance Disclosure restricted-locations, Section 3, captured 2026-07-03; not-restricted is a partial signal, not a confirmation) · regulatorCautionNote (AFSA warning 2026-04-29 names OKX unlicensed toward KZ) · evidence `okx.com/en-us/help/risk-compliance-disclosure`, 2026-07-03 · Kazakhstan **not ranking-ready** · publication **blocked** (`homepage_eligible: false`, `blocked_by_missing_evidence`).
- **Exchange registry (implementation facts only)**: slug `okx`; affiliate URL `https://okx.com/join/CRYPTOBONUSW` (**IMMUTABLE**, ROLE 0 to change); promo code `CRYPTOBONUSW` (**IMMUTABLE**); CTA route `/go/okx/`; advertised **Up to 5,000 USDT** global welcome package (not a KZ-verified value); offers `restrictedCountries = [US, HK, SG, MY, CA, GB]` — **KZ not listed**; official restricted-services list `okx.com/help/okx-services-not-available`. `geoRankings.ts` also records **OKX Europe Limited** holding a MiCA CASP license (Malta MFSA, 2025-01-27) for the EEA — an **EU fact, not** a Kazakhstan authorization.
- **Master queue item** (okx): priority P0 · batch KZ-P0-C · currentMiAvailability **CONFLICTING** · discrepancyState **INCOMPARABLE** · shadowOutcome **HOLD_CONFLICTING** · knownConflict `cf-kz-okx-terms-vs-regulator` · ownerReviewRequired true.
- **OKX MI cell / staging / canonical / MIGRATION_5 preview: none exist.**

*Production and legacy data are implementation truth only, not verified research truth. Routes, codes, bonus figures and the EU entity are implementation facts, not Kazakhstan eligibility evidence.*

## 3. Implementation facts vs research facts
**Implementation facts** (repository): OKX slug/route/code/bonus figures; OKX Europe MiCA CASP license (EU/EEA only); production override values; absence of KZ from OKX offer/exchange restricted lists. **Research facts to establish** (Kazakhstan): whether a KZ citizen/resident can register; the serving legal entity and its terms; KYC acceptance of KZ documents; per-product availability; official KZT rails / cards / P2P; the current authoritative status of the AFSA-vs-terms conflict. *No referral route, promo code, P2P page or historical campaign is proof of current Kazakhstan eligibility.*

## 4. Research-priority decision
**P0 · KZ-P0-C · evidence state CONFLICTING** (`cf-kz-okx-terms-vs-regulator`, critical, unresolved) · owner action = **tiered dated official-source research** to resolve or explicitly retain CONFLICTING. Rationale: KZ is absent from OKX's own Risk & Compliance Disclosure restricted-locations list (partial positive signal) while the AFSA warning of 2026-04-29 names OKX as unlicensed toward Kazakhstan citizens (Tier-A regulator). A visible KZT/P2P surface is a product signal, not proof of eligibility; an AFSA warning is a regulatory signal, not proof of technical unavailability. **Do not resolve in this intake task.**

## 5. Known facts (from repository only)
KZ absent from OKX Risk & Compliance Disclosure restricted-locations (capture 2026-07-03; doc updated 2026-07-08) — partial positive signal, not a confirmation · AFSA warning (2026-04-29) names OKX unlicensed toward KZ citizens · no dedicated KZ support/KZT page/AFSA-license found in prior research · OKX Europe MiCA CASP license (2025-01-27) is EEA, not KZ · legacy passport not_started (all UNKNOWN) · production unknown/partial with regulator caution, KZ publication-blocked and not ranking-ready · affiliate route/code + 5,000 USDT global figure exist as implementation facts (geo_eligible UNKNOWN) · no OKX MI cell/staging/canonical/preview.

## 6. Repository-only conflict
- **`cf-kz-okx-terms-vs-regulator`** — OKX's Risk & Compliance Disclosure does not list Kazakhstan as restricted, but the AFSA warning (2026-04-29) names OKX unlicensed toward KZ citizens. Status **UNRESOLVED_CRITICAL** (Tier-A regulator vs Tier-A disclosure; weigh recency + authority with dated sources). Do not resolve in this task.

## 7. Research-question coverage
Covers **A** legal/contracting entity · **B** registration eligibility (citizen/resident/foreign-national, new-registration, min age, exclusions) · **C** KYC (documents, proof-of-address, citizenship vs residence, product/limit thresholds) · **D** product availability (spot, margin, derivatives, copy trading, earn/staking, mobile app, P2P, KZT P2P, direct KZT deposit/withdrawal, bank-card — not flattened) · **E** fiat & KZT rails · **F** regulation & restrictions (AFSA/AIFC status and public register; distinguish legal availability vs local authorization vs technical reachability; no authorization inferred from availability; no unavailability inferred from an AFSA warning alone) · **G** referral/affiliate compatibility (routes/codes = implementation only) · **H** fees, limits & promotions (never combine unrelated amounts) · **I** conflicts, freshness & live-verification gaps.

## 8. Research mode
Official-source-first, evidence-first, **NO-PROXY**. Output language English; research languages English, Russian, Kazakh. Prohibited: proxy, VPN, location spoofing, account creation, login, KYC submission, deposit, trading, referral-code submission, any live financial transaction, restricted-region bypass. Current evidence separated from historical campaigns. Third-party sources for discovery/contradiction context only — never overriding current official evidence.

## 9. Seed inventory (leads only)
Nine required seed groups, each a **research lead, not a conclusion**, each carrying retrieval date, language, source tier, expected claim scope, limitation and an over-inference warning: OKX Risk & Compliance Disclosure / restricted locations; OKX Terms of Service eligibility sections; OKX KYC / identity-verification guidance; OKX P2P eligibility & registered-region fiat rules; current OKX P2P Express USDT/KZT and BTC/KZT surfaces; official OKX announcements or historical campaigns mentioning Kazakhstan/KZT; AFSA warning naming OKX; AFSA public register search for any OKX-related licensed entity; official Kazakhstan/AIFC regulatory sources. See [source-seed-inventory.json](../../../research/market-intelligence/intake/kz/okx/p0c-v1/source-seed-inventory.json).

## 10. Expected Deep Research output contract
One deterministic evidence package (see [deep-research-prompt.md](../../../research/market-intelligence/intake/kz/okx/p0c-v1/deep-research-prompt.md)) containing at minimum **11** files: `research-run.json`, `source-verification.json`, `claim-verdicts.json`, `conflict-resolution.json`, `product-availability.json`, `payment-rails.json`, `offer-eligibility-review.json`, `schema-normalization-notes.json`, `import-readiness.json`, `source-truth-review-report.md`, and `MANIFEST.txt` with file hashes and counts. Each source/claim carries URL, publisher, title, dates, language, source tier, checked date, confidence, limitations and exact support/contradiction relationships. Must distinguish platform / product / ranking / CTA / promo / publication eligibility. Recommendation enum {AVAILABLE, AVAILABLE_WITH_LIMITS, CONFLICTING, RESTRICTED, UNAVAILABLE, UNKNOWN}; confidence {HIGH, MEDIUM, LOW}; default `liveVerificationState` **NOT_LIVE_VERIFIED**. Deep Research authorizes **research only**.

## 11. Authorization boundaries (all false)
`researchConclusion` · `sourceTruthDecision` · `researchImport` · `stagingImport` · `canonicalImport` · `productionChange` · `productionBinding` · `rankingChange` · `ctaChange` · `promoChange` · `affiliateRouteChange` · `publication` · `schemaChange` · `legacyGeoChange` · `migration5` · `deploy` — **all false**. This intake authorizes preparation of the Deep Research input package only.

## 12. Handoff package
`C:/projects/CBW-handoff/CBW_KZ_OKX_P0C_DEEP_RESEARCH_INPUT_v1.zip` — flat, **6** entries (the two research-queue files plus the four intake/context files; **excluding** the AI Ops task contract), LF-preserved, deterministic inventory, untracked; package status **PREPARED / UNRESEARCHED**; Deep Research task `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002`.

## 13. Next task
**`CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002`** — owner-gated independent Deep Research run (external tool) over the attached input ZIP, returning the eleven-file structured output package under NO-PROXY rules for owner review. Claude Code does not conduct the research. Import, staging, canonical MI, ranking, CTA, promo, publication and MIGRATION_5 remain unauthorized. Bitget/KuCoin/BingX and Bybit/MEXC reopening are not authorized.
