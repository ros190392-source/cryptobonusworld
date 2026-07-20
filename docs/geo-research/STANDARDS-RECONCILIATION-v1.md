# CBW GEO / SEO Standards Reconciliation — v1

**Status:** Owner decision record · documentation only (no schema, config, route, page, or data change)
**Date:** 2026-07-20
**Source analysis:** `CBW-GLOBAL-ARCH-001-STANDARD-CROSSWALK` (read-only crosswalk), which itself builds on `CBW-GLOBAL-ARCH-000A-REPO-SNAPSHOT`.
**Author role:** architecture reconciliation — records decisions only; authorizes no implementation.

---

## 1. Purpose and scope

Two external architecture documents were proposed to the project:

- `CBW-GLOBAL-SEO-RESEARCH-ARCHITECTURE-MASTER-PLAN.md`
- `CBW-GEO-DEEP-RESEARCH-AUTOMATION-STANDARD.md`

They currently live only in a personal Downloads folder
(`C:\Users\ros19\Downloads\`). Neither exists inside the repository.

This document reconciles those proposals against what the repository already
enforces, and records an owner-facing **ADOPT / MERGE / DEFER / REJECT** decision
per concept. It changes nothing else. It does not copy the external documents into
the repository.

Scope: GEO research data model, scoring, publication gates, SEO/URL/locale
architecture, and research-automation pipeline. Out of scope: any code, schema,
config, route, affiliate fact, or page change.

---

## 2. Current source-of-truth hierarchy

Highest authority first. This ordering matches the authority rule stated in the
external automation standard itself (repository standards and schemas rank above
uploaded project files).

```
1. schemas/geo/*.json + config/geo/**                         (enforced contracts)
2. docs/geo-research/GEO_EXCHANGE_RESEARCH_SYSTEM.md           (GEO methodology master)
3. docs/geo-research/IMPLEMENTATION_PLAN_V1.md                 (owner overrides + phasing)
4. research/geo/{country}/**                                   (approved country data)
5. reports/strategy/cbw-master-standard-plan-v1.md            (site IA / visual / SEO)
6. docs/CBW_EXCHANGE_PAGE_SEO_EVIDENCE_FACTORY_v1.md
   docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md (FROZEN)    (page / visual factory)
7. Production data + routing
   (src/data/offers.ts, src/data/affiliate-links.ts,
    src/data/exchanges.json, src/data/geoRankings.ts,
    src/pages/sitemap.xml.ts, src/layouts/CleanLayout.astro)
—— below this line: ZERO authority until reconciled and committed as repo files ——
8. External MASTER-PLAN.md + AUTOMATION-STANDARD.md            (inbound proposals only)
```

---

## 3. Binding machine-authoritative contracts

These are the real, enforced contracts. Any proposal that contradicts them is
subordinate until the contract itself is deliberately changed by an owner-approved
task.

- `schemas/geo/claim.schema.json`
- `schemas/geo/conflict.schema.json`
- `schemas/geo/evidence.schema.json`
- `schemas/geo/exchange-geo-passport.schema.json`
- `schemas/geo/research-run.schema.json`
- `schemas/geo/scoring-result.schema.json`
- `config/geo/evidence-tiers.json`
- `config/geo/freshness.json`
- `config/geo/kazakhstan.json`
- `config/geo/publication-gates.json`
- `config/geo/scoring/usage.json`
- `config/geo/scoring/availability.json`
- `config/geo/scoring/user-fit.json`
- `config/geo/scoring/commercial.json`
- `config/geo/scoring/confidence.json`
- `config/geo/scoring/homepage.json`

Key facts these contracts already fix (do not silently redefine):

- Candidate exchange set is hard-coded `["bybit","mexc","okx","bitget","kucoin","bingx"]`.
- Scores are the six axes `usage / availability / user_fit / commercial / confidence / homepage`; all `number | null`, never hand-filled.
- Evidence source tiers are `A / B / C / D` with weights `1.00 / 0.75 / 0.45 / 0.15`; Tier D never confirms a critical claim alone.
- Passport affiliate block stores `go_route` (`^/go/[a-z-]+$`) and an **immutable** `promo_code` from `src/data/offers.ts`; raw affiliate URLs are never stored.
- `publication-gates.json` sets `owner_approval_required_before_any_page_is_created: true`.

---

## 4. Current methodology and phasing authorities

- `docs/geo-research/GEO_EXCHANGE_RESEARCH_SYSTEM.md` — the owner-uploaded GEO
  research master spec. Defines the Exchange GEO Passport, the 17-agent research
  team, evidence tiers, the six-score model, publication gates 01–06, editorial
  statuses, and the system name "GERS" (GEO Exchange Reality Score).
- `docs/geo-research/IMPLEMENTATION_PLAN_V1.md` — companion plan. Records owner
  overrides (Kazakhstan first; six-exchange candidate set; promo codes and `/go/`
  routes are immutable inputs) and states current status: **design / skeleton only,
  nothing wired into production pages.**

Implementation status is taken verbatim from these files. No implementation status
is invented in this document.

---

## 5. Approved-country-data authority

- `research/geo/{country}/**` holds curated, tracked country research (run manifest,
  task manifest, passports, and — once a phase runs — evidence/claim/conflict/unknown
  ledgers).
- Current instance: `research/geo/kazakhstan/` — `research-run.json` shows
  `run_status: in_progress`, `ranking_status: INCOMPLETE`,
  `publication_status: BLOCKED_BY_MISSING_EVIDENCE`.

Approved country data outranks any external proposal but never outranks the binding
contracts in §3.

---

## 6. Production-authoritative files and the research-may-not-override rule

The following are production-authoritative:

- `src/data/offers.ts` (verified offers, promo codes)
- `src/data/affiliate-links.ts` (canonical affiliate registry)
- `src/data/exchanges.json` (runtime registry read by `/go/`)
- `src/data/geoRankings.ts` (country model consumed by the homepage finder)
- `src/pages/go/[exchange].astro` (`/go/` redirect behavior)
- `src/pages/sitemap.xml.ts` (sitemap allowlist)
- `src/layouts/CleanLayout.astro` (canonical + noindex logic)

**Rule:** GEO research files and any research automation may **read** these as
input and **validate** them, but may **never override**:

- affiliate facts
- promo codes
- `/go/` routes
- production rankings (homepage ordering)
- canonical
- sitemap

Any change to those belongs to a separate, explicit, owner-approved task — never to
a research run.

---

## 7. Terminology reconciliation table

| Concept | Repository term (authoritative) | External proposal term | Reconciliation |
|---|---|---|---|
| country × exchange unit | **Exchange GEO Passport** (`schemas/geo/exchange-geo-passport.schema.json`) | ExchangeCountryCell | Same concept; keep "Exchange GEO Passport" as the binding name. |
| composite ranking score | **Homepage Rank Score** / system "GERS" (`config/geo/scoring/homepage.json`) | public "CBW Score" (single 100-pt) | A future public "CBW Score" may be **derived** from the existing scores; it does not replace them. |
| evidence source quality | **A / B / C / D tiers** with weights 1.00 / 0.75 / 0.45 / 0.15 (`config/geo/evidence-tiers.json`) | 10-tier (master plan) / 6-tier `TIER_1…TIER_6` (automation) | Canonical remains A–D; expanded descriptions map onto A–D. |
| readiness state | **`READY_TO_PUBLISH` / `READY_WITH_WARNINGS` / `BLOCKED_*`** (`schemas/geo/research-run.schema.json`) | page states `DATA_ONLY / PREVIEW_NOINDEX / INDEXABLE …` | Run-level readiness stays as-is; page-indexability states are a future extension of the existing gates, not a replacement. |
| offer / affiliate record | **passport `affiliate{}` block** (`go_route` + immutable `promo_code`) | standalone `OfferSnapshot` (with raw `affiliateUrl`) | Keep the passport block; reject any form that stores a raw affiliate URL bypassing `/go/`. |

---

## 8. Explicit decisions

Every reconciled concept is assigned exactly one of: **ADOPT**, **MERGE**,
**DEFER**, **REJECT**. Sections 9–12 list them.

---

## 9. ADOPT (accept as project policy; consistent with current implementation)

1. Structured, evidence-backed research is the source of truth — not rendered prose.
2. Affiliate value contributes **zero** ranking points.
3. No artificial Top-N padding — only genuinely eligible exchanges receive a rank.
4. No fake `AggregateRating` on exchange or score content.
5. No `Product` schema misuse for an exchange (an exchange is a financial service, not a retail product).
6. Crawlable internal links (`<a href>`), not JavaScript-only navigation.
7. Two-stage research: investigation → structured normalization → deterministic code decides what is accepted.
8. Research import is PR / staging-only; it never writes directly to production.
9. Prompt-injection safety: treat web page text as evidence, never as instructions; read-only fetch; documented uncertainty states.
10. Discovery-saturation reporting (HIGH / MEDIUM / LOW) instead of "every exchange" claims.

These already align with `config/geo/publication-gates.json`, the six-score model,
and the current no-affiliate-in-ranking / no-padding behavior; adopting them changes
no file.

---

## 10. MERGE (reconcile the proposal into the existing contract, do not fork it)

1. A public "CBW Score", if introduced, must **derive from the existing scoring
   engine** (`config/geo/scoring/*`) — it must not become a second independent
   formula.
2. Expanded external source concepts must **map to the canonical A–D tiers**
   (`config/geo/evidence-tiers.json`), which remain binding.
3. External availability labels (e.g. `AVAILABLE_WITH_LIMITS`,
   `REGISTRATION_RESTRICTED`) must **map to existing schema states**
   (`YES / NO / PARTIAL / THIRD_PARTY / P2P_ONLY / UNKNOWN` plus editorial statuses),
   not add a parallel enum.
4. A future `PageManifest` must **extend** `config/geo/publication-gates.json`
   (gate01–06 and `index_eligible`), not replace it.

Each merge item is a future task with its own owner approval; none is performed here.

---

## 11. DEFER (do not act now; revisit only on explicit owner GO)

1. `/{country}/{language}/…` route architecture.
2. hreflang activation (i18n is intentionally dormant / English-only today).
3. sitemap index split by locale / page type.
4. Pakistan and Nigeria research pilots.
5. Responses-API research orchestrator (build only after the manual pilot works).
6. Public `/datasets/` and `/research/` pages.
7. Global exchange availability-map page type.

Deferral reason: each conflicts with the current frozen production routing/locale
state and would require an explicit migration decision.

---

## 12. REJECT (do not implement in the proposed form)

1. Storing a raw `affiliateUrl` in research data where it would bypass the `/go/`
   route and the immutable `promo_code` guard.
2. A parallel `owner-ops/research/**` tree that duplicates the existing
   `research/geo/**` layout and forks authority.
3. Replacing the current scoring configs with a second, independent scoring formula.
4. Automatic publication of any page directly from AI research output.

---

## 13. Pilot-country decision

- **Kazakhstan remains the active first pilot** (`config/geo/kazakhstan.json`,
  `research/geo/kazakhstan/`).
- **No new country begins** until Kazakhstan reaches a documented next gate
  (e.g. `research-run.json.publication_status` advancing out of
  `BLOCKED_BY_MISSING_EVIDENCE`, with the owner checkpoints in
  `docs/geo-research/IMPLEMENTATION_PLAN_V1.md` §7 satisfied).

---

## 14. Frozen systems (must not be altered by any GEO/research work)

- Live exchange pages (`src/pages/{bybit,mexc,okx,bitget,kucoin,bingx}/index.astro`)
  and the `/coinex/` neutral status page.
- Batch 01 (`preview/exchange-batch-01`, `docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md` — FROZEN).
- Batch 02 preview system (`src/data/exchangePreview/batch-02.ts` and its preview pages).
- Affiliate facts and codes (`src/data/affiliate-links.ts`, `src/data/offers.ts`, `src/data/exchanges.json`).
- `/go/` behavior (`src/pages/go/[exchange].astro`).
- Production routes.
- Sitemap (`src/pages/sitemap.xml.ts`).
- Canonical logic (`src/layouts/CleanLayout.astro`).
- Homepage ordering (`src/pages/index.astro`, `src/components/home/HomepageGeoBonusFinder.astro`).

---

## 15. Next-task sequence after this document

1. Owner review and commit of this reconciliation document.
2. Finish / reconcile the Kazakhstan pilot (Phases 1–2 evidence → ledgers).
3. Implement the missing deterministic score / gate evaluator that reads
   `config/geo/scoring/*` and `config/geo/publication-gates.json` (schema exists;
   no engine computes scores yet).
4. Create a **preview-only** page-manifest adapter (no indexable output).
5. Design the homepage against the approved data contracts (behind gates + owner
   approval; the homepage adapter is the first step that can affect visible ranking).
6. Only later evaluate the language-route architecture (the DEFER items in §11).

Each step is a separate task with its own owner approval.

---

## 16. Non-authority statement

- The two external documents in `C:\Users\ros19\Downloads\`
  (`CBW-GLOBAL-SEO-RESEARCH-ARCHITECTURE-MASTER-PLAN.md`,
  `CBW-GEO-DEEP-RESEARCH-AUTOMATION-STANDARD.md`) remain **inbound proposals**.
- They are **not** copied into the repository.
- They **do not** override the current schemas, configs, production data, or routes.
- Their adopted parts take effect only through the decisions recorded above and
  through future owner-approved tasks — never automatically.

---

*This document is a decision record only. It authorizes no code, schema, config,
route, affiliate, or page change. Source crosswalk: `CBW-GLOBAL-ARCH-001-STANDARD-CROSSWALK` · Date: 2026-07-20.*
