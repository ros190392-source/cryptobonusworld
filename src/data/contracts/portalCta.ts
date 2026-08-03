/**
 * Commercial CTA state contract for the Portal Factory.
 *
 * Product intent (owner decision): the public site is conversion-oriented and
 * carries native registration / bonus / open-exchange CTAs with complete
 * interaction states and localized labels.
 *
 * Safety invariant (retained, non-negotiable): a commercial affiliate target
 * (`/go/{slug}`) is emitted ONLY when the market profile is approved,
 * offer-eligible and available (or available-with-limits) AND the caller runs
 * in `production` CTA mode. In every other case the CTA falls back to an
 * internal review/evidence surface — a `/go/*` href is never produced. This is
 * fail-closed: an incomplete, stale, conflicting, restricted, unavailable or
 * unapproved profile can never yield a commercial affiliate action.
 */
import type { AvailabilityState, OfferEligibility, ApprovalState } from './portalFactory';
import { assessEvidenceFreshness } from './portalFactory';
import { isInternalPath } from './internalPath';
import type { CtaMode } from '../exchangePreview/cta-contract';

export type CtaIntent = 'register' | 'get_bonus' | 'open_exchange' | 'view_review' | 'view_evidence';
export type CtaLocale = 'en' | 'ru' | 'kk';
export type CtaInteractionState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading';
export type CtaVisualState = 'commercial' | 'review' | 'under_review' | 'restricted' | 'unavailable';

/** Intents that, when authorized, resolve to a commercial affiliate target. */
export const COMMERCIAL_INTENTS: readonly CtaIntent[] = ['register', 'get_bonus', 'open_exchange'];

/** Localized, human labels. English is the current published locale; ru/kk are review-ready. */
export const ctaLabels: Record<CtaIntent, Record<CtaLocale, string>> = {
  register: { en: 'Register', ru: 'Зарегистрироваться', kk: 'Тіркелу' },
  get_bonus: { en: 'Get bonus', ru: 'Получить бонус', kk: 'Бонус алу' },
  open_exchange: { en: 'Open exchange', ru: 'Открыть биржу', kk: 'Биржаны ашу' },
  view_review: { en: 'Read review', ru: 'Читать обзор', kk: 'Шолуды оқу' },
  view_evidence: { en: 'View evidence', ru: 'Смотреть доказательства', kk: 'Дәлелдерді көру' },
};

export interface CtaProfileInput {
  exchangeId: string;
  slug: string;
  availability: AvailabilityState;
  offerEligibility: OfferEligibility;
  approval: ApprovalState;
  /** Internal review/evidence route (must be a local path). Never an affiliate URL. */
  reviewHref: string;
  /** ISO timestamp of the evidence backing this profile. When supplied together
   *  with a clock, stale/future/invalid evidence fail-closes the commercial CTA. */
  evidenceCheckedAt?: string;
}

export interface ResolveCommercialCtaOptions {
  /** Explicit clock (epoch ms) enabling the evidence-freshness gate. */
  now?: number;
}

export interface CommercialCtaModel {
  intent: CtaIntent;
  locale: CtaLocale;
  label: string;
  mode: CtaMode;
  visualState: CtaVisualState;
  interactionState: CtaInteractionState;
  href: string;
  isAffiliate: boolean;
  disabled: boolean;
  /** rel attribute for the rendered anchor; affiliate links are always sponsored+nofollow. */
  rel: string;
  /** Machine-readable reason the commercial action was withheld (or null when live). */
  gateReason: string | null;
}

const GO_PREFIX = '/go/';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function labelFor(intent: CtaIntent, locale: CtaLocale): string {
  const byLocale = ctaLabels[intent];
  if (!byLocale) throw new Error(`Unknown CTA intent: ${String(intent)}`);
  const label = byLocale[locale] ?? byLocale.en;
  if (!label || !label.trim()) throw new Error(`Missing CTA label for ${intent}/${locale}`);
  return label;
}

/**
 * Deterministically resolve a commercial CTA, fail-closed.
 * Never emits a `/go/*` target unless every commercial precondition holds.
 */
