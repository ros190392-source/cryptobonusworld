# CBW Approved Foundation Checkpoint

**Status: FROZEN — Owner approved. Do not modify without owner sign-off.**

Created: 2026-06-17

---

## 1. Header — Approved & Frozen

**Decision: approved.**

- Approved header mark: `public/brand/cbw-header-mark-final.png`
- Style: dark navy background
- Wordmark: CryptoBonusWorld
- Mobile: responsive, no layout break
- **Do not redesign, redraw, or modify without owner approval.**

---

## 2. Favicon — Approved & Installed

**Decision: approved.**

- Approved source: owner-supplied file
- Required pack installed at `public/favicons/`
- 128×128 PNG required for Yandex compatibility
- System: PNG-first with ICO fallback
- Required files: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-128x128.png`, `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`
- **Do not replace or regenerate without owner approval.**

---

## 3. Bybit Visual Pack v1.1 — Approved

**Decision: approved.**

Reference folder: `Reference/bybit-visual-pack-v1/`

### Approved source files

| File | Size |
|---|---|
| `bybit-og-1200x630-approved.png` | 1200×630 |
| `bybit-article-1200x675-approved.png` | 1200×675 |
| `bybit-card-1200x800-approved.png` | 1200×800 |

### Public deployment paths

| Use | Path |
|---|---|
| OG / social sharing | `public/media/exchanges/bybit/share/bybit-og-1200x630.png` |
| Article / inline image | `public/media/exchanges/bybit/article/bybit-article-1200x675.png` |
| Homepage card | `public/media/exchanges/bybit/cards/bybit-card-1200x800.png` |

**Do not modify, crop, regenerate, or overwrite approved files.**

---

## 4. Visual Pack Standard v1.1

**Current approved image size standard per exchange:**

| Image | Size | Aspect | Purpose |
|---|---|---|---|
| OG / link preview | 1200×630 | ~16:10 | og:image, Twitter, Telegram, Viber, WhatsApp |
| Article / inline | 1200×675 | 16:9 | in-page banner, article section image |
| Homepage card | 1200×800 | 3:2 | homepage grid card |

**Deprecated:** 1200×1200 is NOT the homepage card standard. Standard is 1200×800 (3:2).

---

## 5. Evergreen Rule

Images **must NOT** contain any of the following:

- Promo code (e.g. CRYPTOBONUSW)
- Bonus amount (e.g. up to $30,000)
- Date (e.g. June 2026)
- Verified month/year claim
- Temporary offer conditions

Images **may** contain:

- Exchange name (e.g. BYBIT)
- Generic type label: REFERRAL CODE / BONUS CODE / PROMO CODE / INVITATION CODE
- Generic CTA: CLAIM BONUS / GET BONUS / OPEN OFFER
- CBW logo mark (bottom-right, per placement rules below)

**Reason:** promo codes, bonuses, and terms change. Volatile data belongs in HTML cards, tables, and structured data — not embedded in images.

---

## 6. Placement Rules

### OG / Link preview image
- Bottom-right: CBW logo mark + CryptoBonusWorld.com domain text allowed

### Article / inline image
- Bottom-right: small CBW logo mark only
- No full domain text

### Homepage / card image
- Bottom-right: small CBW logo mark only
- No full domain text

---

## 7. Rebuild Protection

When rebuilding or resetting the site to a clean state:

- **Do not delete** `Reference/` assets
- **Do not delete** `Reference/bybit-visual-pack-v1/`
- **Do not overwrite** approved visual files in `public/media/exchanges/`
- **Do not redesign** header or favicon
- When rebuilding `public/`: copy approved files from `Reference/{exchange}-visual-pack-v1/` into the correct `public/media/exchanges/{exchange}/` paths before launch
- **Do not deploy** any exchange page before the approved card, article, and OG images are in place

---

## Asset restore commands (run after clean rebuild)

```
# Bybit
copy Reference\bybit-visual-pack-v1\bybit-og-1200x630-approved.png      public\media\exchanges\bybit\share\bybit-og-1200x630.png
copy Reference\bybit-visual-pack-v1\bybit-article-1200x675-approved.png  public\media\exchanges\bybit\article\bybit-article-1200x675.png
copy Reference\bybit-visual-pack-v1\bybit-card-1200x800-approved.png     public\media\exchanges\bybit\cards\bybit-card-1200x800.png
```
