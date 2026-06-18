# CryptoBonusWorld Image Generation Prompts v1

These prompts are used to generate evergreen visual packs for exchange promo/referral code pages.

---

## Variables

Use these variables:

| Variable | Examples |
|---|---|
| `{EXCHANGE_NAME}` | Bybit, Binance, OKX, MEXC |
| `{CODE_TYPE}` | REFERRAL CODE, BONUS CODE, PROMO CODE, INVITATION CODE |
| `{CTA_TEXT}` | CLAIM BONUS, GET BONUS, OPEN OFFER |
| `{BRAND_DOMAIN}` | CryptoBonusWorld.com |

---

## Prompt 1 — OG / Link Preview 1200x630

```
Generate a premium evergreen link preview image for a crypto exchange referral/bonus page.

Format: 1200x630 horizontal.

Visual style: dark navy premium fintech/coupon style, subtle gold border, yellow/gold CTA button,
clean high-contrast typography, trustworthy and not casino-like.

Main text: {EXCHANGE_NAME} {CODE_TYPE} {CTA_TEXT}

Branding: Place a small CryptoBonusWorld logo mark plus the text CryptoBonusWorld.com in the
bottom-right corner. Make it visible but secondary.

Important: Do not include any specific promo code. Do not include any bonus amount. Do not include
any date. Do not include temporary offer terms. Do not include "verified June 2026".
The image must be evergreen.

Composition: Large exchange name at the top/center. Large {CODE_TYPE} below. Large yellow CTA
button with {CTA_TEXT}. Optional small cursor click icon on the CTA. Small CBW branding
bottom-right. Premium dark background with subtle gold glow.
```

---

## Prompt 2 — Article Image 1200x675

```
Generate a premium evergreen article image for a crypto exchange referral/bonus page.

Format: 1200x675 horizontal.

Visual style: dark navy, gold border/accent, clean fintech coupon card, minimal, readable, not noisy.

Main text: {EXCHANGE_NAME} {CODE_TYPE} {CTA_TEXT}

Branding: Place only a small CBW logo mark in the bottom-right corner.
Do not include CryptoBonusWorld.com text.

Important: Do not include any specific promo code. Do not include any bonus amount. Do not include
any date. Do not include temporary campaign data.

Composition: Large exchange name. Large {CODE_TYPE}. Yellow CTA button. Optional subtle cursor click
on the button. Small CBW mark bottom-right. No full domain text.
```

---

## Prompt 3 — Homepage / Card Image 1200x1200

```
Generate a premium evergreen homepage card image for a crypto exchange referral/bonus page.

Format: 1200x800 horizontal (3:2 aspect ratio).

Visual style: dark navy, premium gold border, strong readability in a 3-column card grid,
clean and mobile-friendly. Must look good when shrunk to ~360px wide (one-third of a 1080px desktop).

Main text: {EXCHANGE_NAME} {CODE_TYPE} {CTA_TEXT}

Branding: Place only a small CBW logo mark in the bottom-right corner.
Do not include CryptoBonusWorld.com text.

Important: Do not include any specific promo code. Do not include any bonus amount. Do not include
any date. Do not include temporary offer terms.

Composition: Large exchange name at top/center. Large {CODE_TYPE}. Large yellow CTA button.
Small CBW mark bottom-right. Must remain readable when displayed as a small homepage card.
The 3:2 ratio means the card is wider than tall — design for horizontal layout.
```

---

## Example for Bybit

**Variables:**
```
{EXCHANGE_NAME} = BYBIT
{CODE_TYPE}     = REFERRAL CODE
{CTA_TEXT}      = CLAIM BONUS
{BRAND_DOMAIN}  = CryptoBonusWorld.com
```

**Approved output files:**
- `bybit-og-1200x630-approved.png`
- `bybit-article-1200x675-approved.png`
- `bybit-card-1200x800-approved.png`

---

## Exchange queue

Future exchanges to generate visual packs for:

| Exchange | Status | Reference folder |
|---|---|---|
| Bybit | ✅ Approved v1 | `Reference/bybit-visual-pack-v1/` |
| Binance | pending | `Reference/binance-visual-pack-v1/` |
| OKX | pending | `Reference/okx-visual-pack-v1/` |
| MEXC | pending | `Reference/mexc-visual-pack-v1/` |
| Bitget | pending | `Reference/bitget-visual-pack-v1/` |
| BingX | pending | `Reference/bingx-visual-pack-v1/` |
| Gate | pending | `Reference/gate-visual-pack-v1/` |
| KuCoin | pending | `Reference/kucoin-visual-pack-v1/` |
| HTX | pending | `Reference/htx-visual-pack-v1/` |

---

## Workflow for each new exchange

1. Generate 3 images using the prompts above with the exchange's variables.
2. Review for evergreen rule (no codes, no amounts, no dates).
3. Place approved files in `Reference/{exchange}-visual-pack-v1/`.
4. Copy to `public/media/exchanges/{exchange}/share|article|cards/`.
5. Wire `og:image` in the exchange promo page.
6. Add article image below conversion block on the page.
7. Update `VISUAL_IMAGE_PROMPTS_v1.md` exchange queue — mark as Approved.
