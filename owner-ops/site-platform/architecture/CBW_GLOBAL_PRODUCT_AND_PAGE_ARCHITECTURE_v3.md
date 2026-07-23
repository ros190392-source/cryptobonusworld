# CBW Global Product and Page Architecture — v3

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · 2026-07-23
- Status: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** (owner-approved committed architecture authority — initial architecture commit `a3dea7e451d046d5f01515bf085962f6f92a9fa7` on branch `feat/cbw-global-site-architecture-v3`; implementation and production remain separately unauthorized)
- Baseline: Unified Design Foundation v1 @ `ee01f3ca…` · **corrected by owner review 002: market-first × language-second URL architecture** (`/{countrySlug}/{languageCode}/…`; the earlier language-first model is rejected — see the SEO doc's Rejected Patterns section)
- Package: [../CBW_GLOBAL_SITE_ARCHITECTURE_PACKAGE_v3.json](../CBW_GLOBAL_SITE_ARCHITECTURE_PACKAGE_v3.json)
- Companions: country-visual · locale · seo · region · delivery · governance documents (same package)
- Defers to: `CBW_EXCHANGE_MARKET_INTELLIGENCE_BRAIN_v1` (canonical availability),
  `CBW_MI_GEO_RECONCILIATION_STANDARD_v1` (one truth record per pair),
  `CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1` (absolute), Unified Design Foundation v1
  (square-first identity · OfferSurface · section grammar).

## 1. Global product architecture

**CryptoBonusWorld is a global, multi-country, multi-language crypto exchange availability- and
bonus-intelligence platform.** Product promise: *for your country and in your language — which
exchanges genuinely work, which codes are genuinely eligible, what is genuinely restricted, with
dated evidence.* Three independent axes compose every experience:

- **Country axis** — factual: which market's availability/eligibility decisions render (MI-decided);
- **Language axis** — presentational: which locale the UI/content renders in (never implies country);
- **Visual axis** — each covered country receives an owner-approved CountryVisualProfile
  (masthead artwork, accents, motifs) in one consistent art style.

Differentiators: evidence-backed availability · honest never-padded rankings
(`affiliateInfluencesRanking: false`) · truthful restricted states with alternatives · one unified
premium design system · per-country visual identity without flag-spam or fabricated localism.

## 2. Information architecture

Clusters (per locale): **Exchange** (review = entity root → promo, exchange×country, comparisons) ·
**Country** (country page = hub → pairs, restricted/alternatives) · **Discovery** (homepage,
directory, comparison hub) · **Trust** (methodology/evidence, guides, legal). Navigation spine:
header (Exchanges · Promo Codes · How We Verify · country control · language switch) + footer.
Every commercial surface carries the RegionAvailabilityModule (region doc); every country surface
carries its CountryMasthead (country-visual doc).

## 3. Page families — complete block contracts (16 fields each)

Global contract rules (apply to all ten): First Screen Standard v1 absolute; canonical MI decisions
via approved adapters only (never staging/RECOVERED packages); RESTRICTED/UNKNOWN/UNDER_REVIEW/
CONFLICTING/STALE render zero commercial controls; country ≠ language everywhere (countryCode/countrySlug/languageCode/localeTag model — the URL prefix is derived, never a single locale variable); no IP-based hard redirects on SEO pages; market-first routes `/{countrySlug}/{languageCode}/…` per the SEO/hreflang doc (only matrix-supported pairs); country artwork per the
country-visual standard (textless, evergreen, promo/bonus/date-free).

### F1 · Homepage
| Field | Contract |
|---|---|
| Purpose | Country-resolved, locale-rendered front door: best eligible exchanges + codes now. |
| Search intent | "best crypto exchange (in {country})" / localized equivalents. |
| URL | `/` — **global** front door (platform-wide context, legacy EN). Market front doors are the market roots (F2): `/kz/ru/` · `/kz/kk/` · `/kz/en/`. |
| Country behavior | Resolver precedence (URL → manual → saved → IP → global); rows re-scope to resolved country; coverage-honest. |
| Locale behavior | Full UI + editorial translation; rankings/data identical across locales for the same country. |
| Country visual | Resolved-country masthead accent strip in hero (subtle); global default uses platform-neutral artwork. |
| First screen | Compact hero + country control + Top-3 eligible RANKING_ROWs desktop / Top-2 mobile, complete code+Copy+CTA per authorized row (56px header incl.). |
| Commercial gates | Only ranking-eligible rows monetized; promo/CTA per MI gates; never padded. |
| Blocks | Hero+country control · Top-10 ranking · verification band · country browser · popular reviews · guides · separated restricted/under-review · FAQ · conversion recap. |
| Bottom conversion | Compact recap of top eligible rows (permitted states only). |
| SEO | Brand + head terms; global cluster x-default → `/`; market-root clusters live under F2. |
| Schema | `Organization` + `WebSite/SearchAction` + `ItemList` (localized). |
| Internal links | Cluster roots: directory, top reviews, promo hub, countries, methodology. |
| Mobile | Two eligible rows fully commercial in first viewport; ≥44px targets; no overflow. |
| Restricted | Restricted exchanges only in the separated informational section. |
| Prohibited | IP hard-redirects · flag-grid browsing · restricted/unverified rows in ranking · oversized hero · padded lists. |

### F2 · Country / Market root (market homepage)
| Field | Contract |
|---|---|
| Purpose | **The market homepage and country verdict hub are ONE surface**: `/kz/ru/` (and language siblings) is the canonical Kazakhstan market root. A duplicate `/kz/ru/countries/kazakhstan/` is prohibited (incoming URLs of that shape 301 → `/kz/ru/`; never indexed). Global `/countries/` remains a directory of markets. |
| Search intent | "crypto exchanges in {country}" / localized. |
| URL | `/{countrySlug}/{languageCode}/` — e.g. `/kz/ru/` · `/kz/kk/` · `/kz/en/` · `/pl/pl/` · `/pl/uk/` · `/pl/ru/` · `/pl/en/` · `/de/de/` · `/de/en/` *(owner-gated; global hub `/countries/` live; pairs only from the MarketLanguageMatrix)* |
| Country behavior | URL pins the country (precedence rank 1); resolver suggestions link, never redirect; market root carries the full market ranking + verdict. |
| Locale behavior | Fully localized copy; identical facts per country across locales; locale switch preserves country. |
| Country visual | **Primary CountryVisualProfile surface:** country masthead (desktop/mobile artwork), accent palette on section kickers/chips; textless evergreen art. |
| First screen | Masthead band (compact) + country identity + evidence status + verdict + top eligible rows (3 desktop / 2 mobile, full controls when authorized). |
| Commercial gates | Country-verified eligibility only (G/MI gates); publication owner-gated per country. |
| Blocks | Masthead · verdict · recommended ranking · available-not-recommended · limited · under review · restricted · local payment rails · evidence summary · FAQ. |
| Bottom conversion | COMPACT_BOTTOM of leading eligible exchange or alternatives module. |
| SEO | Country head terms per locale; hreflang across locale variants of the same country. |
| Schema | `ItemList` + `FAQPage` + `BreadcrumbList`. |
| Internal links | Pair passports, reviews, restricted pages, methodology. |
| Mobile | Verdict + 2 rows in first-screen target; masthead compact (≤120px). |
| Restricted | Own dated section; never in ranking. |
| Prohibited | Publication before owner GO · global-as-local promos · coat-of-arms without rights review · artwork with text/promos. |

### F3 · Exchange Directory
| Field | Contract |
|---|---|
| Purpose | Browse/filter all covered exchanges with availability badges. |
| Search intent | "list of crypto exchanges" / localized. |
| URL | `/exchanges/` (global, live) · `/kz/ru/exchanges/` · `/kz/kk/exchanges/` · `/kz/en/exchanges/` (market) |
| Country behavior | Badges re-resolve per resolved country; availability filters. |
| Locale behavior | Localized chrome/labels; identical result set per country. |
| Country visual | Neutral platform surfaces; resolved-country name chip only (no artwork). |
| First screen | H1 + region context + search/filters + one featured eligible row when evidence allows. |
| Commercial gates | Compact code chip + CTA per eligible row; no forced featured offer. |
| Blocks | Filters · result rows (ROW_M tiles) · state legend · methodology link. |
| Bottom conversion | None forced. |
| SEO | Indexable hub; crawl spine to reviews; hreflang cluster. |
| Schema | `ItemList` + `BreadcrumbList`. |
| Internal links | All reviews, comparison hub, country pages. |
| Mobile | Filters collapse; codes copyable; one row per line. |
| Restricted | Clearly badged; zero claim controls; alternatives links. |
| Prohibited | Undistinguished states · promo hero displacing search. |

### F4 · Exchange Review (THREE_ZONE_FIRST_SCREEN)
| Field | Contract |
|---|---|
| Purpose | Canonical exchange entity page: full evaluation + authorized conversion. |
| Search intent | "{exchange} review / referral code" / localized. |
| URL | `/{exchange}/` (global-legacy, live) · market context: `/kz/ru/exchanges/bybit/` · `/kz/kk/exchanges/bybit/` · `/kz/en/exchanges/bybit/` — exchange slug identical everywhere |
| Country behavior | RegionAvailabilityModule renders resolved-country state; state swaps both offer blocks together. |
| Locale behavior | Localized editorial; facts identical per (exchange × country) across locales. |
| Country visual | None by default (exchange brand is the visual); resolved-country chip in the availability module. |
| First screen | Zone1 identity (square tile 132/108/92 + name below + state + trust) · Zone2 verdict+conversion (code+Copy 48–52px · CTA 48–52px · note) · Zone3 compact facts; mobile 8-item stack fully in viewport. |
| Commercial gates | Full standard state rules; promo/CTA per MI + offer registry gates. |
| Blocks | Trust strip · quick verdict · product availability · fees preview · pros/limitations · who it suits · security/verification · FAQ · COMPACT_BOTTOM. |
| Bottom conversion | Same-state OfferSurface COMPACT_BOTTOM. |
| SEO | Primary money terms per locale; hreflang across locale variants. |
| Schema | `Review/Product` + `FAQPage` + `BreadcrumbList`. |
| Internal links | Pair passports, promo page, comparisons, guides. |
| Mobile | Proven 8-item stack; facts card below. |
| Restricted | Red state + reason + evidence date + View Available Alternatives; zero commercial controls. |
| Prohibited | Unverified bonus claims · top/bottom drift · inaccessibility claims · wordmark-in-square identity. |

### F5 · Exchange × Country
| Field | Contract |
|---|---|
| Purpose | The '{exchange} in {country}' intent is **fulfilled by the market exchange page** (`/kz/{lang}/exchanges/{exchange}/` — pair facts inherent in the route). No competing deep-passport page exists for that intent. An optional `/kz/{lang}/exchanges/{exchange}/availability/` evidence subpage (distinct documentary purpose: full dated evidence/product matrix) may be owner-gated later. |
| Search intent | "{exchange} in {country} / legal in {country}" / localized. |
| URL | Primary: `/kz/{lang}/exchanges/{exchange}/` (= F4 market context). Optional evidence subpage: `/kz/{lang}/exchanges/{exchange}/availability/` *(owner-gated)*. The former `/{exchange}/{country}/` pattern is retired. |
| Country behavior | URL pins country; module shows pair state only. |
| Locale behavior | Localized presentation of identical canonical MI cell facts. |
| Country visual | Compact country accent chip/mini-masthead; exchange brand remains primary. |
| First screen | Pair identity + exact local state + local verdict + locally verified code/Copy/CTA or restriction presentation. |
| Commercial gates | Local evidence only; global never overrides local restriction. |
| Blocks | Local availability matrix · registration/KYC · payment rails · restriction evidence · alternatives · FAQ. |
| Bottom conversion | COMPACT_BOTTOM (eligible) or alternatives module. |
| SEO | Long-tail pair terms; per-pair publication GO; hreflang per locale variant. |
| Schema | `FAQPage` + `BreadcrumbList` (+ `Review` when warranted). |
| Internal links | Review root, country hub, alternatives, methodology. |
| Mobile | Local verdict + state-correct action first screen. |
| Restricted | Restriction-only presentation from MI cell (e.g. MEXC×KZ). |
| Prohibited | Staging data · competing availability record · thin doorway content. |

### F6 · Referral / Promo
| Field | Contract |
|---|---|
| Purpose | Direct answer: the code, eligibility, reward, how to apply. |
| Search intent | "{exchange} promo/referral code" / localized. |
| URL | `/promo-codes/{exchange}/` (global-legacy; hub live) · market: `/kz/ru/promo-codes/bybit/` · `/kz/kk/promo-codes/bybit/` · `/kz/en/promo-codes/bybit/` *(owner-gated)* |
| Country behavior | Code claimable only for verified-compatible resolved country; else Check Eligibility. |
| Locale behavior | Localized terms/conditions copy; identical offer facts. |
| Country visual | None (offer-first surface). |
| First screen | Exchange+scope · offer status · complete code+Copy+CTA · key condition · last-checked; no editorial wall. |
| Commercial gates | Offer registry + MI promo eligibility; unverified compat → no code + explicit statement. |
| Blocks | How to apply · reward structure · conditions · terms warnings · FAQ. |
| Bottom conversion | COMPACT_BOTTOM repeat. |
| SEO | Highest-conversion long-tail; hreflang cluster. |
| Schema | `FAQPage` + `BreadcrumbList` (+ `Offer` only verified-current). |
| Internal links | Review root, pair pages, comparisons. |
| Mobile | Code+CTA fully in first screen at all required viewports. |
| Restricted | No code/claim; alternatives action. |
| Prohibited | Expired-as-current · unverified maxima · claim language without verified compatibility. |

### F7 · Comparison
| Field | Contract |
|---|---|
| Purpose | Decide between exchanges in the user's market. |
| Search intent | "{a} vs {b}" / localized. |
| URL | `/compare/{a}-vs-{b}/` (global, live) · market: `/kz/ru/compare/bybit-vs-okx/` · `/kz/kk/compare/bybit-vs-okx/` · `/kz/en/compare/bybit-vs-okx/` |
| Country behavior | Both compared in the same resolved market; per-exchange state badges. |
| Locale behavior | Localized dimensions/verdict copy; identical data. |
| Country visual | None. |
| First screen | Both COMPARISON_CELL offers (CARD_L 76px, equal tile treatment) with complete controls per eligible cell. |
| Commercial gates | Winner monetized only if eligible; restricted never monetized nor favored. |
| Blocks | Verdict · dimension table · fees · products · per-exchange offers · FAQ. |
| Bottom conversion | COMPACT_BOTTOM of eligible winner only. |
| SEO | "vs" long-tail; hreflang cluster. |
| Schema | `FAQPage` + `ItemList(2)` + `BreadcrumbList`. |
| Internal links | Both reviews, both promo pages, directory. |
| Mobile | Cells stack; two compact offers first-screen target; table scrolls in container. |
| Restricted | Restricted column informational + alternatives link. |
| Prohibited | Monetized restricted winner · unequal tile scale · comparing different markets as equal. |

### F8 · Guide
| Field | Contract |
|---|---|
| Purpose | Task completion (buy, deposit, withdraw, P2P, KYC). |
| Search intent | "how to …" informational / localized. |
| URL | `/guides/{slug}/` (global, live) · market: `/kz/ru/guides/how-to-buy-usdt/` · `/kz/kk/guides/how-to-buy-usdt/` · `/kz/en/guides/how-to-buy-usdt/` — stable Latin slug |
| Country behavior | Embedded commercial module resolves country like any commercial surface; steps stay neutral. |
| Locale behavior | Fully translated steps; screenshots may remain EN with localized captions until localized capture exists. |
| Country visual | None. |
| First screen | Title + first useful step; commercial guides MAY carry one relevant eligible COMPACT offer. |
| Commercial gates | Module obeys full state rules; neutral guides never forced to show a code. |
| Blocks | Steps (separated) · screenshots · warnings · related guides. |
| Bottom conversion | Optional COMPACT_BOTTOM when task-relevant. |
| SEO | Informational cluster; hreflang cluster. |
| Schema | `HowTo` + `FAQPage` + `BreadcrumbList`. |
| Internal links | Relevant reviews/promos, methodology. |
| Mobile | Step 1 never displaced by conversion. |
| Restricted | No claim language for restricted exchanges anywhere. |
| Prohibited | Forced promos in neutral guides · commercial claims inside steps. |

### F9 · Restricted / Alternatives
| Field | Contract |
|---|---|
| Purpose | Why {exchange} is restricted in {country} + eligible alternatives. |
| Search intent | "{exchange} banned in {country}?" / localized. |
| URL | `/kz/ru/exchanges/mexc/alternatives/` · `/kz/kk/exchanges/mexc/alternatives/` · `/kz/en/exchanges/mexc/alternatives/` *(owner-gated; nested under the market exchange route)* |
| Country behavior | Country-pinned. |
| Locale behavior | Localized explanation of identical facts. |
| Country visual | Country accent chip only; restrained visual (informational surface). |
| First screen | Restricted identity (unrecolored tile) + red state + reason + evidence date + first eligible alternatives (3 desktop / 2 mobile). |
| Commercial gates | Conversion belongs exclusively to eligible alternatives. |
| Blocks | Dated restriction explanation · what it does/doesn't mean · full alternatives · FAQ. |
| Bottom conversion | Alternatives COMPACT offers. |
| SEO | Restriction long-tail; per-pair GO; hreflang cluster. |
| Schema | `FAQPage` + `ItemList` + `BreadcrumbList`. |
| Internal links | Pair page, country hub, alternative reviews. |
| Mobile | Reason + first alternative early; two alternatives first-screen target. |
| Restricted | The restricted exchange: zero commercial controls, no inaccessibility claims. |
| Prohibited | Any promo/registration control for the restricted exchange · alternatives without verified eligibility. |

### F10 · Methodology / Evidence
| Field | Contract |
|---|---|
| Purpose | Trust engine: evidence, states, rankings, rechecks. |
| Search intent | "is CBW trustworthy / how ranked" / localized. |
| URL | `/methodology/` (global platform trust page, live) · market: `/kz/{lang}/methodology/` with market-specific verification context (distinct intent, cross-linked, never duplicated copy) |
| Country behavior | None (explains the country system editorially). |
| Locale behavior | Fully translated. |
| Country visual | None. |
| First screen | H1 + trust statement + verification principles + last-updated. |
| Commercial gates | **None — zero conversion controls, ever.** |
| Blocks | Evidence tiers · decision states · refresh policy · conflict handling · editorial independence · affiliate disclosure link. |
| Bottom conversion | None; soft directory link permitted. |
| SEO | Trust/E-E-A-T anchor; hreflang cluster. |
| Schema | `WebPage/AboutPage` + `BreadcrumbList`. |
| Internal links | All cluster roots, legal. |
| Mobile | Readable article layout. |
| Restricted | n/a (explains it). |
| Prohibited | Forced conversion · commercial links blended into methodology claims. |

## 4. Rollout order (each wave owner-gated)

W1 Exchange Review V2 rollout (prototype approved → commit → more exchanges) · W2 Homepage V2 ·
W3 Country page + RegionAvailabilityModule + first CountryVisualProfile pilots (KZ/PL/DE — art
generation separately authorized) · W4 Directory + Referral/Promo · W5 Comparison + Exchange×Country
(needs MI pilot data) · W6 Restricted/Alternatives + Guides + Methodology · W7 Locale
infrastructure + Kazakhstan pairs (`/kz/ru/`·`/kz/kk/`·`/kz/en/`; market default ru) · W8 Poland pairs (`/pl/pl/`·`/pl/uk/`·`/pl/ru/`·`/pl/en/`; default pl) + Germany pairs (`/de/de/`·`/de/en/`; default de) + RTL readiness audit ·
W9 production migration waves per family (separately authorized).

## 5. Production migration plan

Per family: prototype (design branch, mock) → owner visual approval → committed authority →
data-binding task (approved MI adapters; no staging) → localization pass (locale doc workflow) →
production QA (CI gate matrix) → owner production GO → migrate live route → post-deploy live QA →
monitor. Existing production pages and the GEO-legacy data path stay frozen until their family/pair
GO (reconciliation standard; no silent migration). Locale rollout never forks facts: one canonical
data layer, N locale presentations.

## 6. Authorization flags

`ARCHITECTURE_DESIGN_AUTHORIZED: true` — all others false: `COUNTRY_ART_GENERATION_AUTHORIZED`,
`PAGE_IMPLEMENTATION_AUTHORIZED`, `PRODUCTION_ASSET_EXPORT_AUTHORIZED`,
`PRODUCTION_DATA_BINDING_AUTHORIZED`, `AFFILIATE_ACTIVATION_AUTHORIZED`,
`MERGE_TO_MASTER_AUTHORIZED`, `PUBLICATION_AUTHORIZED`, `DEPLOY_AUTHORIZED`.
