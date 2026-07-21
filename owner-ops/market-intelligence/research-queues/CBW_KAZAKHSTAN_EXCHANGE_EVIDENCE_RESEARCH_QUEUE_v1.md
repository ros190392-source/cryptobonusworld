# CBW — Kazakhstan Exchange Evidence Research Queue v1

| Field | Value |
|---|---|
| **Queue ID** | `CBW-KZ-EXCHANGE-EVIDENCE-RESEARCH-QUEUE-v1` |
| **Project** | CryptoBonusWorld |
| **Country** | Kazakhstan (`KZ`) |
| **Status** | `RESEARCH_QUEUE_READY_NO_FINDINGS` |
| **Phase** | Post-MIGRATION_4 evidence preparation |
| **Date** | 2026-07-21 |
| **productionRemainsAuthoritative** | true |
| **migration5Authorized** | false |
| **EnglishOnly** | true · **noProxyMode** true · **affiliate influences research** false |

This file defines a **research plan and structured intake contract only**. It creates **no** exchange findings, source records, claims, MI cells, compiled decisions, or reports. Each research batch is separately owner-gated.

Companion machine-readable queue: [CBW_KAZAKHSTAN_EXCHANGE_EVIDENCE_RESEARCH_QUEUE_v1.json](CBW_KAZAKHSTAN_EXCHANGE_EVIDENCE_RESEARCH_QUEUE_v1.json)

## Source decision reference

Inherits the frozen MIGRATION_4 disposition ([owner decision md](../decisions/CBW_MI_GEO_MIGRATION_4_KAZAKHSTAN_OWNER_DECISION_v1.md) / [json](../decisions/CBW_MI_GEO_MIGRATION_4_KAZAKHSTAN_OWNER_DECISION_v1.json)), decision commit `15111e9c5278c611e53ea263309433ebcdf699e4`.
- snapshot `sourceSha256`: `75a360cc…` · discrepancy JSON sha256: `676678d2…`
- If either hash drifts, re-verify before any research import.

---

## 1. Research order & batch plan (fixed)

**Wave P0** (single-exchange batches, owner review after the wave):
1. **Bybit** — batch `KZ-P0-A`
2. **MEXC** — batch `KZ-P0-B`
3. **OKX** — batch `KZ-P0-C`

→ **Owner review of P0.** Only after P0 review:

**Wave P1** (single-exchange batches, owner review after the wave):
4. **Bitget** — batch `KZ-P1-A`
5. **KuCoin** — batch `KZ-P1-B`
6. **BingX** — batch `KZ-P1-C`

> Do **not** run all six as one uncontrolled batch. Priority order is fixed: Bybit → MEXC → OKX → Bitget → KuCoin → BingX.

## 2. Per-exchange scope (states inherited from MIGRATION_4 / MIGRATION_3B)

| Exchange | Priority | Batch | Prod | MI | comparison | shadow | Research objective | Known conflict IDs |
|---|---|---|---|---|---|---|---|---|
| **bybit** | P0 | KZ-P0-A | available | UNKNOWN | LEGACY_MORE_PERMISSIVE | HOLD_REVIEW | remain UNKNOWN **or** become AVAILABLE / AVAILABLE_WITH_LIMITS / RESTRICTED / CONFLICTING | — |
| **mexc** | P0 | KZ-P0-B | unknown | CONFLICTING | INCOMPARABLE | HOLD_CONFLICTING | resolve **or** explicitly retain CONFLICTING | `cf-kz-mexc-terms-vs-regulator` |
| **okx** | P0 | KZ-P0-C | unknown | CONFLICTING | INCOMPARABLE | HOLD_CONFLICTING | resolve **or** explicitly retain CONFLICTING | `cf-kz-okx-terms-vs-regulator` |
| **bitget** | P1 | KZ-P1-A | restricted | RESTRICTED | MATCH | NO_ACTION_SHADOW | confirm **or** revise RESTRICTED (no KZ CTA while restricted) | — |
| **kucoin** | P1 | KZ-P1-B | unknown | UNKNOWN | MATCH | NEEDS_EVIDENCE | resolve UNKNOWN | — |
| **bingx** | P1 | KZ-P1-C | unknown | UNKNOWN | MATCH | NEEDS_EVIDENCE | resolve UNKNOWN | — |

No exchange is marked research-complete. No final availability decision is made in this task.

### Required claims per exchange

**Bybit (P0):** Kazakhstan resident registration eligibility · KYC eligibility · accepted identity documents (where officially stated) · restricted-country and regional terms · spot · derivatives · margin/leverage restrictions · P2P · KZT availability · direct KZT fiat support · P2P KZT support · cards and bank-transfer support · app availability · local support/language · local offer eligibility · global-offer-vs-Kazakhstan eligibility · AFSA or other Kazakhstan regulatory evidence · checked date · confidence · source IDs · unresolved limitations.

