# CBW — MI ↔ GEO MIGRATION_4 Kazakhstan Owner Decision v1

| Field | Value |
|---|---|
| **Decision ID** | `CBW-MI-GEO-MIG4-KZ-OWNER-DECISION-v1` |
| **Project** | CryptoBonusWorld |
| **Migration phase** | MIGRATION_4 — OWNER DECISION |
| **Country** | Kazakhstan (`KZ`) |
| **Status** | `OWNER_APPROVED_DECISION_RECORD` |
| **Date** | 2026-07-21 |
| **Next review** | 2026-08-21 |

**Owner-approval scope:** this record is an **owner-approved decision record only**. It does **not** assert Council approval, production approval, publication approval, or MIGRATION_5 approval. Production behavior is frozen and unchanged.

Companion machine-readable record: [CBW_MI_GEO_MIGRATION_4_KAZAKHSTAN_OWNER_DECISION_v1.json](CBW_MI_GEO_MIGRATION_4_KAZAKHSTAN_OWNER_DECISION_v1.json)

---

## 1. Source commits

| Phase | Commit |
|---|---|
| MIGRATION_0 (reconciliation standard + binding schema) | `967fcebcbf1357b41aed002341c4a050621a8d8e` |
| MIGRATION_1 (read-only GEO→MI adapter) | `5fa3685a09c65d473b99df0acd076a648a321179` |
| MIGRATION_2 (shadow comparison + shared core) | `56208c73104bf8ca0971dee38de9cc8109976caa` |
| MIGRATION_3A (production availability snapshot exporter) | `bbe53fc1531685527998600be7ab10e8cd207829` |
| MIGRATION_3B (MI-vs-production discrepancy report) | `c8e7d052d4febe89363eb61b39e51ff69b295f55` |

## 2. Production snapshot reference

- Path: `owner-ops/market-intelligence/snapshots/production-geo-availability-kz.json`
- Source: `src/data/geoRankings.ts` (`MANUAL_OVERRIDES.kazakhstan`)
- `sourceSha256`: `75a360ccbe1d61af0fccd500b13545ac1ec3ea0ffccc755243aa7cfda456d343`
- Source-hash matches live source at decision time: **true**

## 3. Discrepancy CLI reference

- Tool: `scripts/market-intelligence/mi-geo-discrepancy-report.mjs`
- Invocation: `node scripts/market-intelligence/mi-geo-discrepancy-report.mjs --country KZ --dry-run --format json`
- Discrepancy JSON sha256: `676678d2b3e9c35bba7512e3fdef1b13476e895b4c855d2ec62cf8384bf47940`
- Totals: `exchangeCount 6 · MATCH 3 · LEGACY_MORE_PERMISSIVE 1 · MI_MORE_PERMISSIVE 0 · INCOMPARABLE 2 · MISSING_PRODUCTION 0 · MISSING_MI 0 · NO_ACTION_SHADOW 1 · HOLD_CONFLICTING 2 · HOLD_REVIEW 1 · NEEDS_EVIDENCE 2 · BLOCK_MIGRATION 0`

> This decision corresponds to the exact run above. If `sourceSha256` or the discrepancy JSON sha drifts, this record no longer applies and MIGRATION_4 must be re-issued.

## 4. Six-exchange decision table

