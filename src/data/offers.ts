// Clean MVP offers data
// Volatile data (codes, amounts, dates) lives here — never inside images

export interface Offer {
  exchangeSlug: string;
  promoCode: string;
  bonusHeadline: string;
  realisticValue: string;
  feeDiscount?: string;
  lastChecked: string;
  sourceUrl: string;
  kycRequired: boolean;
  depositRequired: boolean;
  minDeposit?: string;
  availability: string;     // "Global" or comma-separated regions
  restrictedCountries?: string[];
  status: 'verified' | 'unverified' | 'expired';
  termsSummary: string;
}

export const offers: Offer[] = [
  {
    exchangeSlug:        'bybit',
    promoCode:           'BYBONUS',
    bonusHeadline:       'Up to 30,000 USDT Welcome Package',
    realisticValue:      'New users typically earn $30–$200 depending on deposit size and trading activity',
    feeDiscount:         'Up to 50% fee discount on select trading pairs',
    lastChecked:         'June 2026',
    sourceUrl:           'https://www.bybit.com/en/promo/new-user/',
    kycRequired:         true,
    depositRequired:     true,
    minDeposit:          'Minimum deposit varies by bonus tier',
    availability:        'Global (excluding restricted regions)',
    restrictedCountries: ['US', 'UK', 'CA', 'SG', 'NL'],
    status:              'verified',
    termsSummary:        'New accounts only. KYC required to withdraw. Trading volume conditions apply to higher tiers. Vouchers expire 7–30 days after issuance. Full terms on Bybit official website.',
  },
];

export function getOffer(exchangeSlug: string): Offer | undefined {
  return offers.find(o => o.exchangeSlug === exchangeSlug && o.status !== 'expired');
}
