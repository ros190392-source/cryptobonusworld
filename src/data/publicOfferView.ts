/**
 * Public offer view (Issue #264, generalized in #266).
 *
 * The ONE helper every shared public surface (homepage Top-10 row, /exchanges/ directory
 * card, /promo-codes/ table, related/alternative tiles, /go route, dedicated pages) uses
 * to render an offer. It is evidence-driven for EVERY governed commercial-candidate exchange
 * and NEVER reads raw volatile `Offer` / exchanges.json fields to grant public authority.
 *
 * Dispatch is governed by PUBLIC_OFFER_AUTHORITY_REGISTRY (#266): a view can be commercial
 * ONLY when the exchange's strategy is authorizing AND that strategy is backed by an EXECUTABLE
 * dispatcher here that returns a commercial view. Today only Bybit has one
 * (`bybit_claim_packet_v1`), and it currently still resolves to under_re_verification; every
 * other governed candidate has `no_authorizing_evidence` and is neutral / non-commercial. Raw
 * `Offer.status` / `verificationStatus` / `affiliateUrl` are legacy editorial state and NEVER
 * grant public authority. A bare valid `Offer.evidence` does NOT restore any raw offer field.
 *
 * Default-deny (R3/R4): every path that is not an explicit commercial dispatcher result is
 * neutral. There is NO fallback from "no view / unknown strategy / missing dispatcher" to
 * commercial behaviour.
 */
import { deriveBybitPublicOfferPresentation } from './evidence/offers/bybitPublicPresentation';
import {
  getPublicOfferAuthority,
  PUBLIC_OFFER_AUTHORITY_REGISTRY,
  NEUTRAL_PUBLIC_HEADLINE,
  NEUTRAL_PUBLIC_STATUS_LABEL,
  NEUTRAL_PUBLIC_SUMMARY,
  type PublicOfferAuthorityStrategyId,
} from './contracts/publicOfferAuthority';

export interface PublicOfferView {
  slug: string;
  /** Public factual state. */
  publicState: 'verified' | 'under_re_verification' | 'unavailable' | 'expired';
  /** The strategy that governed this view (for the authority matrix / diagnostics). */
  strategy: PublicOfferAuthorityStrategyId;
  /** Promo code to display, or null when it must be hidden. */
  promoCode: string | null;
  /** Bonus/headline display text — neutral copy when unsupported. */
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

/** The fail-closed neutral view every non-authoritative governed exchange gets. */
function neutralView(slug: string, strategy: PublicOfferAuthorityStrategyId): PublicOfferView {
  return {
    slug,
    publicState: 'under_re_verification',
    strategy,
    promoCode: null,
    bonusHeadline: NEUTRAL_PUBLIC_HEADLINE,
    summary: NEUTRAL_PUBLIC_SUMMARY,
    statusLabel: NEUTRAL_PUBLIC_STATUS_LABEL,
    statusTone: 'review',
    showVerifiedBadge: false,
    isCommercial: false,
  };
}

/**
 * Executable authorizer dispatchers (R8/R14). One entry per AUTHORIZING strategy — the ONLY
 * place a commercial public view can be produced. A dispatcher returns a view (which may itself
 * be non-commercial, as Bybit is today) or null to decline; a declined / missing dispatcher
 * fails closed to the neutral view. Adding a future authorizing strategy REQUIRES adding a real
 * dispatcher here; a data-only registry edit can never reach commercial behaviour.
 */
type AuthorizingDispatcher = (slug: string, nowMs: number) => PublicOfferView | null;

const AUTHORIZING_DISPATCHERS: Readonly<Record<string, AuthorizingDispatcher>> = Object.freeze({
  bybit_claim_packet_v1: (slug: string, nowMs: number): PublicOfferView | null => {
    if (slug !== 'bybit') return null; // this strategy authorizes Bybit only
    const p = deriveBybitPublicOfferPresentation(nowMs);
    return {
      slug: 'bybit',
      publicState: p.publicState,
      strategy: 'bybit_claim_packet_v1',
      promoCode: p.promoCode,
      bonusHeadline: p.headline,
      summary: p.summary,
      statusLabel: p.statusLabel,
      statusTone: p.statusTone,
      showVerifiedBadge: p.publicState === 'verified',
      isCommercial: p.isCommercialCtaAllowed,
    };
  },
});

/** Strategies that actually have an executable dispatcher wired (consumed by the wiring proof). */
export const WIRED_AUTHORIZING_STRATEGIES: readonly string[] = Object.freeze(
  Object.keys(AUTHORIZING_DISPATCHERS),
);

export function getAuthorizingDispatcher(strategy: string): AuthorizingDispatcher | null {
  return AUTHORIZING_DISPATCHERS[strategy] ?? null;
}

/**
 * Resolve the public, render-safe view for an exchange's offer against an EXPLICIT finite
 * clock (R5). Returns null only when the slug is not a governed commercial-candidate exchange
 * (e.g. a research-only / retired directory entry with no commercial material). Every governed
 * candidate resolves to a non-null view; a non-authorizing or unwired strategy fails closed to
 * neutral (R3/R4/R7).
 */
export function resolvePublicOfferView(slug: string, nowMs: number): PublicOfferView | null {
  const authority = getPublicOfferAuthority(slug);
  if (!authority) return null; // not a governed commercial candidate → no public offer view

  const dispatch = getAuthorizingDispatcher(authority.strategy);
  if (dispatch) {
    const view = dispatch(slug, nowMs);
    if (view) return view; // the ONLY route to a (possibly) commercial view
  }

  // Non-authorizing strategy, or an authorizing strategy whose dispatcher is missing/declined —
  // fail closed. A data-only strategy flip can never make an exchange commercial.
  return neutralView(slug, authority.strategy);
}

export interface OfferAuthorityMatrixRow {
  slug: string;
  strategy: PublicOfferAuthorityStrategyId;
  publicState: PublicOfferView['publicState'];
  commercial: boolean;
}

/**
 * Deterministic current-state authority matrix (R13): the governing strategy, public state
 * and commercial flag for every governed commercial-candidate exchange, at an explicit clock.
 */
export function resolvePublicOfferAuthorityMatrix(nowMs: number): OfferAuthorityMatrixRow[] {
  return PUBLIC_OFFER_AUTHORITY_REGISTRY.map((e) => {
    const view = resolvePublicOfferView(e.slug, nowMs);
    // A registered candidate with no view would be a contract break; fail closed to neutral.
    const v = view ?? neutralView(e.slug, e.strategy);
    return { slug: e.slug, strategy: v.strategy, publicState: v.publicState, commercial: v.isCommercial };
  });
}