| Exchange | Production | MI | comparisonState | shadowOutcome | Owner decision | Ranking | CTA | Promo | Priority |
|---|---|---|---|---|---|---|---|---|---|
| **bybit** | available | UNKNOWN | LEGACY_MORE_PERMISSIVE | HOLD_REVIEW | keep production; do **not** migrate into MI cell yet; not evidence-complete; require official KZ evidence; noindex Deep Passport factual build blocked; visual prototype illustrative only | BLOCKED | NO_KZ_SPECIFIC_CTA | NOT_AUTHORIZED_KZ | **P0** |
| **mexc** | unknown | CONFLICTING | INCOMPARABLE | HOLD_CONFLICTING | keep production; do not rank as verified available; no KZ CTA; resolve regulator-vs-exchange conflict first | BLOCKED | NO_KZ_SPECIFIC_CTA | NOT_AUTHORIZED_KZ | **P0** |
| **okx** | unknown | CONFLICTING | INCOMPARABLE | HOLD_CONFLICTING | keep production; do not rank as verified available; no KZ CTA; resolve official-source conflict first | BLOCKED | NO_KZ_SPECIFIC_CTA | NOT_AUTHORIZED_KZ | **P0** |
| **bitget** | restricted | RESTRICTED | MATCH | NO_ACTION_SHADOW | confirm RESTRICTED as current migration candidate; keep production; no KZ CTA; no promo on KZ page; alternatives may show; require freshness validation before MIGRATION_5 | CANDIDATE_PENDING_FRESHNESS | NO_KZ_CTA_RESTRICTED | NOT_AUTHORIZED_KZ | **P1** |
| **kucoin** | unknown | UNKNOWN | MATCH | NEEDS_EVIDENCE | keep UNKNOWN; agreement ≠ proof of availability; do not rank as verified available; no KZ CTA until evidence | BLOCKED | NO_KZ_SPECIFIC_CTA | NOT_AUTHORIZED_KZ | **P1** |
| **bingx** | unknown | UNKNOWN | MATCH | NEEDS_EVIDENCE | keep UNKNOWN; agreement ≠ proof of availability; do not rank as verified available; no KZ CTA until evidence | BLOCKED | NO_KZ_SPECIFIC_CTA | NOT_AUTHORIZED_KZ | **P1** |

## 5. Exact evidence requirements per exchange

**bybit (P0):** official registration eligibility for Kazakhstan residents · official restricted-country or terms evidence · Kazakhstan product availability · KYC eligibility · spot availability · derivatives availability · P2P availability · KZT support · local fiat versus P2P distinction · local offer eligibility · checked date and confidence · official source IDs.

**mexc (P0):** current official exchange terms · official restricted-region policy · Kazakhstan regulator or warning evidence · registration and KYC eligibility · products available in Kazakhstan · conflict-resolution notes with source tiers and dates. *(Resolve `cf-kz-mexc-terms-vs-regulator`; if unresolved, explicitly retain CONFLICTING.)*

**okx (P0):** current official regional terms · restricted-country policy · Kazakhstan regulator evidence · registration and KYC eligibility · spot, derivatives, P2P and fiat status · conflict-resolution notes with source tiers and dates. *(Resolve `cf-kz-okx-terms-vs-regulator`; if unresolved, explicitly retain CONFLICTING.)*

**bitget (P1):** confirm the current restriction remains effective · record official source and checked date · confirm whether the restriction covers registration, KYC or specific products · define next recheck date.

**kucoin (P1):** official registration eligibility · KYC eligibility · restricted-region terms · products · P2P · KZT or local-payment support · current checked date and confidence.

**bingx (P1):** official registration eligibility · KYC eligibility · restricted-region terms · products · P2P · KZT or local-payment support · current checked date and confidence.

## 6. Production freeze statement

Current production GEO (`src/data/geoRankings.ts` + `HomepageGeoBonusFinder.astro` + `promo-codes/index.astro`) remains **authoritative and unchanged**. No availability, ranking, CTA, promo, route, or page behavior is altered by this record. Bybit production availability stays `available`; all other production values stay exactly as committed. No canonical MI cell, compiled matrix, or migration of production data is created.

## 7. Prohibited actions (this phase)

Run new Deep Research · change availability · change rankings · activate or remove CTA · create MI cells · create compiled matrix · create page or route · create translations · modify snapshot/exporter/adapter/core/shadow/discrepancy CLI · proxy/VPN/local-IP simulation/KYC bypass/account automation · commit/push/deploy (this task creates the two decision files only; committing is a separate owner GO).

## 8. MIGRATION_5 advancement conditions — **BLOCKED**

MIGRATION_5 remains blocked until **all** hold (none passed in this task):

