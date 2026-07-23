# CBW Global SEO, Routing and Hreflang Architecture — v1 (owner-corrected: market-first)

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner reviews 002
  (market-first) and 003 (extensible matrix; per-market defaults and x-default) · 2026-07-23
- Status: **ARCHITECTURE_V3_DRAFT_FOR_OWNER_REVIEW** (documentation only)
- Companion: [CBW_GLOBAL_SEO_ROUTING_AND_HREFLANG_ARCHITECTURE_v1.json](CBW_GLOBAL_SEO_ROUTING_AND_HREFLANG_ARCHITECTURE_v1.json)

## 0. REJECTED PATTERNS (owner review 002)

The original language-first model — e.g. `/ru/countries/kazakhstan/`, `/kk/countries/kazakhstan/`,
`/{locale}/{page}` prefixes — is **rejected** and appears in this package only inside this section.
The approved model is **market-first, language-second**.

## 1. URL model — market-first × language-second

**Public market-localized pattern:** `/{countrySlugLower}/{languageCodeLower}/...`

```
/kz/ru/                      /kz/kk/                      /kz/en/
/kz/ru/exchanges/            /kz/ru/exchanges/bybit/      /kz/en/exchanges/bybit/
/kz/ru/compare/bybit-vs-okx/ /kz/kk/compare/bybit-vs-okx/ /kz/en/compare/bybit-vs-okx/
/kz/ru/guides/how-to-buy-usdt/                            /kz/kk/guides/how-to-buy-usdt/
/kz/ru/promo-codes/bybit/    /kz/kk/promo-codes/bybit/    /kz/en/promo-codes/bybit/
/kz/ru/exchanges/bybit/alternatives/  ·  /kz/ru/exchanges/mexc/alternatives/
/pl/pl/  /pl/uk/  /pl/ru/  /pl/en/  ·  /de/de/  /de/en/
/pl/uk/exchanges/bybit/  /pl/ru/compare/bybit-vs-okx/  /pl/uk/promo-codes/bybit/
/pl/pl/guides/{stable-slug}/  /pl/uk/exchanges/{exchange}/alternatives/  /pl/ru/methodology/
```

Rules: country segment = lowercase ISO country slug (`kz`, `pl`, `de`); language segment =
lowercase ISO 639-1 language code (**Kazakh = `kk`, never `kz` — `/kz/kz/` is forbidden; Ukrainian
= `uk`, never `ua`**); stable
Latin content slugs identical across all market-language variants (never translated/transliterated);
lowercase-hyphen; trailing-slash canonical; no query-parameter content routes; only market-language
pairs in the locale availability matrix may have routes (no Cartesian product); all new market
routes are owner-gated before creation. `/go/{exchange}` stays global and never indexable;
`/__design/**` stays noindex/sitemap-absent.

## 2. Core data model (no single authoritative locale variable)

```
countryCode: "KZ"          countrySlug: "kz"
languageCode: "ru" | "kk" | "en"
localeTag: "ru-KZ" | "kk-KZ" | "en-KZ"      (BCP 47; html lang + hreflang value)
urlPrefix: "kz/ru" | "kz/kk" | "kz/en"      (derived, never stored as one authoritative field)
```
Country and language are separate fields end-to-end; the public prefix is derived, never parsed
back into a single "locale" variable; country never inferred from language and vice-versa; country
selects factual MI, language selects presentation only.

## 3. Global / legacy routes and their relationship

Current non-prefixed English routes (`/`, `/exchanges/`, `/bybit/`, `/compare/bybit-vs-okx/`,
`/guides/{slug}/`, `/methodology/`) are **preserved as global/legacy English pages** until a
separately authorized production-routing migration. Contract:

- **Global pages** = platform-wide/global editorial context (global availability presentation, no
  local-eligibility claims).
- **`/kz/{lang}/…`** = explicit Kazakhstan market context; `/pl/{lang}/…` = Poland; `/de/{lang}/…`
  = Germany. Market pages are **first-class indexable pages** once publication-authorized — they
  are **never canonicalized to global pages**, and global routes are **never silently redirected to
  a country by IP** (dismissible suggestion banners only).

## 4. Market root vs country page — duplicate-intent resolution (owner direction)

**`/kz/ru/` (and siblings) IS the canonical Kazakhstan market homepage AND the country market
root — one surface.** A separate `/kz/ru/countries/kazakhstan/` is **prohibited**: it must not be
created, and any legacy/incoming URL of that shape 301s to `/kz/ru/` (never indexed). The global
`/countries/` hub remains a global directory of markets linking to each market root.