export function resolveCommercialCta(
  intent: CtaIntent,
  locale: CtaLocale,
  mode: CtaMode,
  profile: CtaProfileInput,
  options: ResolveCommercialCtaOptions = {},
): CommercialCtaModel {
  if (!isInternalPath(profile.reviewHref)) {
    throw new Error('CTA review href must be a normalized internal path ending with a slash (never affiliate or protocol-relative).');
  }

  const label = labelFor(intent, locale);
  const isCommercialIntent = COMMERCIAL_INTENTS.includes(intent);
  const availabilityAllows = profile.availability === 'available' || profile.availability === 'limited';
  const offerApproved = profile.offerEligibility === 'approved' && profile.approval === 'approved';

  // Evidence-freshness gate (fail-closed): if a clock and an evidence timestamp
  // are both supplied, only 'fresh' evidence may back a commercial affiliate CTA.
  // Absent the timestamp/clock the gate is a no-op (backward compatible).
  const evidenceFresh =
    options.now === undefined || profile.evidenceCheckedAt === undefined
      ? true
      : assessEvidenceFreshness(profile.evidenceCheckedAt, options.now).state === 'fresh';

  // Fail-closed authorization for a live affiliate target.
  const affiliateAuthorized =
    mode === 'production'
    && isCommercialIntent
    && availabilityAllows
    && offerApproved
    && evidenceFresh
    && SLUG_PATTERN.test(profile.slug);

  let visualState: CtaVisualState;
  let gateReason: string | null;
  let href: string;
  let isAffiliate: boolean;
  let disabled: boolean;
  let rel: string;

  if (affiliateAuthorized) {
    visualState = 'commercial';
    gateReason = null;
    href = `${GO_PREFIX}${profile.slug}`;
    isAffiliate = true;
    disabled = false;
    rel = 'sponsored nofollow noopener';
  } else if (profile.availability === 'restricted' || profile.availability === 'unavailable') {
    // No commercial action for restricted/unavailable markets — only review/evidence.
    visualState = profile.availability === 'restricted' ? 'restricted' : 'unavailable';
    gateReason = profile.availability === 'restricted' ? 'MARKET_RESTRICTED' : 'MARKET_UNAVAILABLE';
    href = profile.reviewHref;
    isAffiliate = false;
    disabled = isCommercialIntent; // commercial buttons are visibly disabled; review/evidence stay usable
    rel = 'noopener';
  } else if (isCommercialIntent && mode === 'preview') {
    visualState = 'review';
    gateReason = 'PREVIEW_MODE';
    href = profile.reviewHref;
    isAffiliate = false;
    disabled = false;
    rel = 'noopener';
  } else {
    // Under review / not offer-eligible / stale evidence / unknown availability
    // → internal, non-commercial.
    visualState = 'under_review';
    gateReason = !offerApproved
      ? 'OFFER_NOT_APPROVED'
      : !evidenceFresh
        ? 'EVIDENCE_STALE'
        : 'AVAILABILITY_UNCONFIRMED';
    href = profile.reviewHref;
    isAffiliate = false;
    disabled = false;
    rel = 'noopener';
  }

  const model: CommercialCtaModel = {
    intent,
    locale,
    label,
    mode,
    visualState,
    interactionState: disabled ? 'disabled' : 'default',
    href,
    isAffiliate,
    disabled,
    rel,
    gateReason,
  };

  return assertCommercialCtaModel(model);
}

/** Fail-closed invariant check on a resolved CTA model. Throws on any violation. */
export function assertCommercialCtaModel(model: CommercialCtaModel): CommercialCtaModel {
  if (!model.label || !model.label.trim()) {
    throw new Error('CTA label is required.');
  }
  const validStates: CtaInteractionState[] = ['default', 'hover', 'focus', 'active', 'disabled', 'loading'];
  if (!validStates.includes(model.interactionState)) {
    throw new Error(`Unknown CTA interaction state: ${String(model.interactionState)}`);
  }
  if (model.isAffiliate) {
    if (!model.href.startsWith(GO_PREFIX)) {
      throw new Error('Affiliate CTA must resolve to a /go/ target.');
    }
    if (model.visualState !== 'commercial') {
      throw new Error('Affiliate CTA must be in the commercial visual state.');
    }
    if (!(model.rel.includes('sponsored') && model.rel.includes('nofollow'))) {
      throw new Error('Affiliate CTA must be rel="sponsored nofollow".');
    }
    if (model.disabled) {
      throw new Error('An affiliate CTA cannot be disabled and live at the same time.');
    }
  } else if (model.href.startsWith(GO_PREFIX)) {
    // Safety invariant: only an authorized commercial CTA may point at /go/*.
    throw new Error('Non-commercial CTA must never resolve to a /go/ target.');
  }
  return model;
}
