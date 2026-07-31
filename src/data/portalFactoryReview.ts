export type ReviewTone = 'verified' | 'partial' | 'review' | 'restricted' | 'stale' | 'unknown';

export interface ReviewStatus {
  label: string;
  detail: string;
  tone: ReviewTone;
}

export interface ReviewCandidate {
  exchange: string;
  slug: string;
  state: ReviewStatus;
  evidence: string;
  action: string;
}

export const portalReviewNotice =
  'Review-only fixture. It demonstrates component states and publication gates; it is not a production market conclusion or ranking.';

export const kazakhstanReview = {
  countryId: 'kz',
  name: 'Kazakhstan',
  flag: '🇰🇿',
  locale: 'English review',
  readiness: {
    label: 'Research-rich pilot',
    detail: 'Evidence inventory exists; public page family is not approved yet.',
    tone: 'partial' as const,
  },
  summary:
    'This route demonstrates how a country hub can expose readiness, evidence gaps, local context and page-family links without pretending that unfinished research is approved production truth.',
  metrics: [
    { label: 'Ranking snapshot', value: 'Not approved', tone: 'review' as const },
    { label: 'Market profiles', value: 'In assembly', tone: 'partial' as const },
    { label: 'Public locales', value: 'Not activated', tone: 'review' as const },
    { label: 'Next gate', value: 'Evidence validation', tone: 'unknown' as const },
  ],
  topics: [
    {
      title: 'Exchange availability',
      text: 'Country-specific availability is rendered only from approved Exchange × Country market profiles.',
      tone: 'partial' as const,
    },
    {
      title: 'Local payments and P2P',
      text: 'Payment methods, fiat support and P2P claims remain hidden until source packets pass freshness and conflict checks.',
      tone: 'review' as const,
    },
    {
      title: 'Offers and affiliate actions',
      text: 'A global offer never becomes a local CTA automatically. The country binding must be separately approved.',
      tone: 'verified' as const,
    },
  ],
};

export const kazakhstanCandidates: ReviewCandidate[] = [
  {
    exchange: 'Binance',
    slug: 'binance',
    state: {
      label: 'Research record available',
      detail: 'Country ranking and local offer remain under review.',
      tone: 'partial',
    },
    evidence: 'Deep-research record completed; ranking placement not approved.',
    action: 'Open review fixture',
  },
  {
    exchange: 'Bybit',
    slug: 'bybit',
    state: {
      label: 'Market profile required',
      detail: 'No approved country ranking position.',
      tone: 'review',
    },
    evidence: 'Candidate inventory only.',
    action: 'View candidate state',
  },
  {
    exchange: 'OKX',
    slug: 'okx',
    state: {
      label: 'Evidence intake prepared',
      detail: 'No approved country ranking position.',
      tone: 'review',
    },
    evidence: 'Prepared intake is not a publication approval.',
    action: 'View candidate state',
  },
];

export const binanceKazakhstanPassport = {
  exchange: 'Binance',
  exchangeSlug: 'binance',
  country: 'Kazakhstan',
  countryFlag: '🇰🇿',
  state: {
    label: 'Under review',
    detail: 'Research exists, but public local conclusions and offer activation are not approved.',
    tone: 'review' as const,
  },
  fields: [
    {
      label: 'Local availability',
      value: 'Publication conclusion pending',
      note: 'The template fails closed until an approved market profile exists.',
      tone: 'review' as const,
    },
    {
      label: 'KYC and account requirements',
      value: 'Approved structured claim required',
      note: 'Translations cannot alter the final requirement state.',
      tone: 'unknown' as const,
    },
    {
      label: 'KZT / local payments',
      value: 'Evidence validation pending',
      note: 'Raw parser output cannot populate this block.',
      tone: 'partial' as const,
    },
    {
      label: 'P2P and products',
      value: 'Conflict and freshness checks required',
      note: 'Stale or contradictory evidence produces a re-review state.',
      tone: 'stale' as const,
    },
    {
      label: 'Local offer binding',
      value: 'No affiliate CTA',
      note: 'Research completion does not activate a referral campaign.',
      tone: 'verified' as const,
    },
  ],
  sources: [
    'Official exchange source class',
    'Country/regulator source class',
    'Approved research record',
    'Material-change history',
  ],
};
