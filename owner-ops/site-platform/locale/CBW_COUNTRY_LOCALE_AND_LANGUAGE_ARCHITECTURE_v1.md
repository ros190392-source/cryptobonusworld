# CBW Country, Locale and Language Architecture — v1 (owner-corrected: market-first · extensible matrix)

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner reviews 002
  (market-first URLs) and **003 (extensible market-language matrix, per-market defaults)** · 2026-07-23
- Status: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** (owner-approved committed architecture authority — initial architecture commit `a3dea7e451d046d5f01515bf085962f6f92a9fa7` on branch `feat/cbw-global-site-architecture-v3`; implementation and production remain separately unauthorized)
- Companion: [CBW_COUNTRY_LOCALE_AND_LANGUAGE_ARCHITECTURE_v1.json](CBW_COUNTRY_LOCALE_AND_LANGUAGE_ARCHITECTURE_v1.json)

## 1. Core principle — two independent variables, market-first URLs

**Country (market)** decides *facts* (MI decisions); **language** decides *presentation*. Stored,
resolved, switched and persisted independently; never inferred from each other. Public market URLs:
`/{countrySlug}/{languageCode}/…`. Data model per page context:

```
countryCode "KZ" · countrySlug "kz" · languageCode "ru"|"kk"|"en"|…
localeTag "ru-KZ"|"kk-KZ"|"en-KZ"|"pl-PL"|"uk-PL"|… · urlPrefix "kz/ru"… (derived)
```
The prefix is never stored as one authoritative locale variable. Language codes are ISO 639-1:
**Kazakh = `kk` (never `kz`) · Ukrainian = `uk` (never `ua`)**.

## 2. MarketLanguageMatrix (registry model — explicit and extensible)

One registry record per supported market-language pair. Required fields:

`countryCode · countrySlug · languageCode · localeTag · urlPrefix · nativeLanguageName ·
marketDefault · fallbackLanguage · xDefaultTarget · fallbackPriority · lifecycleStatus ·
ownerPublicationAuthorized`

Invariants: **exactly one `marketDefault: true` per market** · **exactly one `xDefaultTarget: true`
per market** (the market default) · English may be `fallbackLanguage: true` **without** being the
market default · never assume `marketDefault = en` or `x-default = English` globally · pairs exist
only as explicit registry records (no Cartesian product) · owner-approved languages can be added
later (e.g. `/de/uk/`, `/de/ru/`, `/de/pl/`, `/pl/de/`, `/kz/uk/`) **without changing the
market-first URL model** — those combinations are NOT created now.

## 3. Final initial market-language matrix (owner review 003)

| Market | Language | code | localeTag | urlPrefix | native name | default | fallback | x-default | fallbackPriority | lifecycle |
|---|---|---|---|---|---|---|---|---|---|---|
| KZ | Russian | ru | ru-KZ | `/kz/ru/` | Русский | **true** | false | **true** | 1 | PLANNED |
| KZ | Kazakh | kk | kk-KZ | `/kz/kk/` | Қазақша | false | false | false | 3 | PLANNED |
| KZ | English | en | en-KZ | `/kz/en/` | English | false | **true** | false | 2 | PLANNED |
| PL | Polish | pl | pl-PL | `/pl/pl/` | Polski | **true** | false | **true** | 1 | PLANNED |
| PL | Ukrainian | uk | uk-PL | `/pl/uk/` | Українська | false | false | false | 3 | PLANNED |
| PL | Russian | ru | ru-PL | `/pl/ru/` | Русский | false | false | false | 4 | PLANNED |
| PL | English | en | en-PL | `/pl/en/` | English | false | **true** | false | 2 | PLANNED |
| DE | German | de | de-DE | `/de/de/` | Deutsch | **true** | false | **true** | 1 | PLANNED |
| DE | English | en | en-DE | `/de/en/` | English | false | **true** | false | 2 | PLANNED |

Market defaults: **KZ → ru · PL → pl · DE → de.** English is the approved fallback language in all
three markets — fallback, not default. `ownerPublicationAuthorized: false` for every pair until its
publication GO.

