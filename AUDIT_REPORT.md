# Site Audit Report — audit-fixes-fable5-20260702

Date: 2026-07-02 · Branch: `audit-fixes-fable5-20260702` (from `master` @ a560a87)
Scope: build, TS, routes, links, assets, mobile, SEO, affiliate integrity, schema, consistency.
Constraint: **no deploy**, no secret/content/promo-code changes, safe fixes only.

## Baseline checks (before fixes)

| Check | Result |
|---|---|
| `npm run build` | ✅ 227 pages, 0 errors |
| `astro check` (typecheck) | see "Checks after fixes" section |
| `scripts/audit-affiliate-links.mjs` | ✅ PASSED — 0 critical, 16 warnings (hardcoded official-docs URLs, prototypes) |
| `scripts/audit-schema.mjs` | ✅ 636 JSON-LD blocks, 0 errors, 1 warning |
| `scripts/audit-seo-titles.mjs` | 🔴 1 CI-fail (homepage title 83 chars), 1 error, 10 warnings |
| `scripts/audit-internal-links.mjs` | 21 "broken links" (all false positive, see P2-1), 13 duplicate canonicals, 17 orphans |

## P0 — severe SEO / production integrity

### P0-1. Live money pages missing from sitemap; legacy duplicates + noindex page inside sitemap
- `src/pages/sitemap.xml.ts:81-85`: `richExchangePages` contained only `/bybit/`, `/mexc/`, `/okx/` — the live pages `/bitget/`, `/kucoin/`, `/bingx/` were **absent from the sitemap**.
- Same file, `exchangePages` (line 91): emits legacy `/exchanges/{slug}/` for **all** exchanges at priority 0.90 — including `/exchanges/bybit/`, which is a **noindex** redirect stub. This violates the rule stated in the file itself (lines 71-72: "noindexed pages must NOT appear in the sitemap").
- **Fix applied:** added the 3 missing live pages to `richExchangePages`; filtered the 6 live-promo slugs out of the legacy `exchangePages` sitemap entries. **Status: FIXED**

### P0-2. Duplicate content: legacy `/exchanges/{slug}/` pages compete with live money pages
- Only bybit had a noindex + canonical + meta-refresh stub (`src/pages/exchanges/bybit/index.astro`). The legacy engine (`src/pages/exchanges/[slug].astro`) still generated **full, self-canonical** pages at `/exchanges/mexc/`, `/exchanges/okx/`, `/exchanges/bitget/`, `/exchanges/kucoin/`, `/exchanges/bingx/` — three competing versions of the same offer (live page, legacy page, sitemap entry).
- Confirmed via built output: `dist` had self-canonical `/exchanges/mexc|okx|bitget|kucoin|bingx/`.
- **Fix applied:** created 5 redirect stubs mirroring the proven bybit pattern (noindex,follow + canonical → live page + `0;url` meta refresh). Static file routes override the dynamic `[slug].astro` route (verified for bybit in dist before, and for all 6 after rebuild). **Status: FIXED**

### P0-3. Homepage `<title>` fails the repo's own SEO CI gate
- `src/pages/index.astro:87` — title was 83 chars (`seo:check` CI-fail threshold is >80): `"Crypto Referral Codes & Exchange Bonus Codes 2026 — Verified | CryptoBonusWorld"`.
- **Fix applied:** shortened to `"Crypto Exchange Referral & Bonus Codes 2026 | CryptoBonusWorld"` (63 chars — same keywords, drops the redundant "Verified" which remains in the meta description). **Status: FIXED**

## P1 — UX / metadata / hygiene

### P1-1. Legacy footer "Top Exchanges" links bypass the live money pages
- `src/components/Footer.astro:55-60` (used by legacy `Layout.astro` on ~200 pages) linked bybit/okx/mexc/bitget/kucoin to legacy `/exchanges/{slug}/` pages instead of the live `/{slug}/` pages. Not 404s (legacy pages exist), but they funnel internal link equity to pages that are now noindex redirects.
- **Fix applied:** retargeted those 5 links to `/bybit/`, `/okx/`, `/mexc/`, `/bitget/`, `/kucoin/`. Binance and Coinbase links left as-is (no live pages exist for them). **Status: FIXED**

### P1-2. Homepage og:image is Bybit-specific
- `src/pages/index.astro:89` — `ogImage="/media/exchanges/bybit/final/bybit-og-final-v3-1200x630.jpg"`: sharing the homepage anywhere showed a Bybit product card.
- **Fix applied:** switched to the site-generic `/og-default.png` (already used as the legacy-layout default; file exists in `public/`). **Status: FIXED**

### P1-3. `.gitignore` gaps for working artifacts
- Untracked junk in repo root (`_tmp_*.b64`, `_tmp_*.json`, `archive/`, `inbox/`, `qa-screenshots/`, `binance-ready/`, `public/_visual-review/`) is not ignored — one careless `git add` away from being committed (standing project rule forbids staging reports/scripts/tmp).
- **Fix applied:** added targeted `.gitignore` entries for the paths above. `evidence/` (21 tracked files), `incoming/` (3 tracked files), and `scripts/_*.mjs` (2 tracked helpers) were deliberately **not** ignored — those directories contain intentionally tracked files, and a blanket ignore would silently swallow future legit additions; noted with a comment in `.gitignore`. **Status: FIXED (narrowed)**

### P1-4. `public/_visual-review/` (internal design-review artifacts) ships to production
- Deployed as orphan, crawlable-but-unlinked pages. Meta protection unknown; disclosure risk is low but nonzero.
- **Not auto-fixed** (removing it changes what's live on the server and today's rules say no deploy; deleting local files is destructive to review material). Now `.gitignore`d; **recommend owner decision**: move out of `public/` in a normal deploy task. **Status: DOCUMENTED**

