# GEO Exchange Research System — Implementation Plan v1

Date: 2026-07-14 · Companion to `GEO_EXCHANGE_RESEARCH_SYSTEM.md` (master spec, uploaded by owner).
Status: **design/skeleton only — nothing here is wired into production pages.**

## 0. Owner overrides applied to the spec

- **Candidate exchange set** = the six exchanges already configured on CryptoBonusWorld
  (`bybit, mexc, okx, bitget, kucoin, bingx`), NOT the spec's example set
  (Binance/Crypto.com/Gate.io are not approved current exchange records for this system).
- **First target GEO** = Kazakhstan (`config/geo/kazakhstan.json`).
- Promo codes and `/go/` routes are immutable inputs; the research system validates
  them but never changes them.

## 1. What already exists in the repo (reuse, don't duplicate)

| Spec concept | Existing repo asset | Relationship |
|---|---|---|
| Country availability verdicts | `src/data/geoRankings.ts` (MANUAL_OVERRIDES: Poland + Kazakhstan packs, EU/MiCA overlay) | Terms-level (Tier A doc) prior evidence. Passports cite it via `prior_findings`; a future adapter converts overrides → Claim Objects. |
| Registration-page evidence model | `src/data/geoBonusEvidence.ts` (Sprint 8D) | Its `GeoBonusEvidenceRow` ≈ a narrow slice of the Evidence Object; the new `evidence.schema.json#capture` block mirrors its fields so capture output maps 1:1. |
| Live Availability Tester (Agent 05) | `scripts/verify-geo-bonus.mjs` + `scripts/lib/geo-bonus-capture.mjs` (Sprint 8F) | Already implements proxied read-only capture with screenshot/HTML/redirect-chain/status. Blocked on `PROXY_KZ`/`PROXY_PL` env vars. Its snapshots become `capture` payloads inside Evidence Objects. |
| Evidence storage convention | `reports/evidence/geo/{country}/{date}/` (untracked) | Keep for raw captures; ledgers (tracked, curated) live under `research/geo/`. |
| Promo/affiliate canon | `src/data/offers.ts`, `src/data/affiliate-links.ts`, `/go/[exchange].astro` | Input-only. Agent 13 validates behaviour, never edits data. |
| Bonus text verification | `scripts/verify-bonus-capture.mjs` (`bonus:verify`) | Global-only today; per-GEO variant runs through verify-geo-bonus. |
| Homepage consumer | `src/components/home/HomepageGeoBonusFinder.astro` | Today reads geoRankings.ts. Future: reads approved passports/claims (see §5). Untouched in v1. |

Not present anywhere (net-new in this skeleton): passport/claim/conflict/run schemas,
scoring configs, gates config, task manifests.

## 2. Directory structure (created in this commit)

```
docs/geo-research/           spec copy + this plan
schemas/geo/                 6 JSON Schemas (evidence, claim, conflict, passport, run, scoring)
config/geo/                  kazakhstan.json, evidence-tiers.json, freshness.json, publication-gates.json
config/geo/scoring/          usage / availability / user-fit / commercial / confidence / homepage
research/geo/kazakhstan/     research-run.json, task-manifest.json, exchanges/{6 slugs}.json
```

Raw capture artifacts stay untracked under `reports/evidence/` (existing gitignore).
Curated ledgers (`evidence-ledger.json`, `claims-ledger.json`, `conflicts.json`,
`unknowns.json`) will be added under `research/geo/kazakhstan/` when Phase 6 first runs.

## 3. How capture snapshots become Evidence Objects

`scripts/verify-geo-bonus.mjs` writes `GeoBonusCaptureSnapshot` JSON. A small future
converter (`scripts/geo-research/snapshot-to-evidence.mjs`) maps it:
`testedUrl/finalUrl/redirectChain/httpStatus/screenshotPath/htmlSnapshotPath/
screenshotHash` → `evidence.capture.*`; `status` → `capture.error_class` +
`evidence.status`; source_tier = A (live registration flow per spec §5); category =
`registration`/`promo_code`/`bonus_claim` depending on what the detector found.
`postSignupVerification` stays `not_available` — Level 3 remains out of scope.

## 4. Publication safety (v1 guarantees)

- Nothing under `schemas/`, `config/geo/`, `research/` is imported by any page or
  component — verified by grep and byte-identical build output.
- No `getStaticPaths`, no routes, no sitemap change, no indexable output.
- `research-run.json.publication_status = LOCKED`; `config/geo/kazakhstan.json`
  carries `publication_status: blocked_by_missing_evidence`, `homepage_eligible: false`.
- Even a fully READY_TO_PUBLISH run cannot create a page: page creation is a separate
  owner-approved implementation task (`publication-gates.json` records
  `owner_approval_required_before_any_page_is_created: true`).

## 5. How the homepage finder will later consume this (design, not implemented)

When a country's run reaches `READY_TO_PUBLISH`/`READY_WITH_WARNINGS` **and** the owner
approves: a build-time adapter exposes, per country, the Qualified Set ordered by
`homepage` score with editorial labels + last-verified dates. `HomepageGeoBonusFinder`
prefers that source over today's geoRankings-derived rows, falling back to current
behaviour for countries without an approved run. CTA state honours Gate 02/03
(`ALLOWED`/`INFORMATIONAL_ONLY`/`FORBIDDEN`). Not built in v1.

## 6. What stays manual in v1

- Provisioning `PROXY_KZ` (and `PROXY_PL`) — owner-supplied credentials, never in repo.
- All research phases (1–13): the skeleton defines the state machine; no agent
  automation is wired yet. Each phase is a future explicit task.
- Tier-B popularity data (Similarweb/Trends/app intelligence) — no API keys exist.
- Conflict resolution and every owner checkpoint below.

## 7. Owner approval checkpoints

1. Approve this skeleton + plan (this commit).
2. Provision `PROXY_KZ` before Phase 3 (live validation) can run.
3. Approve Bitget handling: prior verified evidence says Kazakhstan is in Bitget's own
   Prohibited Countries — flagged `owner_review_required` in its passport; likely
   RESTRICTED/no-CTA outcome for KZ.
4. Approve scoring-config weights before the first Phase 8 run (they mirror the spec
   verbatim today).
5. Approve any publication (Phase 13 → real page) — separate task, never automatic.

## 8. Recommended implementation order (next tasks)

1. **Phase 1–2 for Kazakhstan** (country baseline + official terms research) — doable
   now without proxies; extends the Sprint 8B evidence pack into Claim Objects.
2. `snapshot-to-evidence.mjs` converter + `PROXY_KZ` provisioning → Phase 3.
3. Evidence normaliser + ledgers (Phase 6–7).
4. Scoring engine reading `config/geo/scoring/*` (Phase 8) + gates evaluation.
5. Sensitivity + Red Team + editorial only after real evidence exists.

## 9. Regression risks

Zero direct risk in this commit (no production imports; build byte-identical).
Future risks to watch: the homepage adapter step (5) is the first change that can
affect visible ranking — it must land behind the gates + owner approval; and the
`research/` tree must never be imported by `src/pages/**` except through the
explicitly approved adapter.