## 4. PageLocaleCoverage (separate per-page registry)

Market-level language support does **not** imply page-level translation. Every (stable page ×
market-language pair) has its own coverage record:

`pageId · stableRouteId · pageFamily · countryCode · languageCode · localeTag ·
translationStatus · sharedUiStatus · headerFooterStatus · bodyStatus · metadataStatus ·
structuredDataStatus · glossaryStatus · internalLinkStatus · responsiveQaStatus · publicationStatus`

Lifecycle: `PLANNED → IN_TRANSLATION → REVIEW → LIVE → RETIRED`. Production language switchers,
hreflang clusters and sitemap entries include **only LIVE variants of that specific stable page**.

## 5. Resolution precedence (binding)

**Country:** explicit URL → manual → saved → IP ("detected"; IP ≠ residence) → global.
**Language:** explicit URL → manual → saved → browser `Accept-Language` → **the market's
`marketDefault` language** (then its `fallbackLanguage` per `fallbackPriority`). Explicit URL always
wins; no hard redirects of indexed URLs by IP/browser signals — dismissible suggestions only;
crawlers receive URL-determined content.

## 6. Language switching (same market; whole presentation; zero facts)

`/pl/pl/exchanges/bybit/` → Ukrainian → `/pl/uk/exchanges/bybit/` → Russian →
`/pl/ru/exchanges/bybit/` → English → `/pl/en/exchanges/bybit/`. Preserves market, page family,
exchange, comparison pair, promo exchange, guide stable ID, safe query parameters, anchor. Changes
the complete presentation layer (html lang → dates/numbers, per review 002 list). Changes **no MI
or market fact** (LOCALE13). Switchers list only LIVE PageLocaleCoverage variants of the current
page (LOCALE18).

## 7. Country switching — explicit fallback order (owner review 003)

1. **Preserve the current language** when the target market-language pair AND the specific
   PageLocaleCoverage record are LIVE — `/kz/ru/exchanges/bybit/` → Poland →
   `/pl/ru/exchanges/bybit/` (when ru-PL and that page variant are LIVE).
2. Otherwise use the target market's **LIVE `marketDefault` language** —
   `/kz/kk/exchanges/bybit/` → Poland → `/pl/pl/exchanges/bybit/` (kk-PL doesn't exist; Polish is
   the market default).
3. Otherwise the target market's **LIVE English fallback**.
4. Otherwise an **explicit unavailable/resolver state** (never a guess).

Whenever the language changes, the UI must state it — e.g. *"The requested language is not
available for Poland. The Polish version is shown."* Fallback content is **never served silently
under the unsupported requested URL** (LOCALE19/LOCALE20).

## 8. Missing-translation policy (per page variant)

Missing page-language variant → no indexable URL, no sitemap entry, no hreflang entry, no
production language-switch link, no mixed-language page, no unrelated-homepage redirect, no silent
English body beneath another locale URL. Preview builds may show `TRANSLATION_IN_PROGRESS`;
production shows the language only after its PageLocaleCoverage is LIVE.

## 9. Translation workflow

Canonical EN structured strings + collections → batch export per **market-language pair** (keys,
context, length limits, do-not-translate) → ChatGPT pass (locked glossary: state labels, legal
phrases, brand terms) → mandatory human/owner review of commercial/legal/state strings → import +
lint (ICU placeholders, budgets, no HTML injection) → **PageLocaleCoverage advancement per page**
→ pair/page preview (LOCALE gates) → owner GO → LIVE. Facts never change meaning across languages.

## 10. RTL readiness, switching UX, content model

Unchanged from review 002: logical CSS properties, `html dir`, audited components, nothing may
preclude RTL. Header: separate country control (resolution source shown) and language switch
(native names; only LIVE/previewable variants of the current page). One canonical data layer for
all pairs; one CountryVisualProfile per country serves all its language siblings (only UI copy,
metadata and alt text localize — LOCALE14/LOCALE25); schema in page language with stable entity IDs.
