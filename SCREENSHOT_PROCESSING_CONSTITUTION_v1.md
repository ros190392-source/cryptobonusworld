# SCREENSHOT PROCESSING CONSTITUTION v1
**PROJECT:** CryptoBonusWorld / CryptoBonusWorld.com  
**SCOPE:** Binance now, later all crypto exchanges  
**Date adopted:** 2026-06-09  
**Status:** ACTIVE — applies to all screenshot processing sprints

---

## CORE PIPELINE

### Stage 1 — Raw intake / first sieve

- Accept raw screenshots.
- Preserve originals.
- Identify duplicates, weak screenshots, sensitive screenshots, tutorial sequences, internal references, and reject candidates.
- Do not blur, crop, publish, watermark, or delete raw files.
- **Output:** raw catalog + first sieve report.

### Stage 2 — Safe masked review copies

- Create new processed copies from raw screenshots.
- Beautifully blur/mask only sensitive data.
- Do not apply final CryptoBonusWorld.com watermark.
- Do not publish.
- Do not register assets.
- Do not delete raw files.
- **Output:** safe review gallery with all screenshots visible to owner.

### Stage 3 — Final approved project library

- Owner reviews Stage 2 gallery.
- Owner approves / rejects / requests remask / requests recrop / marks internal-only.
- Approved screenshots are numbered, described, captioned, tagged, and stored as reusable project assets.
- These are clean master assets for future articles.
- Still no final publication watermark by default.
- **Output:** approved screenshot library catalog.

### Stage 4 — Publication/export

- Only at publication time decide:
  - with watermark
  - without watermark
  - different watermark
  - different export size
  - annotated version with arrows
  - clean evidence version without arrows
- Move/register only approved assets.
- Publish only approved derivatives.
- Raw deletion/archive decisions happen only after owner confirmation.

---

## WATERMARK POLICY

- Do not apply final publication watermark during Stage 2 or Stage 3.
- Approved project library should store clean master versions.
- Watermark is a removable/export-layer decision in Stage 4.
- Owner must be able to request:
  - add watermark
  - remove watermark
  - replace watermark
  - export clean version
  - export Telegram version
  - export article version

---

## MASKING QUALITY STANDARD

Masking must be **beautiful, precise, and minimal.**

**Do:**
- blur/mask only the sensitive field
- preserve UI structure
- preserve readability
- preserve tutorial usefulness
- use subtle local blur/pixelation/soft cover
- match the UI background where possible
- keep masks visually clean and professional

**Do not:**
- cover half the screen with huge blocks
- use ugly giant orange rectangles on normal candidates
- destroy the screenshot context
- hide useful non-sensitive UI
- over-mask balances unless necessary
- make the screenshot look like a broken censorship block

---

## SENSITIVE DATA — ALWAYS HIDE

- Full email
- Full phone
- Full UID
- Real name / legal name
- Activation code
- Verification code
- 2FA QR
- 2FA secret
- Recovery code
- Wallet address
- TX hash
- Payment account number
- Private messages
- KYC document number
- Personal identifiers

---

## BALANCE POLICY

Balances do not need to be automatically hidden.  
Small balances around 100–200 USD may remain visible if useful for tutorial realism.

**Hide balances only if:**
- they are unusually large
- they identify the account
- they are shown near private account data
- they create privacy risk
- owner requests hiding

---

## FIELD-SPECIFIC MASKING

### Email
- Mask only the email field or email text
- Preserve form structure
- Acceptable: first/last character visible, middle blurred
- Do not cover the whole form

### UID
- Mask only UID area
- Preserve header/menu/sidebar

### Wallet address
- Never show full address
- Either fully hide or show first 2–3 and last 2–3 characters only
- Middle must be fully hidden

### TX hash
- Never show full TX hash
- Partial or full mask

### 2FA QR
- Must be unreadable
- Use full cover or heavy blur
- Optional small label: "2FA QR hidden"

### Activation/verification code
- Fully cover
- No digits visible

---

## REGISTRATION FLOW STANDARD

Registration screenshots must preserve correct user journey.

**Keep as separate screenshots:**

1. Registration form before entering email
2. Registration form with email entered
3. Registration confirmation / account-created / welcome state