## P2 — polish / documented only (no changes)

1. **Link-audit false positive:** all 21 "broken internal links" are `/favicons/site.webmanifest/` — the file exists in `public/` and `dist/`; `scripts/audit-internal-links.mjs` appends a trailing slash and only resolves HTML routes. Fix the script when convenient.
2. **Duplicate component:** `src/components/PromoCodeBox.astro` vs `src/components/promo/PromoCodeBox.astro` — consolidate after checking imports.
3. `/exchanges/binance/` title is 72 chars (error zone); Binance page pending owner content work — left alone.
4. **robots.txt** does not disallow `/preview/` or `/prototype/` — intentionally NOT changed: those pages carry `noindex` meta, and blocking crawl would hide the noindex from Google. Current setup is the correct one.
5. **Two footer systems** (`Footer.astro` for legacy Layout, `SiteFooter.astro` for CleanLayout) — known architectural split; reconciliation is a design decision, out of scope for a safe pass.
6. `master` is **54 commits ahead of origin/master** (unpushed). Push when the owner wants the remote synced.
7. Site domain hardcoded in ~60 files — works, but a single config constant would prevent future drift.
8. Known owner-locked data notes (NOT touched, per standing instructions): Binance promo-code mismatch (exchanges.json `CRYPTOBONW` vs affiliate-snapshot `CRYPTOBONUSW`); BingX `promoCode: ""` in exchanges.json (display code `CRYPTOBW` is correct everywhere user-facing).

## Affiliate integrity (verified clean)
- All 6 live exchanges: displayed codes match the canonical set (Bybit/OKX `CRYPTOBONUSW`, MEXC `mexc-CryptoBonus`, Bitget `CryptoBonW`, KuCoin `CRYPTOBONW`, BingX `CRYPTOBW`).
- All CTAs route through `/go/{slug}` (client-side redirect page, noindex, robots-blocked, analytics event before redirect). No raw affiliate URLs in user-facing CTAs.
- No promo code, affiliate URL, or `/go/` route was modified in this pass.

## Accessibility / visual consistency (spot-audited)
- Key templates (homepage, ExchangeCard, ExchangePromoPage, header/footer): single `h1`, alt text present, aria-labels on icon buttons, `aria-expanded` on mobile menu. No blocking issues.
- Mobile spot-check after fixes: see "Checks after fixes".

## Files changed
- `src/pages/sitemap.xml.ts` — add 3 live pages; exclude 6 live slugs from legacy sitemap entries
- `src/pages/exchanges/mexc/index.astro` — new redirect stub (bybit pattern)
- `src/pages/exchanges/okx/index.astro` — new redirect stub
- `src/pages/exchanges/bitget/index.astro` — new redirect stub
- `src/pages/exchanges/kucoin/index.astro` — new redirect stub
- `src/pages/exchanges/bingx/index.astro` — new redirect stub
- `src/pages/index.astro` — title ≤80-char CI gate; generic og:image
- `src/components/Footer.astro` — 5 footer links → live money pages
- `.gitignore` — artifact/junk path coverage
- `AUDIT_REPORT.md` — this report

## Checks after fixes

| Check | Result |
|---|---|
| `npm run build` | ✅ 227 pages, 0 errors (29.8s) |
| Typecheck | ⚠️ Not configured in this repo: no `check` script and `@astrojs/check` is not installed (`npx astro check` hangs on its install prompt). Not added — installing a new devDependency is out of scope for a safe pass. The Astro build compiles every `.ts`/`.astro` file and passed. |
| `audit-seo-titles.mjs` | ✅ **CI Fail: 0** (was 1). 1 error remains: `/exchanges/binance/` 72 chars (P2, owner-pending Binance work). |
| `audit-schema.mjs` | ✅ 0 errors. 6 warnings = the 6 noindex redirect stubs have no BreadcrumbList — correct for redirect pages (bybit's stub already warned before this pass). |
| `audit-affiliate-links.mjs` | ✅ PASSED, 0 critical (unchanged). |
| `audit-internal-links.mjs` | 21 "broken" = webmanifest false positive (P2-1, unchanged). 13 duplicate canonicals = intentional alias groups (`/go/`, stubs, `/bonus-codes/` → canonical target). |
| Built-output verification | ✅ Sitemap: all 6 live pages present once, 0 legacy `/exchanges/{live-slug}/` entries. All 5 new stubs emit `noindex, follow` + canonical + refresh. Homepage title 63 chars, og:image `/og-default.png`. Footer on legacy pages links `/bybit/ /okx/ /mexc/ /bitget/ /kucoin/`. |
| Mobile spot-check (375px, built site via preview server) | ✅ 0px horizontal overflow on `/`, `/exchanges/`, `/promo-codes/`, `/exchanges/gate-io/` (legacy template), `/countries/germany/`. Stub redirect verified live in browser: `/exchanges/mexc/` → lands on `/mexc/`, page renders correctly. |

## What remains (not fixed, needs owner decision or separate task)
1. `public/_visual-review/` still ships to production (P1-4) — remove in a normal deploy task.
2. `/exchanges/binance/` title 72 chars — fold into the pending Binance page work.
3. Link-audit script trailing-slash false positive on `/favicons/site.webmanifest`.
4. Duplicate `PromoCodeBox.astro` copies; two-footer architecture split.
5. `master` 54 commits ahead of `origin/master` — push when desired.
6. Owner-locked data: Binance promo-code mismatch; BingX `promoCode: ""` in exchanges.json.
7. **Nothing from this branch is deployed** — production is unchanged. Note: the previously QA-passed "exchanges directory v2" was committed to `master` (a560a87) at the start of this session and is also **not deployed yet**.
