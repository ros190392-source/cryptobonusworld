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
  status: 'verified' | 'public-preview' | 'unverified' | 'expired';
  termsSummary: string;
}

export const offers: Offer[] = [
  {
    exchangeSlug:        'bybit',
    promoCode:           'CRYPTOBONUSW',
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
  {
    exchangeSlug:        'mexc',
    promoCode:           'mexc-CryptoBonus',
    bonusHeadline:       'Up to 10,000 USDT in new user rewards',
    realisticValue:      'Most new users earn 30–150 USDT; base signup reward requires no KYC or deposit; higher tiers require trading volume',
    lastChecked:         'June 2026',
    sourceUrl:           'https://www.mexc.com/activity/new-user',
    kycRequired:         false,
    depositRequired:     false,
    minDeposit:          'No deposit required for base signup tier',
    availability:        'Global (excluding restricted regions)',
    restrictedCountries: ['US', 'UK', 'CA', 'SG', 'HK', 'CN', 'KP', 'CU', 'SD', 'IR'],
    status:              'public-preview',
    termsSummary:        'New accounts only. No KYC required for base tier. Higher tiers require trading volume. Bonus tasks expire within 30 days. Rewards depend on region, eligibility, deposit and trading activity. Full terms on MEXC official website.',
  },
  {
    exchangeSlug:        'bitget',
    promoCode:           'CryptoBonW',
    bonusHeadline:       'Up to 6,200 USDT Welcome Package',
    realisticValue:      'Task-based reward; most users completing KYC and a standard deposit earn a meaningful first-week reward; the 6,200 USDT maximum requires all volume milestones within the 30-day window',
    lastChecked:         'June 2026',
    sourceUrl:           'https://www.bitget.com/en/activity/newcomer-rewards',
    kycRequired:         true,
    depositRequired:     true,
    minDeposit:          'Minimum deposit required to unlock bonus tiers',
    availability:        'Global (excluding restricted regions)',
    restrictedCountries: ['US', 'UK', 'CA'],
    status:              'verified',
    termsSummary:        'New accounts only. KYC required for bonus eligibility and withdrawals. Rewards are trading fee vouchers — not withdrawable cash. Tasks expire 30 days after registration. Full terms on Bitget official website.',
  },
  {
    exchangeSlug:        'okx',
    promoCode:           'CRYPTOBONUSW',
    bonusHeadline:       'Up to 5,000 USDT in welcome rewards',
    realisticValue:      'Rewards depend on deposit size and trading tasks; vouchers reduce trading fees but cannot be withdrawn directly as cash',
    lastChecked:         'June 2026',
    sourceUrl:           'https://www.okx.com/learn/okx-new-user-rewards',
    kycRequired:         true,
    depositRequired:     true,
    minDeposit:          'Minimum deposit required to unlock bonus tiers',
    availability:        'Global (excluding restricted regions)',
    restrictedCountries: ['US', 'HK', 'SG', 'MY', 'CA', 'GB'],
    status:              'verified',
    termsSummary:        'New accounts only. KYC required for higher tiers and withdrawals. Rewards are fee vouchers offsetting trading costs, not withdrawable cash. Tasks expire 30 days after account creation. Full terms on OKX official website.',
  },
  {
    exchangeSlug:        'kucoin',
    promoCode:           'CRYPTOBONW',
    bonusHeadline:       'New user welcome rewards — claim via referral code',
    realisticValue:      'Task-based reward; exact amount depends on deposit size, trading activity, and tasks completed in the KuCoin Bonus Center',
    lastChecked:         'May 2026',
    sourceUrl:           'https://www.kucoin.com/activity/new-user-rewards',
    kycRequired:         false,
    depositRequired:     true,
    minDeposit:          'Deposit required for most bonus tiers; base signup tier may have no deposit requirement',
    availability:        'Global (excluding restricted regions)',
    restrictedCountries: ['US'],
    status:              'public-preview',
    termsSummary:        'New accounts only. KYC optional for base tier (1 BTC/day withdrawal without KYC). Higher bonus tiers require deposit and trading volume. Bonus tasks expire within 30 days. Rewards depend on region, eligibility, and trading activity. Full terms on KuCoin official website.',
  },
];

export function getOffer(exchangeSlug: string): Offer | undefined {
  return offers.find(o => o.exchangeSlug === exchangeSlug && o.status !== 'expired');
}
