# Archive Manifest — Portal-Era Pages

Created: 2026-06-17
Branch: clean-promo-rebuild-mvp

## Status

No files have been physically moved yet.
This document records what is identified as portal-era legacy and the plan for each.

DO NOT move anything listed here without explicit owner instruction.
DO NOT move Reference/, public/media/, public/brand/, public/favicons/, public/logos/.
DO NOT move prototype/bybit-light.astro or prototype/visual-assets-bybit.astro.

---

## Identified Portal-Era Pages (candidates for archival)

These pages appear to be from the old CryptoBonusWorld portal era
and are not part of the new clean /bybit/ production architecture.

| Route | File | Status | Action |
|-------|------|--------|--------|
| /bonus-codes/ | src/pages/bonus-codes/ | Likely portal-era listing | Review — may conflict with /bybit/ design system |
| /bonuses/ | src/pages/bonuses/ | Portal-era bonus listing | Review |
| /categories/ | src/pages/categories/ | Portal-era category pages | Review |
| /coins/ | src/pages/coins/ | Coin pages — possibly keep | Review |
| /use-cases/ | src/pages/use-cases/ | Use-case pages | Review |
| /compare/ | src/pages/compare/ | Compare pages | Review |
| /guides/ | src/pages/guides/ | Guide pages | Review |
| /countries/ | src/pages/countries/ | Country pages | Review |
| /best-exchanges-for/ | src/pages/best-exchanges-for/ | Intentional SEO arch | KEEP |
| /exchanges/[slug].astro | src/pages/exchanges/[slug].astro | Generic exchange template | Review |

## Confirmed Keep (do not archive)

- src/pages/bybit/index.astro — NEW production page (just created)
- src/pages/exchanges/bybit/index.astro — redirect to /bybit/
- src/pages/index.astro — homepage
- src/pages/exchanges/index.astro — exchange directory
- src/pages/go/[exchange].astro — affiliate redirect
- src/pages/prototype/bybit-light.astro — approved prototype reference
- src/pages/prototype/visual-assets-bybit.astro — QA reference
- src/pages/prototype/owner-review.astro — owner review page
- src/pages/promo-codes/index.astro — redirect to /bonus-codes/
- src/layouts/CleanLayout.astro — production layout
- src/components/ — all components
- src/data/ — all data files
- public/ — all public assets (DO NOT touch)

## Notes

- The /exchanges/[slug].astro generic template generates pages for exchanges
  that do NOT have a dedicated page yet. It should stay until all exchanges
  have dedicated pages.
- /bonus-codes/ is linked from the site header as "Promo Codes" — must stay
  until a replacement is built.
- No files should be deleted or moved from src/ without a full audit.
  Risk of breaking build is high for any removal without testing.

## Next Steps (owner decision required)

1. Decide which portal-era sections to keep, deprecate, or redesign
2. Prioritize next exchange pages (Binance, MEXC, Bitget, etc.)
3. Align /bonus-codes/ listing with new /bybit/-style design system
