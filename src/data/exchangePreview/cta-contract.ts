/**
 * CTA routing contract for the "Verified alternatives" promo cards.
 *
 * ctaMode 'preview'    — Claim Bonus → internal review page, View review → review page.
 *                        No /go/* URLs are ever emitted (preview safety invariant).
 * ctaMode 'production' — Claim Bonus → /go/{slug} affiliate redirect,
 *                        View review → review page.
 *
 * Promotion path: switch the mode passed to <ExchangeReviewPreviewPage /> —
 * the markup consumes only the resolved hrefs and never changes.
 */
export type CtaMode = 'preview' | 'production';

export interface AlternativeCtaTargets {
  claimHref: string;
  reviewHref: string;
}

export function resolveAlternativeCtas(
  alt: { slug: string; pageUrl: string },
  mode: CtaMode,
): AlternativeCtaTargets {
  return {
    claimHref: mode === 'production' ? `/go/${alt.slug}` : alt.pageUrl,
    reviewHref: alt.pageUrl,
  };
}
