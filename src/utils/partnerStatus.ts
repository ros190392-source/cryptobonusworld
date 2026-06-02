/**
 * partnerStatus.ts — Partner relationship tier logic
 *
 * full    — active affiliate partnership; referral links, bonus CTAs, tracking redirects
 * limited — no active affiliate deal; plain links, no bonus CTA, neutral "Visit" button
 * pending — partnership in negotiation; treated as limited until confirmed full
 */

export type PartnerStatus = 'full' | 'limited' | 'pending';

/** Read partner_status from any exchange-shaped object; defaults to 'full'. */
export function getPartnerStatus(exchange: any): PartnerStatus {
  return (exchange?.partner_status as PartnerStatus) ?? 'full';
}

export const isLimited  = (ex: any): boolean => getPartnerStatus(ex) === 'limited';
export const isPending  = (ex: any): boolean => getPartnerStatus(ex) === 'pending';
export const isFullPartner = (ex: any): boolean => getPartnerStatus(ex) === 'full';

/**
 * Whether this exchange should show bonus-specific CTAs.
 * Hidden for limited and pending partners.
 */
export const showBonusCta = (ex: any): boolean => isFullPartner(ex);

/**
 * CTA label for a given exchange.
 * - full:    "Claim {name} Bonus →" (or whatever the caller provides)
 * - limited/pending: "Visit {name} →"
 */
export function neutralCtaLabel(name: string): string {
  return `Visit ${name} →`;
}

/**
 * rel attribute string.
 * - full: includes "sponsored" (paid affiliate link)
 * - limited/pending: no "sponsored" (plain direct link)
 */
export function ctaRel(ex: any): string {
  return isFullPartner(ex)
    ? 'noopener noreferrer nofollow sponsored'
    : 'noopener noreferrer nofollow';
}
