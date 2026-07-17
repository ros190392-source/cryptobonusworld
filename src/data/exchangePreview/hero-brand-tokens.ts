/**
 * CBW Hero Brand Zone Standard v1 — Variant B (owner-approved direction).
 *
 * ONE shared token set consumed by ExchangeReviewPreviewPage for all preview
 * exchanges: slot geometry goes to ExchangePromoLogoSlot as props (live pages
 * pass nothing and keep the frozen 320×96 / 250×76 live geometry), label
 * typography and gaps go to the component CSS via define:vars.
 *
 * Hierarchy intent: the exchange logo/wordmark is the PRIMARY identity
 * element; "REFERRAL CODE" is a secondary functional label.
 * Never reuse these values for alternatives cards / article / OG / homepage —
 * every surface has its own optical standard.
 */
export const heroBrandZone = {
  slot: {
    desktop: { w: 360, h: 108 },
    mobile: { w: 280, h: 84 },
  },
  logoBudget: {
    desktop: { w: 340, h: 98 },
    mobile: { w: 264, h: 76 },
  },
  label: {
    desktop: { fontSize: '28px', lineHeight: '34px' },
    mobile: { fontSize: '20px', lineHeight: '26px' },
  },
  /** slot bottom edge → label top. Slot has a built-in 10px margin-bottom. */
  gapBrandLabel: { desktop: 12, mobile: 10 },
  /** label bottom → code field top */
  gapLabelField: { desktop: 20, mobile: 20 },
  /**
   * Hero padding compensation so the rendered hero stays inside the approved
   * tolerance (desktop ≈435–439, mobile ≈404) despite the taller slot.
   */
  heroPadding: {
    desktop: { top: 42, bottom: 40 },
    mobile: { top: 35, bottom: 48 },
  },
} as const;
