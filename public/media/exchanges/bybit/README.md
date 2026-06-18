# Bybit Visual Assets

CryptoBonusWorld visual asset pack for the Bybit exchange page.
Generated from SVG templates in `scripts/gen-bybit-assets.mjs`.

## Design

- Background: dark navy gradient (#14243E → #090F1A)
- Accent: orange #F7931A (CBW brand)
- Exchange: BYBIT in gold #F2B400
- Code: CRYPTOBONUSW — white, prominent
- Bonus: Up to $30,000 — orange
- CTA: Claim Bonus — green #16A34A
- Verified: June 2026

## Directory structure

```
public/media/exchanges/bybit/
├── share/          ← OG / social link preview images
│   ├── bybit-og-1200x630.png     Primary OG (Facebook, LinkedIn, Telegram)
│   └── bybit-og-1280x720.png     Twitter / X card
├── article/        ← In-article header images
│   ├── bybit-article-1200x675.png   Standard article hero
│   └── bybit-article-1600x900.png   Wide/Retina article hero
├── cards/          ← Social post images
│   ├── bybit-card-1200x1200.png     Instagram square
│   ├── bybit-card-1080x1080.png     Instagram square (native)
│   ├── bybit-social-1080x1350.png   Instagram portrait (4:5)
│   └── bybit-story-1080x1920.png    Instagram/Telegram story (9:16)
└── source/         ← Master file for regeneration reference
    └── bybit-visual-master.png      1200x630 canonical master
```

## OG wiring

The Bybit promo page (`/prototype/bybit-light/`) uses:
```
ogImage="/media/exchanges/bybit/share/bybit-og-1200x630.png"
```

## Regenerate

```bash
node scripts/gen-bybit-assets.mjs
```

All images are generated programmatically — edit the SVG templates
in `gen-bybit-assets.mjs` to change design.

## Adding another exchange

Copy `gen-bybit-assets.mjs` → `gen-{exchange}-assets.mjs`,
swap the exchange name/color/code/bonus values at the top,
update the output paths to `public/media/exchanges/{slug}/`.
