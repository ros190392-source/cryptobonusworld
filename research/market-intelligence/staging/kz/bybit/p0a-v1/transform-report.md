# CBW KZ × Bybit P0-A — Staging Import Transform Report

- Transform version: `kz-bybit-p0a-v1` · task `CBW-KZ-BYBIT-P0A-CANDIDATE-RESHAPE-002` · staging-only · deterministic · RECOVERED / UNVERIFIED
- Owner import-prep decision: `0fa0791b4a5255b662ed67cf6df6033ed53a55cd` · owner-review decision: `e084d64c36f68be01881b635e6202aea28165ca3`
- Normalized sources: **43** (39 original + 4 supplemental) · claim-source links: **77** · conflicts: **2** · corrections applied: **4**

## Reshape (owner-approved fixes applied)
- Candidate shape changed to **OPTION A** — top-level keys are exactly `candidateMetadata` + `cell`.
- `candidate.cell` conforms to the committed **exchange-market-cell.schema.json** contract (structural contract validation; `additionalProperties:false` respected — no staging metadata inside `cell`).
- Staging metadata (recordState / canonical / presentation / productStatusRationale / offerAmounts / provenance …) remains **outside** `cell`, in `candidateMetadata`.
- `productScope` arrays applied to normalized market-source records (single: **21**, multi: **18**, empty: **4**); derived from claim categories of SUPPORTS/LIMITS links only (CONTRADICTS/CONTEXT excluded).
- `claimType` remains **off** market-source records (optional field omitted; category lives in linkage).
- `updatedDate` policy unchanged: official verified page date only, else `null` (all 43 = `null`).
- Entity/domain routing remains **unflattened** (full routingMatrix stays in `normalized-conflicts` + `qa-provenance`; cell carries only status + reasonCodes + conflictIds).
- All **13** product statuses unchanged. Canonical import remains **blocked**.

## MI-cell candidate (non-production, OPTION A)
candidateMetadata.recordState `CANDIDATE` · canonical **false** · productionEligible **false** · migration5Authorized **false** · futureRankingCandidate **true**
cell.overallAvailability **AVAILABLE_WITH_LIMITS** · confidence **MEDIUM** · liveVerificationState **NOT_LIVE_VERIFIED**
cell.rankingEligibility **false** · ctaEligibility **false** · promoEligibility **false**
Presentation (candidateMetadata): primary **GREEN** "Available" + secondary **AMBER** "Some limits apply".

### Product statuses (kept separate; never flattened into overall)
- `registration`: **AVAILABLE_WITH_LIMITS** — Local bybit.kz registration confirmed; residency/citizenship scope partially resolved (cf-kz-bybit-001).
- `kyc`: **AVAILABLE_WITH_LIMITS** — Mandatory KYC confirmed; accepted-document scope differs (individual vs business).
- `spot`: **AVAILABLE** — Spot confirmed on local bybit.kz materials.
- `derivatives`: **AVAILABLE_WITH_LIMITS** — Perps/expiry/options confirmed; user-level KYC/region conditions apply.
- `margin`: **AVAILABLE_WITH_LIMITS** — Documented with risk-tier limits (cross/portfolio; not isolated for spot margin).
- `p2p`: **AVAILABLE_WITH_LIMITS** — Available but KYC-required — more conservative than ECF AVAILABLE (identity-verification limit).
- `kzt_p2p`: **AVAILABLE** — Dedicated KZT P2P market page confirmed.
- `direct_kzt_deposit`: **AVAILABLE_WITH_LIMITS** — KZT bank transfer supported but identity-bound (IIN/BIN match, no third-party) — conservative vs ECF AVAILABLE.
- `direct_kzt_withdrawal`: **AVAILABLE_WITH_LIMITS** — KZT bank transfer/IBAN supported but identity-bound — conservative vs ECF AVAILABLE.
- `bank_card_purchase`: **CONFLICTING** — bybit.kz vs bybit.com routing unresolved (cf-kz-bybit-002) — CONFLICTING.
- `bybit_card`: **AVAILABLE_WITH_LIMITS** — Local AIFC card docs exist with supported-country/eligibility limits.
- `referral`: **UNKNOWN** — Referral-code entry exists but global-code compatibility UNVERIFIED (clm-kz-bybit-offer-001).
- `promotions`: **AVAILABLE_WITH_LIMITS** — Local promo programs exist but campaign-specific eligibility; amounts kept separate; no CTA/promo.

### Offer amounts (kept separate; not a global maximum; no CTA/promo)
- local referral: up to **1,032 USDT** · Kazakhstan campaign prize pool: **2,500 USDT** · combined: **false**

## Conflicts (preserved, never auto-resolved)
- `cf-kz-bybit-001`: **PARTIALLY_RESOLVED** — Registration scope conflict between the Bybit Kazakhstan registration guide and the later official foreign-nationals announcement.
- `cf-kz-bybit-002`: **PARTIALLY_RESOLVED** — Official local and global Bybit pages coexist for Kazakhstan-related services, creating unresolved product-routing ambiguity.

## Corrections applied (owner-approved)
- `clm-kz-bybit-entity-003`: Core Bybit Limited entity applies to the local trading platform, not automatically to every ancillary bybit.kz program.
- `clm-kz-bybit-registration-002`: Resident-only wording is incomplete without the newer foreign-national announcement and conflict note.
- `clm-kz-bybit-offer-001`: Referral-code entry exists, but global-code compatibility with Bybit Kazakhstan remains unverified.
- `clm-kz-bybit-offer-002`: Replace the old "no local amount verified" claim: two separate local programs exist (up to 1,032 USDT local referral; separate 2,500 USDT Kazakhstan campaign prize pool). Never combine; never treat as global advertised maximum; never authorize CTA/promo.

## Generated staging file hashes
- `normalized-sources.json`: 28605 B · sha256 `4e92ba9cc513deeaf6548a6ab424e8f3f627721c7f4c177bf63855837113c5ab`
- `claim-source-links.json`: 23279 B · sha256 `3fe1326e1cbc02fe8afc30eb773fcad3d3a2ff924a216d734a0e22b1ff69bb0e`
- `qa-provenance.json`: 40159 B · sha256 `e84364d8f643360629b1c4111b9229f02ccd00f4e2849238e038322b51f1ee1d`
- `normalized-conflicts.json`: 11416 B · sha256 `4cb0f43cbedaa18684e8b339f827c5eefe4db24311e78ec92955c35c782535e3`
- `exchange-market-cell.candidate.json`: 5322 B · sha256 `04c8d7d9e2efabab80d279d1855429d9c85044ce8000e99b359d9ff07e6b2bac`

## Authorizations (all withheld)
import / canonical record / MI cell / ranking / CTA / promo / production change / MIGRATION_5 — **all false**. Staging only.

