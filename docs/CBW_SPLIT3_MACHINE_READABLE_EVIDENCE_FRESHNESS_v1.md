# CBW Split 3 (P0) — Machine-Readable Evidence Freshness (v1)

Branch: `feat/cbw-split3-machine-readable-evidence-freshness-002`
Governing issue: #250 · Spec: `docs/tasks/CBW_SPLIT3_P0_MACHINE_READABLE_EVIDENCE_FRESHNESS_002.md`
Base: `master` @ `8b2d90bc` (PR #249 merged)
Status: implemented; Draft PR open; **not merged**; **not deployed**; `PUBLIC_MARKET_PROFILES` **empty**; `PUBLIC_CBW_CTA_MODE` **untouched** (fail-closed to preview).

## Problem

Real offer/homepage records carried human freshness strings — `lastChecked: "June 2026"`,
`"May 2026"`, `"July 2026"`, `"Recheck in progress"`. These are presentation/editorial
text, not deterministic timestamps, and must never authorize freshness, publication,
MarketProfile creation, or a commercial CTA. There was no single machine-readable
freshness source.

## What changed

### New canonical contract — `src/data/contracts/evidenceMetadata.ts`

One factual freshness source. `EvidenceMetadata = { evidenceCheckedAt, nextReviewAt,
sourceUrl, sourceId?, exchangeId? }`.

- **`isExactIsoDateTime`** — accepts only an exact ISO-8601 datetime with an explicit
  timezone (`Z` or numeric `±HH:MM`), and requires it to parse to a single UTC epoch.
  Rejects date-only (`2026-07-31`), timezone-less (`2026-07-31T00:00:00`), and malformed
  input. Date-only is **never** silently coerced to midnight-UTC — that would fabricate
  precision the repository does not have.
- **`validateEvidenceMetadata`** — fail-closed: exact timestamps required, HTTPS
  `sourceUrl` required, `nextReviewAt` strictly after `evidenceCheckedAt`. A parent
  record's `status: verified` can never substitute for this.
- **`assessEvidenceAuthorization(meta, now, policy?)`** — deterministic live decision:
  requires a finite clock, valid metadata, **fresh** evidence via the ONE central policy
  (`EVIDENCE_FRESHNESS_POLICY`, reused — thresholds are not duplicated), and `now <
  nextReviewAt` (review not overdue). Returns `{ authoritative, freshness, reviewState,
  reason }`.
- **`formatEvidenceCheckedAt` / `deriveCheckedDisplay`** — derive the visible date from
  the exact timestamp. Locale changes only the formatting (`en-GB` / `ru-RU` / `kk-KZ`
  via `Intl`, `UTC` time zone); it never changes the instant, freshness state, or any
  decision. With no valid metadata the display is `null` and the state is `none` — the UI
  then shows an honest under-review label rather than a fabricated date.
- **`toMarketProfileTimestamps`** — the future-MarketProfile adapter (see below).

### Real record migration

`Offer` and `HomepageTop10Entry` gain an `evidence?: EvidenceMetadata | null` field — the
sole factual freshness source. `lastChecked` is retained but explicitly re-scoped in its
doc-comment to **editorial/presentation text only**; a live decision reads `evidence`,
never the string.

The homepage disclosure now derives its visible "Checked" date from
`deriveCheckedDisplay(entry.evidence, Date.now(), locale)` and emits semantic
`<time datetime="…">` only when a real machine timestamp exists. The raw human month
strings are no longer rendered as factual checked dates.

### Records migrated with exact machine evidence

**None.** The repository does not currently hold an exact, timezone-qualified ISO
timestamp for any offer. The evidence files (`src/data/evidence/*.json`) carry only
**date-only** `lastChecked` values (e.g. `2026-06-26`), which fail the exact-timestamp
bar by design and must not be upgraded to a precise instant without fabrication.

### Records intentionally left under re-verification (`evidence: null`)

All six real offers and all four non-live homepage rows — none had repository-supported
exact evidence:

| Record | Human string (editorial only) | Machine evidence |
|---|---|---|
| offer `bybit` (verified) | `June 2026` | `null` — under re-verification |
| offer `mexc` (public-preview) | `June 2026` | `null` |
| offer `bitget` (verified) | `June 2026` | `null` |
| offer `okx` (verified) | `June 2026` | `null` |
| offer `kucoin` (public-preview) | `May 2026` | `null` |
| offer `bingx` (public-preview) | `June 2026` | `null` |
| homepage `binance` (research) | `July 2026` | `null` |
| homepage `gate-io` / `htx` / `phemex` (review) | `Recheck in progress` | `null` |

This is the honest, fail-closed outcome: every non-expired record either carries exact
validated metadata **or** is explicitly incapable of authorizing freshness.

## Future MarketProfile adapter (documented mapping)

`toMarketProfileTimestamps(evidence)` is the ONLY sanctioned path from real evidence
metadata to a future `MarketProfile.lastCheckedAt` / `nextReviewAt`:

```
EvidenceMetadata.evidenceCheckedAt  → MarketProfile.lastCheckedAt
EvidenceMetadata.nextReviewAt       → MarketProfile.nextReviewAt
```

It accepts nothing but fully validated exact metadata — display strings, date-only
values, timezone-less datetimes and missing provenance are all rejected. **This task adds
nothing to `PUBLIC_MARKET_PROFILES`;** the adapter merely proves that when approved
profiles are created later, their timestamps can only originate from exact validated
evidence, never from a human freshness string.

## Public behaviour (unchanged — fail-closed)

- Preview homepage: **0** `/go/*`.
- Production simulation (`PUBLIC_CBW_CTA_MODE=production`): **0** `/go/*` (empty registry).
- No fabricated "Checked:" date is rendered; disclosure tone labels carry the honest state.
- Positive live paths are demonstrated **only** with explicit test-only synthetic
  evidence/profiles injected into the resolver (never public data).

## Verification (all green)

```
npm run portal:contracts:test        # 245 passed, 0 failed   (216 baseline + 29 evidence cases)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope)        # exit 0
npm run build                        # 109 pages
npm run build (preview)              # homepage 0 /go/
PUBLIC_CBW_CTA_MODE=production build  # homepage 0 /go/ (simulation only)
Chromium homepage QA                 # 28/28 (preview + production-sim × desktop/mobile, keyboard)
```

The required 24-case matrix is covered under the `evi/*` test names (exact UTC / offset
accepted; date-only / timezone-less / malformed / missing rejected; non-finite clock;
future-beyond-skew; stale; central boundary; review-window and overdue; `June 2026` and
`Recheck in progress` cannot authorize; verified-without-evidence cannot go live;
non-HTTPS source fails closed; derived display; en/ru/kk formatting differs while facts
are identical; preview and production `/go/`=0; test-only adapter→profile live path;
`PUBLIC_MARKET_PROFILES` empty).

## Not authorized / not performed

No merge, no deploy, no Cloudflare production publication, no environment/secret change,
`PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` still empty, no affiliate
destinations modified, no timestamps fabricated from month-only strings, no owner-authored
files committed or deleted.

## Remaining blockers (later tasks)

- Capture exact, timezone-qualified evidence timestamps + HTTPS provenance for real
  offers so records can move from re-verification to machine-backed.
- Evidence-backed population of approved Exchange × Country MarketProfiles (via the
  adapter).
- Migration of legacy exchange/directory/promo CTA surfaces to this contract.
- Real localized per-country homepage routes.
- Production activation / deployment (owner action).
