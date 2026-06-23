# CBW Future Backlog — Exchange Page Content Proof Standard v1

**Status:** BACKLOGGED — not started  
**Priority:** After Exchange Promo Hero System + 3-image visual packs per exchange  
**Added:** 2026-06-23  

---

## Prerequisites (must be complete before this starts)

1. Exchange Promo Hero System — unified neutral background across all exchange pages
2. Per-exchange 3-image visual packs: OG / article / card

---

## Goal

Every exchange page should include a mobile screenshot / registration proof section that:

- Shows the user exactly where to enter or verify the promo/referral code during registration
- Builds trust through real, clean UI evidence
- Maintains consistent visual treatment across all exchange pages

---

## Standard Requirements

### Screenshot content
- Must show the promo/referral/invitation code input field clearly
- Must be mobile-first (mobile screenshot, not desktop)
- Must not contain personal data (no name, email, phone, face, wallet address)
- Must show real exchange UI — no fake/mocked UI

### Visual highlight treatment (consistent across all exchanges)
- Colored outline on the code input field
- Subtle glow around the highlighted area
- Arrow or callout pointing to the field
- Short label (e.g. "Enter code here")
- Style must be identical across all exchange proof blocks

### Purpose
- Help the user understand where to enter the code
- Support trust — proof that the code field exists and is real
- Not decorative — must directly answer "where do I put this?"

### Placement
- After hero promo block
- Before or within the step-by-step guide section
- Mobile-first layout

---

## Consistency rules

- Same arrow style across all exchanges (see `docs/CBW_EXCHANGE_PROMO_HERO_SYSTEM_v1.md` for system reference)
- Same highlight color family (to be defined at implementation time)
- Same label font/size
- Screenshot dimensions standardized (to be defined)
- No personal data in any screenshot

---

## Exchanges in scope (initial)

- /bybit/
- /mexc/
- All future exchange pages added to the site

---

## Out of scope (for this backlog item)

- Hero backgrounds (covered by Hero System v1)
- OG / article / card images (covered by visual pack work)
- Page layout changes
- Any new page creation

---

## Implementation notes (to fill in when starting)

- Screenshot capture pipeline: TBD
- Highlight/annotation tool: TBD (sharp + SVG overlay, or Playwright annotation)
- Arrow style reference: see `feedback_screenshot_arrows.md` in memory (two types: blue zone outline + orange specific field)
- Asset storage path: `public/media/exchanges/{slug}/proof/` (proposed)
- Component: new `ProofBlock.astro` or inline section (TBD)

---

## Related docs

- [`docs/CBW_EXCHANGE_PROMO_HERO_SYSTEM_v1.md`](CBW_EXCHANGE_PROMO_HERO_SYSTEM_v1.md) — hero background system (prerequisite)
- `docs/CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` — slot system for visual packs (prerequisite)