## 5. "Exchange in market" — one page per intent

`/kz/ru/exchanges/bybit/` is the **single canonical page for the "Bybit in Kazakhstan" intent** —
the market-context exchange review with pair facts (availability, products, KYC, P2P, fees,
restrictions) inherent in the route. No competing "deep passport" page is created for the same
intent. If a deeper evidence surface is ever needed, it becomes
`/kz/{lang}/exchanges/{exchange}/availability/` with a distinct documentary purpose (full dated
evidence/product matrix), linked from the review, owner-gated, and non-competing (review targets
the commercial intent; availability subpage targets evidence detail).

Methodology contract: global `/methodology/` remains the platform-wide trust page; market pages
`/kz/{lang}/methodology/` exist per LIVE market language with **market-specific verification
context** ("how we verify for Kazakhstan") — distinct intent, cross-linked, never duplicated copy.

## 6. Canonical, hreflang, x-default

Required Kazakhstan cluster (exchange example):

```
/kz/ru/exchanges/bybit/  → canonical self · hreflang ru-KZ   (market default · x-default target)
/kz/kk/exchanges/bybit/  → canonical self · hreflang kk-KZ
/kz/en/exchanges/bybit/  → canonical self · hreflang en-KZ   (fallback language)
x-default               → /kz/ru/exchanges/bybit/

Poland cluster (per LIVE sibling): pl-PL · uk-PL · ru-PL · en-PL
x-default → /pl/pl/{stable-route}/        Germany: de-DE · en-DE → x-default /de/de/{stable-route}/
```

**x-default rule (owner review 003):** for explicit market clusters, x-default points to the
market's **LIVE `marketDefault` sibling** — KZ → `/kz/ru/…`, PL → `/pl/pl/…`, DE → `/de/de/…`
(LOCALE22/LOCALE23). English is **never** assumed to be the default or the x-default target: it is
the approved fallback language only (LOCALE24). Poland x-default must not point to English while
the Polish market-default variant is LIVE. Global/legacy clusters keep x-default → the global
English URL (their canonical language).

Rules: LIVE means the **PageLocaleCoverage record of that specific stable page** is LIVE — market
support alone adds nothing to clusters (LOCALE16/LOCALE18). Every published sibling emits
self-canonical, self hreflang, reciprocal hreflang to **every LIVE sibling only**, x-default,
correct `html lang` = localeTag, localized `inLanguage` schema, and LIVE-only sitemap membership. **Regional BCP 47 tags (`ru-KZ`, `kk-KZ`, `en-KZ`, `pl-PL`, `uk-PL`, `ru-PL`, `en-PL`, `de-DE`,
`en-DE`) are mandatory for market pages — bare `ru`/`kk`/`en` hreflang is not allowed there.** Clusters are generated from one
routing manifest so reciprocity cannot drift; market pages join clusters only after publication GO.

## 7. Localized metadata & schema

Per market-language page: translated title/description (per-script length lint), localized OG text
over the market's single country artwork, schema in the page language (`inLanguage: localeTag`)
with stable entity IDs shared across siblings; MI facts identical across language siblings —
structured data never forks facts by language.

## 8. Sitemap & robots

Explicit allowlist; entries only for LIVE market-language pairs + authorized global routes;
`/go/**`, `/__design/**`, previews, prohibited duplicate routes excluded; optional per-market
sitemap partitions under one index; robots.txt changes only via owner-gated production tasks; no
IP/browser-based serving differences (no cloaking).

## 9. SEO gates (SEO01–SEO15 retained, market-first corrected) + locale gates

SEO01 one H1 · SEO02 title/description present, per-script length bands · SEO03 canonical
self-reference (market-language-correct) · SEO04 robots meta per route class · SEO05 sitemap
allowlist = published LIVE routes only · SEO06 schema valid, mirrors content, `inLanguage` correct ·
SEO07 breadcrumbs on non-root families · SEO08 internal links resolve and stay inside the current
market-language namespace · SEO09 localized alt-text coverage · SEO10 slug-registry uniqueness;
no duplicate-intent routes (incl. the §4/§5 prohibitions) · SEO11 CWV budget (LCP = first-screen
commercial surface; zero CLS from fixed tiles/mastheads) · SEO12 publication gates respected ·
SEO13 hreflang clusters complete, reciprocal, regional-tagged, x-default per §6 · SEO14 no IP/
browser hard redirects or cloaking · SEO15 no fallback page indexed as translated. Plus locale
gates **LOCALE01–LOCALE25** (defined in the governance CI matrix; enforced with these).