1. Bybit additional official evidence is reviewed;
2. MEXC conflict is resolved or explicitly retained as conflicting;
3. OKX conflict is resolved or explicitly retained as conflicting;
4. Bitget restriction freshness is reconfirmed;
5. KuCoin evidence review is completed;
6. BingX evidence review is completed;
7. canonical MI cells exist and validate;
8. discrepancy decisions have an owner-approved decision record;
9. ranking and CTA eligibility are separately reviewed;
10. G02, G10, G11 and G13 pass;
11. no snapshot/source hash is stale;
12. a separate MIGRATION_5 owner GO is issued.

## 9. Future noindex Deep Passport (Kazakhstan × Bybit) conditions — **BLOCKED**

May advance only after: official evidence package completed · MI cell created and validated · offer eligibility separately verified · factual content replaces illustrative prototype data · English-only page copy generated from structured evidence · route remains noindex · G01–G13 reviewed · owner gives separate approval. **Do not create the pilot now.** The visual prototype remains illustrative-only and is not factual publication approval.

## 10. G01–G13 gate status

Gate ids/owners from `owner-ops/governance/review-gates.json`. This record satisfies only the **decision-record scope** of G13; MIGRATION_5 requires G02, G10, G11 and G13 to pass — none pass here.

| Gate | Name | Owner | Status |
|---|---|---|---|
| G01 | Product intent | R01 | NOT_REQUIRED_FOR_THIS_DECISION |
| G02 | Research and evidence | R06 | **NOT_PASSED** — P0 evidence incomplete; mexc/okx conflicts unresolved |
| G03 | Design-system consistency | R02 | NOT_REQUIRED_FOR_THIS_DECISION |
| G04 | Technical SEO | R03 | NOT_REQUIRED_FOR_THIS_DECISION |
| G05 | AI-answer structure | R04 | NOT_REQUIRED_FOR_THIS_DECISION |
| G06 | Editorial quality | R05 | NOT_REQUIRED_FOR_THIS_DECISION |
| G07 | Mobile parity | R07 | NOT_REQUIRED_FOR_THIS_DECISION |
| G08 | Accessibility | R07 | NOT_REQUIRED_FOR_THIS_DECISION |
| G09 | Performance | R08 | NOT_REQUIRED_FOR_THIS_DECISION |
| G10 | Structured-data honesty | R03 | **NOT_PASSED** — required before MIGRATION_5 |
| G11 | Commercial/compliance safety | R09 | **NOT_PASSED** — unresolved regulator conflicts; bitget freshness unconfirmed |
| G12 | Preview/noindex QA | R10 | NOT_REQUIRED_FOR_THIS_DECISION (required later for the noindex pilot) |
| G13 | Owner approval | OWNER | **PASSED for decision-record scope only** — not production/ranking/publication/MIGRATION_5 |

## 11. Owner sign-off

- `ownerApproved`: **true** (decision-record scope only)
- `productionChangeAuthorized`: **false**
- `rankingIntegrationAuthorized`: **false**
- `routeActivationAuthorized`: **false**
- `deepPassportPublicationAuthorized`: **false**
- `productionRemainsAuthoritative`: **true**
- `EnglishOnly`: **true**
- Affiliate value has **no** influence on any decision or ranking. NO-PROXY mode: no proxy/VPN/local-IP simulation/KYC bypass/account automation.

## 12. Next safe task

**`CBW-MI-GEO-KZ-EVIDENCE-RESEARCH-QUEUE-001`** — owner-gated capture/review of the P0 (bybit, mexc, okx) then P1 (bitget freshness, kucoin, bingx) official Kazakhstan evidence packages defined above (NO-PROXY, official-source, dated), feeding a later separate MIGRATION_5 GO. No MI cell, ranking, CTA, route, page, translation, or Deep Research is authorized by this record.

---

*Schema note: the machine-readable companion embeds a `governanceDecisionRecord` sub-object that conforms to `owner-ops/governance/decision-record.schema.json`. The surrounding MIGRATION_4 structure is a documented superset the committed schema (`additionalProperties: false`) cannot represent; the schema was not modified.*
