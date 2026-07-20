# CBW — Market Intelligence ↔ GEO ↔ Deep Passport Reconciliation Standard v1

**Status:** Proposed owner authority · architecture + documentation + schema only (no data, ranking, page, route, or deploy change)
**Date:** 2026-07-20
**Baseline commit:** `c89ee74`
**Companion schema:** [schemas/market-intelligence/mi-geo-binding.schema.json](../../schemas/market-intelligence/mi-geo-binding.schema.json)

## 0. Purpose

Define **one** canonical relationship between five systems so there is never more than one Country × Exchange truth record:

1. the existing **GEO research system** (frozen production);
2. the **Exchange Market Intelligence Brain** (future canonical decision layer);
3. the **Country × Exchange Deep Passport** (renderer/page family);
4. the **future ranking engine**;
5. the **future page renderer**.

This document changes no code, data, ranking, route, or production behavior. It defines contracts only.

---

## 1. Existing GEO inventory (read, not assumed)

Inspected at baseline `c89ee74`:

- **Schemas** — [schemas/geo/](../../schemas/geo): `claim`, `conflict`, `evidence`, `exchange-geo-passport`, `research-run`, `scoring-result`.
- **Config** — [config/geo/](../../config/geo): `evidence-tiers.json`, `freshness.json`, `kazakhstan.json`, `publication-gates.json`, `scoring/{availability,commercial,confidence,homepage,usage,user-fit}.json`.
- **Research data** — [research/geo/kazakhstan/](../../research/geo/kazakhstan): `research-run.json` (run `run-kz-2026-07-14`, `BLOCKED_BY_MISSING_EVIDENCE`), country maps, 6 passports, ledgers.
- **Production ranking data / consumers** — `src/data/geoRankings.ts` (consumed by `src/components/home/HomepageGeoBonusFinder.astro` and `src/pages/promo-codes/index.astro`), plus `src/data/offers.ts`, `src/data/affiliate-links.ts`, `src/data/exchanges.json`, `src/data/exchanges.ts`.
- **Governing docs** — `docs/geo-research/GEO_EXCHANGE_RESEARCH_SYSTEM.md`, `IMPLEMENTATION_PLAN_V1.md`, `docs/geo-research/STANDARDS-RECONCILIATION-v1.md`, `docs/geo-research/NO-PROXY-RESEARCH-MODE-v1.md`.

The GEO passport (`schemas/geo/exchange-geo-passport.schema.json`) is a **six-exchange** record (bybit, mexc, okx, bitget, kucoin, bingx). The MI cell (`schemas/market-intelligence/exchange-market-cell.schema.json`) is a **~200-exchange superset** of the same country × exchange concept.

### Identified overlaps and conflicts
- **Overlap:** GEO passport `availability{}` / `products{}` / `scores{}` overlap the MI cell's `overallAvailability` / `productStatuses` / eligibility fields. Both express "is exchange X available in country Y".
- **Overlap:** the Deep Passport schema (`schemas/country-exchange/country-exchange-deep-passport.schema.json`) declares an inline `countryExchangeCell` object — a **potential third availability record** if left independent.
- **Conflict risk:** three schemas could each assert availability for the same pair. This standard removes that risk by naming one canonical record and making the others input or consumer.

---

## 2. Canonical source of truth

- The **Market Intelligence country × exchange cell** ([schemas/market-intelligence/exchange-market-cell.schema.json](../../schemas/market-intelligence/exchange-market-cell.schema.json)) is the **future canonical normalized decision record** for availability, product statuses, eligibility, confidence and freshness.
- The **Country × Exchange Deep Passport renderer consumes** that cell and **must not maintain a competing availability record.** The Deep Passport schema's inline `countryExchangeCell` is redefined by this standard as a **read-only projection/reference of the MI cell**, never an independent source. Its `additionalProperties: true` must not be used to store authoritative availability that diverges from the MI cell.
- Exactly **one binding per (exchangeId, countryCode)** exists ([mi-geo-binding.schema.json](../../schemas/market-intelligence/mi-geo-binding.schema.json)), whose `canonicalRecord` is `MI_CELL` once migrated (or `GEO_LEGACY` only for pairs not yet migrated).

---

## 3. Existing GEO system stays frozen

- The current GEO system remains **authoritative for existing production behavior** until a separately approved migration.
- The six-exchange GEO records under `research/geo/` and the production ranking in `src/data/geoRankings.ts` (+ its consumers) are **not rewritten, invalidated, re-keyed, or migrated** by this standard.
- Until a pair reaches `MIGRATION_7`, its binding `canonicalRecord` may remain `GEO_LEGACY` and production reads the existing path unchanged.

---

## 4. Migration model

```text
existing GEO record
→ compatibility adapter        (read-only; maps GEO passport → MI cell shape)
→ normalized MI cell           (canonical decision record)
→ compiled decision            (deterministic; generated, never hand-edited)
→ ranking eligibility          (future ranking engine input)
→ Deep Passport renderer       (consumer; English-only this phase)
```

**No silent migration.** Every step is a discrete, owner-approved task; the adapter is read-only and writes nothing back to GEO records.

---

## 5. Data ownership

Exactly one owner per field (enforced by `mi-geo-binding.schema.json#/properties/ownership`):

| Field | Owner |
|---|---|
| exchange identity | GLOBAL_PASSPORT |
| country identity | MI (country profile) |
| availability | MI |
| product statuses | MI |
| registration | MI |
| KYC | MI |
| P2P | MI |
| local fiat | MI |
| fees | MI |
| restrictions | MI |
| evidence | MI |
| confidence | MI |
| freshness | MI |
| offer eligibility | OFFER_REGISTRY |
| ranking eligibility | RANKING_ENGINE |
| CTA eligibility | MI (gated) → consumed by RENDERER |
| language presentation | LANGUAGE_LAYER |

