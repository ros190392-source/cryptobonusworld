# Screenshot Style Guide
**CryptoBonusWorld — Visual Design System for Exchange Screenshots**
**Version:** 1.0 · **Created:** 2026-06-02 · **Applies to:** all public-facing exchange screenshots

---

## 1. Purpose

This guide defines the visual language for every screenshot published on CryptoBonusWorld. Consistency builds trust. Users should immediately recognize our screenshots as authoritative, clean, and professional — not scraped or clickbait-adjacent.

**Design inspiration:** Stripe Docs · Notion · Linear · modern SaaS onboarding

---

## 2. Color Palette

| Role | Hex | Usage |
|---|---|---|
| Primary accent | `#6C63FF` | Arrows, callout borders, highlight strokes |
| Secondary accent | `#4F46E5` | Deeper UI elements, selected states |
| Glow / halo | `rgba(108, 99, 255, 0.18)` | Area highlights, soft focus regions |
| Text overlay bg | `rgba(0, 0, 0, 0.72)` | Dark callout bubbles |
| Text overlay fg | `#FFFFFF` | Text inside dark callout bubbles |
| Blur tint | `rgba(108, 99, 255, 0.08)` | Sensitive-data blur overlay |
| Border subtle | `rgba(108, 99, 255, 0.35)` | Thin highlight rectangles |

**Never use:** red (`#FF0000`, `#EF4444`, etc.), orange, or any color that implies error/danger.

---

## 3. Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Callout label | Inter, system-ui | 13px | 500 |
| Number badges | Inter, system-ui | 11px | 700 |
| Step labels | Inter, system-ui | 12px | 600 |

All callout text: `letter-spacing: 0.01em`. No ALL-CAPS except step numbers.

---

## 4. Arrows

Arrows are the primary annotation element. Get these right.

### Spec
| Property | Value |
|---|---|
| Stroke width | 2.5px |
| Color | `#6C63FF` |
| Opacity | 0.82 |
| Line join | `round` |
| Line cap | `round` |
| Shadow | `0 2px 6px rgba(108,99,255,0.28)` |
| Arrowhead | Filled, 8×6px, rounded tip |
| Curve style | Cubic bezier — smooth, not mechanical |

### What good arrows look like
- Thin and precise — they point, not shout
- Natural curve — avoid perfectly straight, avoid sharp angles
- Shadow lifts them slightly off the screenshot
- Semi-transparent so the UI shows through subtly

### Forbidden arrow styles
| Style | Why forbidden |
|---|---|
| Red arrows | Alarm/danger association — breaks trust |
| Hand-drawn / sketch style | Looks unpolished, devalues content |
| Giant circles | Obscures the UI being demonstrated |
| Solid thick strokes (>4px) | Too aggressive, draws more attention than the content |
| Neon / glow overblown | Clickbait aesthetic |
| Multiple overlapping annotations | Visual noise — one focal point per screenshot |

---

## 5. Callouts

Callouts label what the arrow is pointing at.

```
┌─────────────────────────────┐
│  📍 Enter referral code here │   ← dark bg, white text, rounded corners
└─────────────────────────────┘
        ↑ arrow from callout to target
```

### Spec
| Property | Value |
|---|---|
| Background | `rgba(0, 0, 0, 0.72)` |
| Text color | `#FFFFFF` |
| Border radius | 8px |
| Padding | 6px 12px |
| Font size | 13px |
| Max width | 240px |
| Drop shadow | `0 4px 12px rgba(0,0,0,0.3)` |

---

## 6. Highlights (Area Emphasis)

Use when you want to draw attention to a region without an arrow.

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  soft purple glow + 1.5px   
  border on the target area  
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

| Property | Value |
|---|---|
| Border | `1.5px solid rgba(108, 99, 255, 0.60)` |
| Background fill | `rgba(108, 99, 255, 0.08)` |
| Border radius | 6px |
| Outer glow | `0 0 0 3px rgba(108,99,255,0.12)` |

---

## 7. Blur Layer (Sensitive Data)

Use to hide personal data (email, name, balance, 2FA codes) in screenshots taken on real accounts.

| Property | Value |
|---|---|
| Blur radius | 8px (CSS `blur(8px)`) |
| Coverage | Tight bounding box around sensitive field only |
| Tint overlay | `rgba(108, 99, 255, 0.08)` — subtle, not black |
| Shape | Rounded rect, 4px radius |

