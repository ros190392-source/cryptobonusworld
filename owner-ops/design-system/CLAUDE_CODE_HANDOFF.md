# Claude Code Handoff — Design System v1

## What was implemented (2026-06-25)

### New files
- `src/styles/tokens.css` — CBW design token sheet (`--cbw-*` CSS custom properties)
- `owner-ops/design-system/CBW_BRANDBOOK_v1.md`
- `owner-ops/design-system/CBW_DESIGN_SYSTEM_v1.md`
- `owner-ops/design-system/CLAUDE_CODE_HANDOFF.md`
- `owner-ops/design-system/COMPONENT_REPLACEMENT_MAP.json`

### Modified files
- `src/layouts/CleanLayout.astro` — added `import '../styles/tokens.css'`
- `src/components/home/ExchangeCard.astro` — added click-to-copy, uses `--cbw-*` tokens
- `src/pages/index.astro` — hero padding compressed, h1 clamp capped at 44px

## What was NOT changed (intentional)
- `src/components/layout/SiteHeader.astro` — FROZEN
- `src/data/exchanges.ts` — Bybit/MEXC affiliate routes and card images
- `src/data/offers.ts` — Bybit CRYPTOBONUSW, MEXC mexc-CryptoBonus
- Exchange page templates — Phase 2

## Phase 2 priorities
1. Apply design tokens to exchange pages (`/bybit/`, `/mexc/`)
2. Unify ExchangeCard.astro (home) with ExchangeCard.astro (categories/countries)
3. Expand grid to more exchanges as they are added

## Safety rules (never violate)
- MEXC affiliate URL `/go/mexc` — immutable
- Bybit affiliate URL `/go/bybit` — immutable
- MEXC promo code `mexc-CryptoBonus` — immutable
- Bybit promo code `CRYPTOBONUSW` — immutable
- Never use `git add .`
- Never deploy without owner approval