The Deep Passport **RENDERER owns none of these facts** — it only presents them. `GEO_LEGACY` is a read-only input owner for un-migrated pairs.

---

## 6. Commercial separation

- `availability`, `rankingEligibility`, `ctaEligibility` and `promoEligibility` are **separate fields** and are never collapsed into one (schema `eligibility` block).
- **Affiliate value must never affect ranking** — encoded as the invariant `affiliateInfluencesRanking: false`.
- The **global advertised bonus maximum is separate from local eligibility** (per the Deep Passport standard §10); a local amount appears only with local evidence; restricted/conflicting pairs carry no commercial CTA.

---

## 7. Evidence precedence

Ordered strongest → weakest (schema `evidencePrecedence`), consistent with the MI Brain §7 and GEO `config/geo/evidence-tiers.json`:

1. **REGULATOR_SANCTIONS** — regulator notices, official licensing/registration registers, sanctions sources.
2. **EXCHANGE_TERMS_RESTRICTED_REGION** — exchange terms and restricted-jurisdiction pages.
3. **OFFICIAL_PRODUCT_FEE** — official product / fee / KYC / P2P pages, official app-store listings.
4. **BANKS_PAYMENT_RAILS** — official banks / payment-provider documentation.
5. **NEWS** — reputable news for discovery only; never establishes a critical availability decision when primary confirmation is obtainable.
6. **COMMUNITY** — discovery / usability signals only; never establishes legality, availability, licensing, sanctions, restriction, or fees alone.

**Stale handling:** a fact past its `config/geo/freshness.json`-style window becomes `STALE`, reduces confidence, and triggers recheck; it is never silently deleted.

---

## 8. Conflict resolution

No conflict changes production automatically; the existing production route always stays stable (`conflictResolution.productionRouteUnchanged: true`).

| Case | Outcome |
|---|---|
| GEO says AVAILABLE, MI says RESTRICTED | `HOLD_CONFLICTING` — availability = CONFLICTING; CTA + ranking suppressed; owner review. |
| Official sources disagree | `PREFER_STRONGER_TIER` if a strictly higher tier is decisive; else `HOLD_CONFLICTING`. |
| Old GEO evidence is fresher than MI | `PREFER_FRESHER_OFFICIAL` — use the fresher official-source fact; record provenance; still no production change without approval. |
| MI is UNKNOWN | `KEEP_UNKNOWN` — no definitive claim, no active CTA; existing production path unchanged. |
| Live verification unavailable | `KEEP_UNKNOWN` + `NOT_LIVE_VERIFIED` visible; NO-PROXY mode — never proxy/VPN/live-IP bypass. |
| Existing production route must remain stable | Always — conflicts never mutate live routes/rankings. |

Conflicts are never resolved toward the commercially convenient answer.

---

## 9. Ranking engine contract

- The **future ranking engine reads generated compiled MI decisions only after owner-approved migration** (`MIGRATION_5`).
- The **existing ranking** (`src/data/geoRankings.ts` + `HomepageGeoBonusFinder.astro` + `promo-codes/index.astro`) **remains untouched now** and stays the production source until activation.
- Ranking eligibility is owned by `RANKING_ENGINE`, computed from MI availability/confidence/freshness/conflict — never from affiliate value.

---

## 10. Deep Passport contract

The renderer consumes (renderer input per the Deep Passport standard §26):

- global exchange passport (identity, global facts);
- **canonical MI cell** (availability, product statuses, eligibility, confidence, freshness);
- country profile;
- offer record (commercial facts, kept separate);
- evidence package (visible sources + limitations);
- **English language layer** (presentation only — this phase);
- page state.

**Language cannot change facts** (Language Layer Standard v1): availability, fees, dates, confidence, sources, restrictions, rankings and legal conclusions are identical across languages. English only for the current phase; ru/kk on hold.

---

## 11. Migration phases

No phase may skip owner approval.

| Phase | Scope |
|---|---|
| **MIGRATION_0** | Documentation and schemas (this task). |
| **MIGRATION_1** | Read-only adapter: GEO passport → MI-cell shape. Writes nothing back. |
| **MIGRATION_2** | Shadow comparison: MI decision computed alongside production, not shown. |
| **MIGRATION_3** | Discrepancy report: GEO-vs-MI differences surfaced for review. |
| **MIGRATION_4** | Owner approval of the reconciled model + discrepancies. |
| **MIGRATION_5** | Ranking integration: future engine reads compiled MI decisions. |
| **MIGRATION_6** | noindex Deep Passport pilot (English, prototype route). |
| **MIGRATION_7** | Production activation (owner-approved, per pair). |

Current state: **MIGRATION_0**. Everything downstream is deferred and owner-gated.

---

## 12. First pilot (documented, not created)

- **Kazakhstan × Bybit**, **English only**, **noindex**, **prototype route only after separate approval.**
- Reuses `research/geo/kazakhstan/` evidence as a read-only input to the adapter (MIGRATION_1); does not modify it.
- Not created now — no cell, no compiled decision, no route, no page.

---

## 13. Non-negotiable invariants

- One canonical availability record per pair (MI cell); Deep Passport never competes.
- Existing production GEO records and routes stay frozen until MIGRATION_7.
- `availability`, `rankingEligibility`, `ctaEligibility`, `promoEligibility` remain separate; affiliate value never affects ranking.
- Language never changes facts.
- No proxy / VPN / live-IP bypass (NO-PROXY mode); unverified local behavior stays `NOT_LIVE_VERIFIED` / `UNKNOWN`.
- No automatic ranking, page, or deploy change; the compiled matrix is generated, never hand-edited.

This standard authorizes no production change. Every downstream step is a separate, owner-approved task.
