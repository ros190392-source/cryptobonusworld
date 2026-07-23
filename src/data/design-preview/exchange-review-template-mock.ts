/**
 * DESIGN PREVIEW — MOCK DATA ONLY.
 *
 * Mock state configuration for the isolated exchange-review template
 * prototype at /__design/exchange-review-template/.
 *
 * Nothing here is production data. No value is verified. No affiliate
 * route is referenced. Do not import this file from any production page.
 */

export type PreviewStateKey = 'AVAILABLE' | 'AVAILABLE_WITH_LIMITS' | 'RESTRICTED';

export interface PreviewState {
  /** which baked-in brand identity block to show */
  brand: 'bybit' | 'mexc';
  exchangeName: string;
  pageTitle: string;
  availabilityLabel: string;
  badgeText: string;
  badgeKind: 'green' | 'amber' | 'red';
  verdict: string;
  bonusLabel: string | null;
  promoCode: string | null;
  /** AVAILABLE_WITH_LIMITS only — mock referral-compatibility flag default */
  referralCompatibilityVerified?: boolean;
  /** promo code shown when refCompat=false in limited state? never */
  ctaLabelTop: string;
  ctaLabelBottom: string;
  /** 'claim' renders the green affiliate-style CTA; 'neutral' renders a non-affiliate action */
  ctaKind: 'claim' | 'neutral';
  eligibilityNote: string;
  termsWarning: string;
  limitNotice: string | null;
  restrictNotice: string | null;
  altActionLabel: string | null;
  finalVerdict: string;
  factsAvailability: string;
}

export const LAST_CHECKED_LABEL = 'Design preview — mock data';

export const PREVIEW_STATES: Record<PreviewStateKey, PreviewState> = {
  AVAILABLE: {
    brand: 'bybit',
    exchangeName: 'Bybit',
    pageTitle: 'Bybit Referral Code and Exchange Review',
    availabilityLabel: 'Available globally (mock preview)',
    badgeText: 'Available',
    badgeKind: 'green',
    verdict:
      'A complete welcome offer with promo code, task-based rewards and fee discounts — mock verdict for design preview.',
    bonusLabel: 'Welcome offer available for eligible users',
    promoCode: 'CRYPTOBONUSW',
    ctaLabelTop: 'Claim Bonus',
    ctaLabelBottom: 'Claim Bonus',
    ctaKind: 'claim',
    eligibilityNote:
      'New users only · rewards depend on completed tasks · mock eligibility note for design preview.',
    termsWarning:
      'Bonus terms, deadlines and regional eligibility apply. Prototype copy — no value on this page is verified.',
    limitNotice: null,
    restrictNotice: null,
    altActionLabel: null,
    finalVerdict:
      'Strong welcome package and low fees make this a solid first exchange — mock closing verdict for design preview.',
    factsAvailability: 'Global (restricted regions apply)',
  },

  AVAILABLE_WITH_LIMITS: {
    brand: 'bybit',
    exchangeName: 'Bybit',
    pageTitle: 'Bybit Referral Code and Exchange Review',
    availabilityLabel: 'Available with limits (mock preview)',
    badgeText: 'Available with limits',
    badgeKind: 'amber',
    verdict:
      'The exchange is usable in this mock region, but parts of the welcome offer are limited — mock verdict for design preview.',
    bonusLabel: 'Welcome offer available for eligible users',
    promoCode: 'CRYPTOBONUSW',
    referralCompatibilityVerified: true,
    ctaLabelTop: 'Claim Bonus',
    ctaLabelBottom: 'Claim Bonus',
    ctaKind: 'claim',
    eligibilityNote:
      'Some products and promotions are limited in this mock region · mock eligibility note for design preview.',
    termsWarning:
      'Regional limitations apply to parts of this offer. Prototype copy — no value on this page is verified.',
    limitNotice:
      'Limited availability: derivatives access and some promotions are restricted in this mock region. Referral rewards may differ from the global program.',
    restrictNotice: null,
    altActionLabel: null,
    finalVerdict:
      'Usable with limitations — check regional terms before registering. Mock closing verdict for design preview.',
    factsAvailability: 'Available with regional limits (mock)',
  },

  RESTRICTED: {
    brand: 'mexc',
    exchangeName: 'MEXC',
    pageTitle: 'MEXC Availability Review — Kazakhstan',
    availabilityLabel: 'Kazakhstan (mock preview)',
    badgeText: 'Restricted in Kazakhstan',
    badgeKind: 'red',
    verdict:
      'Current exchange terms list Kazakhstan as a prohibited jurisdiction — mock restricted-state presentation for design preview.',
    bonusLabel: null,
    promoCode: null,
    ctaLabelTop: 'View Available Alternatives',
    ctaLabelBottom: 'View Available Alternatives',
    ctaKind: 'neutral',
    eligibilityNote:
      'No promo code or bonus claim is shown for restricted regions.',
    termsWarning:
      'This is a legal / eligibility restriction based on the exchange’s own terms. It does not describe whether the website is technically reachable.',
    limitNotice: null,
    restrictNotice:
      'Restricted in Kazakhstan: the exchange’s current terms list Kazakhstan as a prohibited jurisdiction, and new registrations are not accepted. Mock example modeled on the MEXC × Kazakhstan restricted presentation state — design preview only.',
    altActionLabel: 'View Available Alternatives',
    finalVerdict:
      'Not available for this region — consider the reviewed alternatives instead. Mock closing verdict for design preview.',
    factsAvailability: 'Restricted in Kazakhstan (mock)',
  },
};
