# Repository Context Report — OKX × Kazakhstan (P0-C intake v1)

- **Task:** `CBW-KZ-OKX-P0-C-RESEARCH-INTAKE-001`
- **Source of truth:** [Issue #21](https://github.com/ros190392-source/cryptobonusworld/issues/21)
- **Repository:** `ros190392-source/cryptobonusworld` · branch `master` · baseline `d55629487f99ede1957f8118602efd1717f6d180`
- **Date:** 2026-07-25 · **Mode:** repository-grounded inventory only — no web research, no conclusion

> **Reading rule.** This report separates **repository implementation facts** (what the codebase currently encodes) from **research facts** (what an independent Deep Research run must establish about Kazakhstan). Nothing here asserts an OKX × Kazakhstan availability, KYC, registration, ranking, CTA, promo or eligibility status. No referral route, promo code, P2P page, bonus figure, EU entity or historical campaign is treated as proof of current Kazakhstan eligibility.

---

## A. Repository implementation facts (NOT eligibility evidence)

### A.1 OKX exchange registry
| Fact | Value | Source |
|---|---|---|
| Slug | `okx` | `src/data/exchanges.json`, `src/data/offers.ts` |
| Display name | `OKX` | `src/data/exchanges.json` |
| Affiliate URL | `https://okx.com/join/CRYPTOBONUSW` — **IMMUTABLE** (ROLE 0 approval to change) | `src/data/affiliate-links.ts`, `src/data/exchange-intelligence/okx.json` |
| Promo code | `CRYPTOBONUSW` — **IMMUTABLE** | `src/data/offers.ts`, `src/data/exchangePages/okx.ts` |
| Internal CTA route | `/go/okx/` | `src/data/exchangePages/okx.ts` |
| Advertised bonus | "Up to 5,000 USDT welcome package" — **global platform offer, not a KZ-verified value** | `src/data/exchanges.json`, `src/data/offers.ts` |
| Offer `restrictedCountries` | `[US, HK, SG, MY, CA, GB]` — **KZ is not listed** | `src/data/offers.ts` |
| Official restricted-services list | `https://www.okx.com/help/okx-services-not-available` | `src/data/exchange-intelligence/okx.json` |
| Offer verification | `status: verified`, `lastVerified: 2026-05-20` (verification of the **global offer**, not KZ eligibility) | `src/data/exchanges.json` |

**Interpretation guard.** The absence of KZ from OKX's offer/exchange restricted lists in this repository is an *implementation record of a global offer*, not proof that OKX serves Kazakhstan. The affiliate URL, promo code and CTA route are wiring facts; they say nothing about whether a Kazakhstan resident may register or claim.

### A.2 OKX Europe / MiCA (EU fact — not Kazakhstan)
`src/data/geoRankings.ts` records **OKX Europe Limited** holding a **MiCA CASP license (Malta MFSA, 2025-01-27)** passported across the EEA, with the note that the tracked bonus was verified on the global platform and EU bonus terms need separate verification. **This is an EU/EEA authorization fact only. It is not evidence of Kazakhstan legal availability, local authorization or technical reachability, and must not be carried into any KZ conclusion.**

### A.3 Production Kazakhstan GEO override (`src/data/geoRankings.ts` → `MANUAL_OVERRIDES.kazakhstan.okx`)
| Field | Value |
|---|---|
| `availability` | `unknown` |
| `bonusAvailability` | `unknown` |
| `restrictionNote` | "Kazakhstan is absent from OKX's Risk & Compliance Disclosure restricted-locations list (Section 3, captured 2026-07-03). No dedicated Kazakhstan support page, KZT currency page, or AFSA/AIFC license found. Not-restricted is a partial positive signal but not a confirmation." |
| `regulatorCautionNote` | "Kazakhstan's AIFC regulator (AFSA) publicly listed OKX among unlicensed digital asset platforms for Kazakhstan (warning of 2026-04-29). Availability is under review." |
| `evidenceUrl` | `https://www.okx.com/en-us/help/risk-compliance-disclosure` |
| `evidenceDate` | `2026-07-03` · `confidence: partial` |

The repository's DO-NOT-INVENT rule keeps `unknown` as `unknown`. Kazakhstan is **not ranking-ready** (`isCountryRankingReady` needs all rows verified and ≥4 available; only Bybit is available, Bitget is restricted, and four exchanges including OKX remain unknown), and the KZ page is publication-blocked via `config/geo/kazakhstan.json` (`homepage_eligible: false`, `publication_status: blocked_by_missing_evidence`).

### A.4 Legacy GEO passport (`research/geo/kazakhstan/exchanges/okx.json`)
`research_status: not_started`; every `availability.*` and `products.*` field `UNKNOWN`; `identity.legal_entity: null`; affiliate `/go/okx` + `CRYPTOBONUSW` with `link_status`/`code_status` `not_checked` and `geo_eligible: UNKNOWN`; all `scores` null; `status.cta: not_decided`, `index_eligible: false`. Ledger references: evidence `ev-kz-okx-terms-121`, `ev-kz-afsa-warning-003`; conflict `cf-kz-okx-terms-vs-regulator`; unknown claim `kz-okx-bonus-availability-004`; `last_checked_at: 2026-07-14`.

### A.5 Master queue item (`CBW_KAZAKHSTAN_EXCHANGE_EVIDENCE_RESEARCH_QUEUE_v1.json` → okx)
Priority `P0`, batch `KZ-P0-C`, `currentProductionAvailability: unknown`, `currentMiAvailability: CONFLICTING`, `discrepancyState: INCOMPARABLE`, `shadowOutcome: HOLD_CONFLICTING`, known conflict `cf-kz-okx-terms-vs-regulator`, `ownerReviewRequired: true`. Wave order is fixed: `bybit → mexc → okx`.

### A.6 Market-Intelligence state for OKX × KZ
**No MI records exist for OKX × Kazakhstan** — `data/market-intelligence/{cells,sources,linkages,provenance,conflicts,bindings}/by-country/kz/` contain only `bybit.json` and `mexc.json`. OKX has no cell, sources, linkages, provenance, conflicts or binding file. This intake creates **none** of them.

---

## B. Precedents (for calibration only, not for inference onto OKX)

| Dimension | KZ × Bybit (positive precedent) | KZ × MEXC (restrictive precedent) |
|---|---|---|
| `overallAvailability` | `AVAILABLE_WITH_LIMITS` | `RESTRICTED` |
| Anchor | Active AFSA/AIFC local license `AFSA-A-LA-2024-0027` | Own prohibited-jurisdiction terms + supporting AFSA unlicensed warning |
| `confidence` | `MEDIUM` | `HIGH` |
| Core products | spot / kzt_p2p `AVAILABLE`, others graded down | registration/KYC/spot/derivatives/margin `RESTRICTED` |
| `rankingEligibility` / `ctaEligibility` / `promoEligibility` | false / false / false | false / false / false |
| `liveVerificationState` | `NOT_LIVE_VERIFIED` | `NOT_LIVE_VERIFIED` |

**Both KZ precedents are ranking-, CTA- and promo-ineligible and not live-verified.** Bybit shows that even a locally-licensed, conditionally-available exchange stays out of ranking/CTA/promo pending offer verification; MEXC shows a high-confidence restricted outcome. OKX sits between these as **CONFLICTING/UNKNOWN** — neither precedent's verdict may be transferred to OKX. OKX must be researched on its own official evidence.

---

## C. Research facts to establish (Kazakhstan — open questions, not answered here)

1. **Legal/contracting entity** serving Kazakhstan users, and its terms/domain routing (the EU OKX Europe entity does not answer this).
2. **Registration eligibility** for Kazakhstan citizens, residents and foreign nationals resident in KZ; new-registration acceptance; minimum age; excluded segments.
3. **KYC** support and accepted Kazakhstan identity documents; proof-of-address; citizenship vs residence handling.
4. **Per-product availability** (spot, margin, derivatives, copy trading, earn/staking, mobile app, P2P, KZT P2P, direct KZT deposit/withdrawal, bank-card purchase) — not flattened into one answer.
5. **KZT fiat rails**: official P2P KZT support, USDT/KZT and other KZT markets, payment methods, direct KZT deposit/withdrawal, Kazakhstan-issued card support, provider/entity/jurisdiction restrictions.
6. **Fees and limits** relevant to Kazakhstan.
7. **Regulation**: current restricted/prohibited-location terms; AFSA/AIFC licensing or warning status and any public-register entry; the standing of `cf-kz-okx-terms-vs-regulator`. Distinguish **legal availability**, **local authorization** and **technical reachability**.
8. **Affiliate/referral compatibility** for Kazakhstan and the owning entity.
9. **Evidence conflicts, limitations, freshness and live-verification gaps.**

---

## D. Interpretation guardrails (must hold through Deep Research)

- A visible **KZT/P2P page** is a *product signal*, not proof of account or legal eligibility.
- An **AFSA warning** is a *regulatory signal*, not by itself proof of technical unavailability.
- **Not-restricted ≠ available.** Absence from a restricted list is a partial positive signal only.
- **Availability ≠ local authorization.** Do not infer AFSA/AIFC authorization from the ability to use the service.
- **Historical campaigns ≠ current eligibility.** Separate current official evidence from past promotions.
- **Repository routes/codes/bonus figures ≠ eligibility evidence.**
- Default `liveVerificationState` is **NOT_LIVE_VERIFIED** under NO-PROXY.

---

## E. Authorization state at intake

All of the following remain **false / NOT AUTHORIZED**: research conclusion, source-truth decision, staging import, canonical import, production change, production binding, ranking change, CTA change, promo change, affiliate route change, publication, schema change, legacy-GEO change, MIGRATION_5, deploy. This intake produces the seven tracked files and one external handoff ZIP only. The single authorized next step is the owner-gated Deep Research run **`CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002`**.
