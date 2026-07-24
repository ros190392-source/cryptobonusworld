# CBW KZ × MEXC P0-B — Canonical Paths Owner Decision (v1)

- **Decision ID:** `CBW-KZ-MEXC-P0B-CANONICAL-PATHS-OWNER-DECISION-v1`
- **Task:** `CBW-KZ-MEXC-P0-B-CANONICAL-OWNER-DECISIONS-007A` · **Issue:** #13 · **Resolver:** #10
- **Baseline HEAD:** `a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1`
- **Mode:** ARCHITECTURE_DECISION_RECORD_ONLY · **Status:** OWNER_APPROVED_ARCHITECTURE_DECISION
- **Country/Exchange/Batch:** KZ / mexc / KZ-P0-B · **Package:** RECOVERED / UNVERIFIED

## Scope

Approves the **canonical storage architecture** for the KZ × MEXC P0-B market-intelligence package, mirroring the approved KZ × Bybit P0-A canonical-paths precedent. This record creates **no** file under `data/market-intelligence/` and authorizes **no** canonical write. Path approval does not authorize file creation.

## Approved atomic six-file package (future — not created here)

Convention: `data/market-intelligence/{category}/by-country/{country-code-lowercase}/{exchange-slug}.json`

| Category | Path | Shape |
| --- | --- | --- |
| cell | `data/market-intelligence/cells/by-country/kz/mexc.json` | bare `exchange-market-cell.schema.json` instance (drop `candidateMetadata`) |
| sources | `data/market-intelligence/sources/by-country/kz/mexc.json` | envelope `{schemaVersion,countryCode,exchangeId,records[16]}`, each vs `market-source.schema.json` |
| linkages | `data/market-intelligence/linkages/by-country/kz/mexc.json` | envelope `{…,links[55]}` (41 SUPPORTS / 14 CONTRADICTS) |
| provenance | `data/market-intelligence/provenance/by-country/kz/mexc.json` | non-runtime evidence; preserves RECOVERED/UNVERIFIED, hashes, commits, owner refs |
| conflicts | `data/market-intelligence/conflicts/by-country/kz/mexc.json` | envelope `{…,conflicts[7]}`, all `ownerReviewRequired` |
| binding | `data/market-intelligence/bindings/by-country/kz/mexc.json` | non-active `mi-geo-binding.schema.json` instance |

Rules: atomic all-six-or-none; first write only, no overwrite; no duplicate under `cells/by-exchange/**`; no generated index in this phase; non-production research storage only; no runtime consumer reads these paths automatically.

## No-duplicate-truth

- Canonical MI truth: `data/market-intelligence/cells/by-country/**`
- Staging evidence: `research/market-intelligence/staging/**`
- Legacy GEO production truth: `research/geo/kazakhstan/exchanges/mexc.json` (consumed via `src/data/geoRankings.ts`)
- No automatic synchronization; no silent overwrite of legacy GEO; discrepancies require explicit migration reports + owner decisions.

## Authorization boundary (all withheld / false)

canonical import execution · binding write · binding activation · production change · legacy-GEO replacement · publication · ranking / CTA / promo / affiliate activation · MIGRATION_5 · deploy.

## Next task

`CBW-KZ-MEXC-P0-B-CANONICAL-WRITE-AUTHORIZATION-007B` — owner authorization for the future deterministic atomic six-file write (still no production/activation).
