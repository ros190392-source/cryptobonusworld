# CryptoBonusWorld Visual Pack Standard v1

This is the reusable visual standard for all exchange promo/referral code pages.

---

## Goal

Create evergreen, premium, reusable images for each exchange page without embedding changing offer data.

The images must visually explain:
- exchange brand
- referral/promo/bonus page intent
- click/claim action
- CryptoBonusWorld brand ownership

But they must not contain volatile offer details.

---

## Required image pack per exchange

Each exchange must have 3 approved images:

### 1. OG / Link Preview Image

**Size:** 1200x630

**File name:** `{exchange}-og-1200x630-approved.png`

**Use:**
- og:image
- twitter:image
- Viber
- Telegram
- WhatsApp
- Facebook/X link preview

**Branding:**
- CryptoBonusWorld.com allowed in bottom-right corner.
- Small CBW logo mark next to the domain is allowed.

---

### 2. Article / Inline Image

**Size:** 1200x675

**File name:** `{exchange}-article-1200x675-approved.png`

**Use:**
- inside article
- inside promo page
- page visual block

**Branding:**
- only small CBW logo mark in bottom-right corner.
- no full domain text.

---

### 3. Homepage / Card Image

**Size:** 1200x800

**File name:** `{exchange}-card-1200x800-approved.png`

**Aspect ratio:** 3:2 (matches competitor homepage grid cards)

**Use:**
- homepage card
- exchange grid
- directory card

**Grid behaviour:**
- desktop: 3 columns
- tablet (≤900px): 2 columns
- mobile (≤560px): 1 column
- rendered with `<img width="100%" height="auto" display="block">` — never `background-image`, never `object-fit: cover`
- image is always fully visible, never cropped

**Branding:**
- only small CBW logo mark in bottom-right corner.
- no full domain text.

---

## Universal content rules

**Allowed text:**
- `{EXCHANGE}`
- REFERRAL CODE
- BONUS CODE
- PROMO CODE
- INVITATION CODE
- CLAIM BONUS
- GET BONUS
- OPEN OFFER

**Do not use:**
- exact promo code
- exact bonus amount
- date
- current month/year if used as freshness claim
- KYC terms
- geo restrictions
- temporary campaign details

---

## Why no changing data in images

Promo codes, bonuses, dates and terms can change. If they are embedded in images, every update requires regenerating visuals. Therefore all volatile data must stay in:

- HTML offer cards
- tables
- CTA modules
- structured data
- text content
- verified offer database

Images stay evergreen.

---

## Visual style

**Approved style:**
- dark navy background
- premium gold border
- yellow/gold CTA button
- white exchange lettering
- clean fintech/coupon design
- small CBW mark
- optional cursor click for CTA images
- subtle premium glow

**Avoid:**
- casino look
- gambling visual language
- generic AI coin pile
- neon chaos
- too much small text
- fake screenshots
- crowded UI
- aggressive scammy style

---

## Branding placement rules

**OG image:**
- bottom-right: CBW logo mark + CryptoBonusWorld.com

**Article image:**
- bottom-right: CBW logo mark only

**Homepage/card image:**
- bottom-right: CBW logo mark only

Do not place CBW branding top-left if it competes with the exchange logo.

---

## Production placement

**Reference source folder:**
```
C:\projects\CryptoBonusWorld\Reference\{exchange}-visual-pack-v1\
```

**Public output:**
```
public/media/exchanges/{exchange}/share/{exchange}-og-1200x630.png
public/media/exchanges/{exchange}/article/{exchange}-article-1200x675.png
public/media/exchanges/{exchange}/cards/{exchange}-card-1200x800.png
```