**MEXC (P0):** registration eligibility · KYC eligibility · restricted-country policy · regional terms · spot · derivatives · P2P · KZT and fiat support · cards and payment providers · Kazakhstan regulator/warning evidence · conflict `cf-kz-mexc-terms-vs-regulator` · effective dates · source-tier comparison · confidence · unresolved limitations.

**OKX (P0):** registration eligibility · KYC eligibility · regional terms · restricted-country policy · spot · derivatives · P2P · KZT/direct fiat · cards and bank/payment methods · Kazakhstan regulator evidence · conflict `cf-kz-okx-terms-vs-regulator` · effective dates · source-tier comparison · confidence · unresolved limitations.

**Bitget (P1):** confirm current restriction · whether it applies to registration / KYC / spot / derivatives / P2P / fiat · official source · effective date · checked date · next recheck date · confidence. *(Unverified third-party P2P activity must be distinguished from official terms and never overrides them.)*

**KuCoin (P1):** registration eligibility · KYC eligibility · restricted-region terms · spot · derivatives · P2P · KZT support · direct-fiat-vs-P2P distinction · cards/payment providers · app availability · checked date · confidence · unresolved evidence.

**BingX (P1):** registration eligibility · KYC eligibility · restricted-region terms · spot · derivatives · P2P · KZT support · direct-fiat-vs-P2P distinction · cards/payment providers · app availability · checked date · confidence · unresolved evidence.

## 3. Source hierarchy

- **Tier A — binding primary:** Kazakhstan regulator · sanctions authority · legislation · official exchange legal terms · official restricted-country list · official regional terms · official licence/registration record.
- **Tier B — official operational:** exchange help centre · official product pages · official fee pages · official KYC docs · official P2P docs · official fiat/payment pages · official app-store listing · official promotion terms.
- **Tier C — official ecosystem:** banks · card networks · payment rails · payment providers · official government guidance.
- **Tier D — discovery only:** reputable news · app-store reviews · community discussions · social media.

**Rules:** Tier D cannot establish legal availability, registration eligibility, KYC eligibility or product permission. News creates a **review task**, not a final decision. A strictly higher tier is decisive; equal-tier official disagreement is retained as `CONFLICTING`. Tiers map to `schemas/market-intelligence/market-source.schema.json#/properties/sourceTier`.

## 4. NO-PROXY rule (binding)

Prohibited: VPN · residential proxy · local-IP simulation · account registration · KYC submission · identity-document upload · restricted-region circumvention · mobile-number bypass. **Website accessibility is not proof of availability. IP country is not proof of legal residence.** When live verification is unavailable → `liveVerificationState = NOT_LIVE_VERIFIED`.

## 5. Future structured research output contract

Each future Deep Research batch returns **one package per exchange**:
`research-run.json` · `source-registry.json` · `claim-ledger.json` · `exchange-country-findings.json` · `conflicts.json` · `unknowns.json` · `publication-blockers.json` · `research-report.md`.

**Required fields for every source:** `sourceId`, `exchangeId`, `countryCode`, `sourceTier`, `publisher`, `title`, `url`, `sourceType`, `publicationDate`, `effectiveDate`, `retrievalDate`, `checkedDate`, `contentHash` (where available), `language`, exact supported claims, `confidence`, `limitations`, `status`.
*(Schema alignment for later import into `market-source.schema.json`: `retrievalDate`→`retrievedDate`, `publicationDate`→`publishedDate`, `effectiveDate`→`effectiveFrom`, `sourceType`→`captureType`; committed schema is not modified.)*

**Required fields for every material finding:** `claimId`, claim text, product or feature, proposed status, `sourceIds`, `confidence`, `conflictIds`, `checkedDate`, `nextReviewDate`, `liveVerificationState`, notes.

Prose must **not** be copied directly into pages; findings are structured evidence, not page copy.

## 6. Publication blockers (record per exchange)

availability unresolved · registration unresolved · KYC unresolved · product status unresolved · local fiat unresolved · offer eligibility unresolved · regulator conflict unresolved · source freshness unresolved · confidence below required level · missing primary source · stale snapshot or evidence · owner review pending.

**Rule:** a finding remains **blocked** when any critical claim lacks adequate evidence. Any single active blocker prevents MI-cell creation, ranking, CTA, promo, route, and Deep Passport publication.

## 7. Migration boundary

This queue authorizes **nothing** beyond the research plan. It does **not** authorize: canonical MI cells · compiled matrix · ranking integration · CTA activation · promo activation · production availability changes · Deep Passport implementation · route activation · public page · translation · MIGRATION_5. Future research output must be reviewed and **imported through a separate validated task**. MIGRATION_5 remains blocked (requires G02, G10, G11, G13; no stale snapshot/hash; a separate MIGRATION_5 owner GO).

## 8. Next task

**`CBW-KZ-DEEP-RESEARCH-BATCH-KZ-P0-A-BYBIT-001`** — owner-gated single-exchange Deep Research batch for **Bybit × Kazakhstan only**, returning the structured output package under NO-PROXY rules, for owner review before `KZ-P0-B` (MEXC). No MI cell, ranking, CTA, route, page, translation, or MIGRATION_5 is authorized.
