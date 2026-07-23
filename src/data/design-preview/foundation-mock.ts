/**
 * DESIGN PREVIEW — MOCK SPECIMEN DATA ONLY.
 *
 * Mock data for the unified design foundation specimen at /__design/foundation/.
 * Nothing here is production data; no code, bonus, ranking or eligibility value
 * is verified; no canonical Market Intelligence binding. Do not import this
 * file from any production page.
 */

export type AvailabilityState =
  | 'AVAILABLE'
  | 'AVAILABLE_WITH_LIMITS'
  | 'RESTRICTED'
  | 'UNDER_REVIEW';

export interface OfferSpecimen {
  key: string;
  registryKey: string;
  exchangeName: string;
  state: AvailabilityState;
  /** meaningful only for AVAILABLE_WITH_LIMITS */
  referralCompatibilityVerified: boolean;
  countryContext: string;
  verdict: string;
  bonusLabel: string | null;
  promoCode: string | null;
  limitationText: string | null;
  restrictionText: string | null;
  eligibilityNote: string;
  evidenceLabel: string;
}

export const MOCK_COUNTRY = 'Kazakhstan';
export const MOCK_EVIDENCE = 'Design preview — mock data · nothing on this page is verified';

const spec = (o: Partial<OfferSpecimen> & Pick<OfferSpecimen, 'key' | 'registryKey' | 'exchangeName' | 'state'>): OfferSpecimen => ({
  referralCompatibilityVerified: false,
  countryContext: MOCK_COUNTRY,
  verdict: 'Mock verdict for the design foundation specimen.',
  bonusLabel: null,
  promoCode: null,
  limitationText: null,
  restrictionText: null,
  eligibilityNote: 'New users only · mock eligibility note',
  evidenceLabel: MOCK_EVIDENCE,
  ...o,
});

/** The five required state configurations (shared by the state matrix + variants). */
export const STATE_MATRIX: OfferSpecimen[] = [
  spec({
    key: 'AVAILABLE',
    registryKey: 'bybit', exchangeName: 'Bybit', state: 'AVAILABLE',
    verdict: 'Deep liquidity and task-based welcome rewards — mock verdict.',
    bonusLabel: 'Welcome offer (mock)', promoCode: 'CRYPTOBONUSW',
  }),
  spec({
    key: 'LIMITED_VERIFIED',
    registryKey: 'kucoin', exchangeName: 'KuCoin', state: 'AVAILABLE_WITH_LIMITS',
    referralCompatibilityVerified: true,
    verdict: 'Usable in this mock region with product limitations — mock verdict.',
    bonusLabel: 'Welcome offer (mock)', promoCode: 'CBWKUCOIN',
    limitationText: 'Some products limited in this mock region (mock)',
    eligibilityNote: 'Mock referral compatibility verified',
  }),
  spec({
    key: 'LIMITED_UNVERIFIED',
    registryKey: 'bingx', exchangeName: 'BingX', state: 'AVAILABLE_WITH_LIMITS',
    referralCompatibilityVerified: false,
    verdict: 'Available with limits, but local referral eligibility is not verified — mock verdict.',
    limitationText: 'Some products limited in this mock region (mock)',
    eligibilityNote: 'Local referral eligibility is not verified for this mock region — no code is shown.',
  }),
  spec({
    key: 'RESTRICTED',
    registryKey: 'mexc', exchangeName: 'MEXC', state: 'RESTRICTED',
    verdict: 'Current terms list this mock region as a prohibited jurisdiction — mock presentation.',
    restrictionText:
      'Restricted in Kazakhstan (mock): the exchange’s terms list the region as prohibited. ' +
      'This is a legal/eligibility state, not a claim about technical reachability.',
    eligibilityNote: 'No promo code or registration action is shown for restricted regions.',
  }),
  spec({
    key: 'UNDER_REVIEW',
    registryKey: 'coinex', exchangeName: 'CoinEx', state: 'UNDER_REVIEW',
    verdict: 'Country evidence is currently under review — mock presentation.',
    eligibilityNote: 'No locally eligible promo claim is made while evidence is under review.',
  }),
];

export const BY_KEY: Record<string, OfferSpecimen> =
  Object.fromEntries(STATE_MATRIX.map((s) => [s.key, s]));

/** Additional identities for the variant demonstrations. */
export const EXTRA_SPECIMENS: Record<string, OfferSpecimen> = {
  okx: spec({
    key: 'OKX_AVAILABLE', registryKey: 'okx', exchangeName: 'OKX', state: 'AVAILABLE',
    verdict: 'Broad product set with Web3 wallet — mock verdict.',
    bonusLabel: 'Welcome offer (mock)', promoCode: 'CBWOKX2026',
  }),
  bitget: spec({
    key: 'BITGET_AVAILABLE', registryKey: 'bitget', exchangeName: 'Bitget', state: 'AVAILABLE',
    verdict: 'Copy trading and low entry limits — mock verdict.',
    bonusLabel: 'Welcome offer (mock)', promoCode: 'CBWBITGET',
  }),
  binance: spec({
    key: 'BINANCE_AVAILABLE', registryKey: 'binance', exchangeName: 'Binance', state: 'AVAILABLE',
    verdict: 'Largest global spot volume — mock verdict.',
    bonusLabel: 'Welcome offer (mock)', promoCode: 'CBWBNB2026',
  }),
};

/** Exchanges shown in the square-logo gallery (the full prototype universe). */
export const GALLERY_ORDER = [
  'bybit', 'okx', 'bitget', 'kucoin', 'bingx', 'binance',
  'phemex', 'gate-io', 'htx', 'coinex', 'mexc',
] as const;
