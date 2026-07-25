# Independent Source Truth Review — OKX × Kazakhstan (P0-C)

- **Review task:** `CBW-KZ-OKX-P0-C-SOURCE-TRUTH-REVIEW-004`
- **Source research task:** `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1`
- **Governing issue:** #33 · **Evidence PR:** #32 · **Review PR:** #34
- **Reviewed evidence head:** `1b7b477fd2efa4783b42cb8435b6ba7837951585`
- **Reviewed at:** 2026-07-25 · **Role:** Independent adversarial Source Truth Reviewer

## Executive verdict

**`ACCEPT_WITH_CORRECTIONS_REQUIRED`.**

The eleven-file package is structurally sound, honestly qualified, and its headline conclusion — **`CONFLICTING` / `MEDIUM`** with import readiness **`BLOCKED` / `HOLD_CONFLICTING`** — is well founded and independently corroborated. It correctly separates *platform availability* from *local authorization* from *technical reachability*, and it does not overreach the AFSA warning into a claim of technical unavailability. It is accepted as a research record **subject to a small number of required corrections**, principally an overstated spot-trading status and a non-resolving KZT P2P citation. It is **not** clean enough for a bare `ACCEPT`, and nowhere near a `REJECT`: the factual backbone holds up under independent checking.

**No canonical import, production, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deployment is authorized by this review.**

## Package integrity result

**PASS (on canonical UTF-8/LF).**

- Exactly **11** files under `20-research-output/`; **9/9** JSON parse.
- All **10** hashed files match the manifest **byte size and SHA-256 exactly** when computed on canonical LF content (the stored git blobs).
- Unique IDs: sources **14**, claims **10**, conflicts **2**, products **13**, payment rails **4**.
- All source and claim cross-references resolve; **zero** dangling references.
- All authorization objects are **all-false** across `research-run.json`, `import-readiness.json`, `offer-eligibility-review.json` and `schema-normalization-notes.json`; `publicationSafeRewardClaim = false`.

> Note: on a Windows checkout with `core.autocrlf=true` the working-tree files are CRLF and therefore appear one byte-per-line larger than the manifest. This is a **local checkout artifact, not a package defect** — the canonical LF blobs match the manifest exactly. No evidence file was modified.

## Independent source checks (official-source-first, NO-PROXY, NO-TESTING)

| Cited source | Independent result |
|---|---|
| AFSA warning naming OKX (`src-afsa-warning`) | **Confirmed** — OKX is explicitly named among unlicensed digital-asset platforms (with HTX, Bitget, MEXC). The exact **2026-04-29 date was not independently visible** on the page at review time. |
| OKX Risk & Compliance Disclosure (`src-okx-risk`) | **Confirmed** — Kazakhstan is **absent** from both the full restricted list (Afghanistan, Canada, Cuba, Hong Kong, Iran, India, Japan, Malaysia, Nepal, North Korea, Syria, Crimea/Donetsk/Luhansk, parts of the US) and the conditional list (Australia, Bahamas, Brazil, Eritrea, Russia, South Korea, UK). |
| OKX KZT P2P surface (`src-okx-p2p-kzt`) | **Surface confirmed, cited URL 404.** `https://www.okx.com/p2p-markets/kzt/buy-usdt` returns **HTTP 404**; equivalent live surfaces exist (`/ru/p2p-markets/kzt/buy-usdt`, `/p2p-markets/kzt/sell-usdt`, `/p2p/express/kzt/…`) with active KZT-priced merchant offers. |

## Strongest supported findings

1. **Local authorization is `RESTRICTED`.** The AFSA warning naming OKX is real and directly on point; regulated P2P being confined to AIFC-licensed DATFs is a correctly-framed framework constraint. RESTRICTED on the local-authorization axis is the right call.
2. **A current KZT P2P surface genuinely exists** on OKX (independently confirmed), making it the strongest Kazakhstan-relevant *product* signal — while correctly **not** proving lawful eligibility.
3. **Kazakhstan is absent from OKX's restricted-locations disclosure** (independently confirmed), correctly treated as only a partial positive signal.
4. **Axis discipline is excellent:** platform availability, local authorization, technical reachability and offer eligibility are kept distinct, and the AFSA warning is explicitly *not* converted into technical blocking.
5. **Correct restraint** on KYC, margin, derivatives, copy trading, earn/staking, direct KZT fiat and card purchase — all left `UNKNOWN` where evidence is insufficient — and on offer eligibility (`UNKNOWN`, `publicationSafeRewardClaim=false`).

## Material weaknesses