**Important:**
- Do not merge empty form and email-filled form as duplicates.
- Do not label pre-confirmation screen as registered.
- The confirmation / "registered" table appears only after registration confirmation.
- Caption must clearly say where in the flow the screenshot belongs.

---

## ANNOTATION / ARROWS POLICY

Arrows and highlights are allowed only as separate tutorial/educational derivatives.  
Do not add arrows to evidence/master versions by default.

**Maintain two possible versions:**
- `clean_master` — no arrows, no publication watermark
- `annotated_tutorial` — arrows/highlights added for article explanation

**Arrows must:**
- be minimal
- point to real UI elements
- not imply fake actions or fake results
- not hide important UI
- not turn evidence into misleading illustration

---

## GALLERY REQUIREMENT

For every processed batch, create a local HTML gallery where owner can visually review all screenshots.

**Gallery must include:**
- All screenshots
- Batch filters
- Search
- Large preview on click
- Filename + source file
- What is shown
- Masking status + details
- Sensitive risk level
- Caption draft
- Alt draft
- Suggested article use
- Registration flow step (if applicable)
- Buttons: **APPROVE** / **REMASK** / **RECROP** / **INTERNAL ONLY** / **REJECT / DELETE CANDIDATE**
- Export Decisions button (plain text + JSON)
- Copy to Clipboard button
- Reset Decisions button
- Decisions saved in localStorage

---

## FINAL PROJECT LIBRARY REQUIREMENT (Stage 3 output)

Each approved screenshot must be stored with:

| Field | Description |
|---|---|
| `id` | Stable exchange-scoped ID, e.g. `BN-047` |
| `exchange` | `binance`, `bybit`, `mexc`, etc. |
| `section` | UI section: `registration`, `fees`, `trading`, `kyc`, etc. |
| `flowStep` | e.g. `registration_form_empty`, `none` |
| `title` | Short descriptive title |
| `description` | Full description of what is shown |
| `captionRU` | Russian caption for articles |
| `captionEN` | English caption for articles |
| `altRU` | Russian alt text |
| `altEN` | English alt text |
| `articleUseCases` | Array: `gold_page`, `review_article`, `bonus_article`, etc. |
| `sensitivityStatus` | `safe`, `masked`, `strict_review`, `internal`, `rejected` |
| `maskingNotes` | What was masked and how |
| `cleanMasterFile` | Path to clean master WebP |
| `annotatedDerivative` | Path to annotated version (optional) |
| `publicationEligibility` | `approved`, `pending`, `internal_only`, `rejected` |
| `ownerApprovalDate` | Date of owner approval |
| `watermarkApplied` | `false` by default |

**The goal:** when writing articles, Claude selects approved screenshots from the project library (Stage 3) instead of raw files — pre-approved, pre-captioned, pre-tagged, ready to embed.

---

## FOLDER STRUCTURE STANDARD

```
reports/screenshots/{exchange}/
├── 1-raw/                          # originals, never touched
├── 2-stage2-safe-review/           # processed review copies (no watermark)
│   ├── A-safe/
│   ├── B-standard-mask/
│   ├── C-heavy-mask/
│   ├── D-internal-only/
│   ├── E-reject-delete/
│   └── contact-sheet/index.html   # owner review gallery
├── 3-library/                      # approved master assets
│   ├── {NNN}-{exchange}-{slug}.webp
│   ├── index.json
│   └── index.html
└── catalog/                        # all JSON catalogs
    ├── raw-catalog.json
    ├── first-sieve-report.json
    ├── stage-2-safe-review-catalog.json
    ├── stage-3-library-catalog.json
    └── raw-delete-candidates.json
```

---

## TECHNICAL STANDARDS

| Parameter | Value |
|---|---|
| Max output width | 1440px |
| WebP quality | 82 |
| Color space | sRGB |
| Blur sigma — email/UID | 20–25 |
| Blur sigma — balance | 15–18 |
| Blur sigma — wallet/code | 45–55 |
| Blur sigma — QR code | 55–65 |
| Blur label font | Arial 9px, pill, semi-transparent |
| Crop | Only if black borders present (trim threshold 25) |
| Watermark | Stage 4 only |

---

*This constitution is the master reference for all screenshot processing in the CryptoBonusWorld project.*  
*All sprint prompts must comply with this document.*  
*Version: 1.0 · Adopted: 2026-06-09*