**Rule:** Never screenshot unblurred balances, email addresses, phone numbers, or 2FA codes. KYC identity documents must never appear.

---

## 8. Browser Frame

Exchange screenshots at 1440px width get a minimal browser chrome frame to signal "this is a real desktop UI."

### Spec
| Property | Value |
|---|---|
| Frame asset | `assets/browser-frame/frame-1440-dark.svg` |
| Frame style | Dark — `#1A1A2E` top bar |
| URL bar fill | Exchange canonical URL |
| Tab favicon | Exchange favicon where available |
| Total height added | 36px top |
| Corner radius | 8px outer |

Mobile screenshots (390px) use `assets/browser-frame/frame-390-mobile.svg` — rounded phone-style crop, no URL bar.

**Omit frame when:**
- The screenshot is an App Store listing (it's already a phone UI)
- The screenshot is a close-up crop of a single UI element

---

## 9. Image Specifications

### Desktop
| Property | Value |
|---|---|
| Capture resolution | 1440 × 900 (minimum) |
| Output width | 1200px (resized with aspect preserved) |
| Format | `.webp` |
| Quality | 85 (lossy WebP) |
| Color space | sRGB |
| Strip metadata | Yes (no GPS, EXIF, author) |

### Mobile
| Property | Value |
|---|---|
| Capture resolution | 390 × 844 |
| Output width | 390px (no resize) |
| Format | `.webp` |
| Quality | 82 |

---

## 10. Naming Convention

```
{exchange}-{category}-{geo}-{device}-{yyyy-mm}.webp
```

| Segment | Values | Example |
|---|---|---|
| exchange | exchange slug | `binance`, `okx`, `mexc` |
| category | one of 10 categories | `registration`, `kyc`, `bonus`, `deposit`, `p2p`, `spot`, `futures`, `fees`, `mobile_app`, `proof_of_reserves` |
| geo | `global`, `us`, `eu`, `asia` | `global` |
| device | `desktop`, `mobile` | `desktop` |
| yyyy-mm | ISO year-month of capture | `2026-06` |

**Path:**
```
public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
```

**Example:**
```
public/screenshots/binance/registration/global-desktop-2026-06.webp
```

---

## 11. Annotation File Naming

Annotation source files (SVG overlays) live in `assets/annotations/`:

```
assets/annotations/{exchange}-{category}-{yyyy-mm}.svg
```

These are stored but not committed to the build — they're editorial source files.

---

## 12. Forbidden Practices

| Forbidden | Reason |
|---|---|
| Red arrows or red circles | Alarm associations, looks amateur |
| Hand-drawn / sketch overlays | Undermines authority |
| Giant circles that obscure UI | Hides exactly what you're trying to show |
| Emoji in overlays (🔥💰✅ etc.) | Clickbait, erodes trust |
| Watermarks or "VERIFIED" stamps | Looks promotional, not editorial |
| Before/after overlays | Confusing, out of scope |
| Branding overlays ("CryptoBonusWorld") | Detracts from editorial neutrality |
| JPEG screenshots with compression artifacts | Use WebP only |
| Dark mode only captures | Capture light mode (matches exchange default for new users) |
| Blurry / low-DPI | Minimum 1440px wide at capture |

---

## 13. Quality Checklist

Before adding any screenshot to the evidence registry:

- [ ] Screenshot is from the live exchange (not a staging or demo URL)
- [ ] No personal data visible (email, balance, name, phone)
- [ ] UI is in English locale
- [ ] Resolution ≥ 1440px wide (desktop) or 390px (mobile)
- [ ] Exported as `.webp`
- [ ] Browser frame applied (desktop only)
- [ ] Arrows use `#6C63FF` with correct spec
- [ ] `capturedAt` date is accurate
- [ ] Evidence JSON snippet is ready to paste
- [ ] `npm run screenshots:check` passes after adding path

---

## 14. Refresh Schedule

| Priority | Exchange tier | Max age |
|---|---|---|
| P1 | Binance, OKX, MEXC | 90 days |
| P2 | Bitget, Coinbase, BingX | 120 days |
| P3 | Bybit, Gate.io, KuCoin, HTX | 180 days |
| P4 | CoinEx, Phemex, Bitunix, LBank | 365 days |

Screenshots older than max age are flagged as `outdated` by `npm run screenshots:audit`.

---

*Style guide maintained by the CryptoBonusWorld editorial team.*
*For questions, see `docs/media-workflow.md`.*