1. **Spot is overstated.** `prod-spot = AVAILABLE_WITH_LIMITS` rests on absence-in-restricted-list + app-listing + a *negative* AFSA signal, with **no source directly evidencing Kazakhstan spot availability**. It is internally inconsistent to rate spot — which requires a registered, verified account — as *more* available than registration, which is `CONFLICTING`. Spot availability cannot exceed the registration gate.
2. **A decisive citation 404s.** The KZT P2P "strongest positive signal" is cited at a URL that currently returns HTTP 404. The surface exists elsewhere, so the claim survives, but the citation must be corrected.
3. **Weak negative on the register.** The "no obvious OKX/Aux Cayes on AFSA DASP pages" claim is a page observation, not an executed register search, yet is carried at MEDIUM confidence.
4. **P2P confidence conflation.** `HIGH` confidence is applied to P2P/KZT-P2P eligibility, whereas only *surface existence* is HIGH-confidence; lawful eligibility is MEDIUM given the retained conflict.
5. **`rail-crypto-transfer = AVAILABLE_WITH_LIMITS`** is a KZ-unscoped platform-model inference and would be better stated as `UNKNOWN` for a Kazakhstan-specific verdict (low operational stakes).

## Source-level concerns

- `src-okx-app` (app-availability) is a store signal only and must not be escalated into trading availability — yet it partly props the spot status.
- `src-okx-p2p-kzt` carries HIGH confidence on a non-resolving URL; correct the citation.
- `src-afsa-dasp-page1/2` support only an observational negative; treat as LOW.
- `src-afsa-warning` substance confirmed; the specific date should be qualified or re-cited to a dated source.

## Claim-level concerns

- `clm-kz-kzt-p2p-live` — SUPPORTED, but fix the 404 citation.
- `clm-kz-afsa-warning` — SUPPORTED; correctly not extended to technical unavailability; date unverified.
- `clm-kz-reviewed-register-pages-no-obvious-okx` — UNDERQUALIFIED; drop to LOW and do not lean on it for RESTRICTED (the warning independently carries RESTRICTED).
- `clm-kz-app-listed` — SUPPORTED but store-signal only; must not be transferred to spot.
- The remaining claims are supported and adequately limited.

## Conflict judgments

- **`cf-kz-okx-terms-vs-regulator`** — correctly **RETAINED-CONFLICTING** (`CONFLICTING` / `MEDIUM`). Platform vs local-authorization signals genuinely diverge; the axes are properly separated. Agree.
- **`cf-kz-kzt-p2p-surface-vs-licensed-datf-rule`** — correctly **RETAINED-CONFLICTING**; `AVAILABLE_WITH_LIMITS` for the surface is defensible, but soften confidence from `HIGH` to `MEDIUM` because lawful eligibility, not surface existence, is the operative question.

## Recommendation / confidence judgment

Concur with **`CONFLICTING` / `MEDIUM`** unchanged. The positive platform signals are real but non-dispositive; the AFSA local-authorization evidence is adverse but does not establish technical unavailability. `CONFLICTING` is the honest overall label and `MEDIUM` is the right confidence given the mixed, partly observational evidence. The required corrections do not move the overall result — if anything the spot downgrade *strengthens* the CONFLICTING framing.

## Import-readiness judgment

Concur with **`BLOCKED` / `HOLD_CONFLICTING`**. No decisive Kazakhstan-specific authorization exists; KYC and direct-fiat/card rails are unproven; the register negative is non-executed. The package is a research record only. Every readiness flag correctly remains false.

## Required corrections

1. Downgrade `prod-spot` from `AVAILABLE_WITH_LIMITS` to `CONFLICTING` (or `UNKNOWN`) so it cannot exceed the `CONFLICTING` registration gate; stop escalating app-listing / absence-in-restricted-list into spot availability.
2. Replace the non-resolving `src-okx-p2p-kzt` URL (`…/p2p-markets/kzt/buy-usdt`, HTTP 404) with a currently resolving OKX KZT P2P surface.
3. Reduce `clm-kz-reviewed-register-pages-no-obvious-okx` to `LOW` and mark it a non-executed observation.
4. Soften P2P / KZT-P2P eligibility confidence from `HIGH` to `MEDIUM` (surface existence may stay `HIGH`).
5. Downgrade `rail-crypto-transfer` to `UNKNOWN` for a KZ-specific verdict, or restate it as an explicitly non-KZ-scoped platform note.
6. Qualify the AFSA warning date (2026-04-29) as not independently re-confirmed, or cite a dated AFSA source.

## Unresolved limitations

- Exact AFSA warning date not independently confirmed at review time (OKX-named-as-unlicensed substance **was** confirmed).
- AFSA DASP register not searched with an executed query (original or review); the absence of an OKX/Aux Cayes entry is an observation, not a definitive negative.
- NO-TESTING / NO-PROXY: no logged-in KZ session, KYC attempt or transaction could confirm real per-product entitlement; all statuses remain `NOT_LIVE_VERIFIED`.
- The research run's self-disclosed inability to rehash two JSON *input* files is input-side only and does not affect output-package integrity (which passes on canonical LF).

## Authorization statement

This review grants **no** production or activation authorization of any kind. Acceptance as a research record does **not** authorize research import, staging import, canonical import, production change, production binding, ranking, CTA, promo, affiliate route change, publication, sitemap, indexability, MIGRATION_5 or deployment. Every authorization remains **false** and owner-gated.
