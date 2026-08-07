/**
 * Public offer view (Issue #264).
 *
 * The ONE helper every shared public surface (homepage Top-10 row, /exchanges/ directory
 * card, /promo-codes/ table) uses to render an offer. It NEVER reads raw volatile
 * `Offer` fields for a projected exchange: for Bybit it returns the evidence-driven
 * neutralized presentation (see bybitPublicPresentation.ts); for every other exchange it
 * passes the raw offer through unchanged (those exchanges are out of scope for #264).
 *
 * Consumers must render THIS view, so a suppressed Bybit field (promo code, bonus
 * amount, verified badge, commercial CTA) can never leak from a single raw call site.
 */
import { getOffer } from './offers';
import { BYBIT_PUBLIC_PRESENTATION } from './evidence/offers/bybitPublicPresentation';

export interface PublicOfferView {
  slug: string;
  /** Public factual state. */
  publicState: 'verified' | 'under_re_verification' | 'unavailable' | 'expired';
  /** Promo code to display, or null when it must be hidden (unconfirmed candidate). */
  promoCode: string | null;
  /** Bonus/headline display text — neutral copy when the claim is unsupported. */
  bonusHeadline: string;
  /** Short summary for the homepage row. */
  summary: string;
  /** Status badge label; never "verified" unless truly verified. */
  statusLabel: string;
  statusTone: 'verified' | 'preview' | 'research' | 'review';
  /** Whether a "✓ Verified offer" badge may be shown. */
  showVerifiedBadge: boolean;
  /** Whether a commercial (affiliate) CTA may be shown; false → non-commercial only. */
  isCommercial: boolean;
}

/** Resolve the public, render-safe view for an exchange's offer. */
export function resolvePublicOfferView(slug: string): PublicOfferView | null {
  if (slug === 'bybit') {
    const p = BYBIT_PUBLIC_PRESENTATION;
    return {
      slug: 'bybit',
      publicState: p.publicState,
      promoCode: p.promoCode,
      bonusHeadline: p.headline,
      summary: p.summary,
      statusLabel: p.statusLabel,
      statusTone: p.statusTone,
      showVerifiedBadge: p.publicState === 'verified',
      isCommercial: p.isCommercialCtaAllowed,
    };
  }

  // Out-of-scope exchanges: unchanged raw passthrough.
  const offer = getOffer(slug);
  if (!offer) return null;
  const verified = offer.status === 'verified';
  return {
    slug,
    publicState: verified ? 'verified' : 'under_re_verification',
    promoCode: offer.promoCode,
    bonusHeadline: offer.bonusHeadline,
    summary: offer.bonusHeadline,
    statusLabel: verified ? 'Verified offer' : 'Public offer preview',
    statusTone: verified ? 'verified' : 'preview',
    showVerifiedBadge: verified,
    isCommercial: true,
  };
}
