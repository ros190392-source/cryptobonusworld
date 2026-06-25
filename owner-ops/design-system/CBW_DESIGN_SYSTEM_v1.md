# CBW Design System v1

## Architecture

**Theme:** Light fintech chrome  
**Token sheet:** `src/styles/tokens.css` — `--cbw-*` CSS custom properties  
**Primary layout:** `src/layouts/CleanLayout.astro` — homepage, exchange pages  
**Global layout:** `src/layouts/Layout.astro` — dark theme, other site pages  

---

## Token Reference

See `src/styles/tokens.css` for the full token sheet. Key groups:

### Colors
```
--cbw-navy-header   #13233E   sticky header
--cbw-amber         #F7931A   brand accent
--cbw-green         #16A34A   CTA buttons
--cbw-bg            #F7F8F4   page background
--cbw-white         #ffffff   card/section bg
```

### Coupon chip
```
--cbw-coupon-bg          #FFFBF5   chip container
--cbw-coupon-border      #FCD34D   dashed border
--cbw-coupon-code-bg     #FFF7ED   code pill
--cbw-coupon-code-bd     #FED7AA   code pill border
--cbw-coupon-code-tx     #C2410C   code text (warm red)
--cbw-coupon-label       #92400E   "Promo code" label
```

### Card
```
--cbw-card-bg          #ffffff
--cbw-card-border      #E5E7EB
--cbw-card-radius      12px
--cbw-card-shadow      0 2px 6px rgba(0,0,0,.06)
--cbw-card-shadow-h    0 6px 20px rgba(0,0,0,.11)
--cbw-card-border-h    #C7D2FE
```

---

## Component Inventory

### ExchangeCard (`src/components/home/ExchangeCard.astro`)
- **Image zone** → links to exchange page (`ex.pageUrl`)
- **Exchange name** → links to exchange page
- **Code chip** → click-to-copy (clipboard API with fallback)
- **CTA button** → affiliate route (`ex.affiliateUrl = /go/{slug}`)
- No nested `<a>` tags — outer is `<div>`, image+name use sibling `<a>` elements
- No fake ratings, no fake usage stats, no "guaranteed" language

### Homepage grid (`src/pages/index.astro`)
- 3 cols ≥900px · 2 cols ≥560px · 1 col mobile
- Container: 1180px
- Section: `#ffffff` bg, `padding: 24px 0 48px`
- Hero: dark navy gradient, `padding: 24px 0 28px` mobile / `32px 0 36px` desktop

### SiteHeader (`src/components/layout/SiteHeader.astro`)
- Background: `#13233E`
- Height: 56px
- CTA: "Get Bonus" amber button → `/bybit/`
- **FROZEN** — do not redesign without owner approval

### SiteFooter (`src/components/layout/SiteFooter.astro`)
- Background: `#080F18` (cbw-navy)

---

## Link Logic (Exchange Cards)

| Element | Destination |
|---|---|
| Card image | Exchange page (`/bybit/`, `/mexc/`) |
| Exchange name | Exchange page |
| Code chip | Click-to-copy (no navigation) |
| "Claim Bonus →" button | Affiliate redirect (`/go/bybit`, `/go/mexc`) |

---

## Visual Pack Rules

Exchange-specific card/hero/article images are managed in `src/data/exchanges.ts`.  
Active paths (do not change without owner approval):

| Exchange | Card | Hero bg |
|---|---|---|
| Bybit | `bybit-card-final-v3-1200x800.jpg` | `bybit-hero-custom-v1.png` |
| MEXC | `mexc-card-final-v3-1200x800.jpg` | `mexc-hero-custom-v1.png` |

---

## Grid System

Exchange card grid uses Astro-scoped CSS in `index.astro`. No global grid utility needed.

---

## Status

| Component | Status |
|---|---|
| `src/styles/tokens.css` | ✅ v1 live |
| ExchangeCard click-to-copy | ✅ v1 live |
| Hero compression | ✅ v1 live |
| Exchange page template | 🔜 Phase 2 |
| Dark→light migration (Layout.astro) | 🔜 Future |
