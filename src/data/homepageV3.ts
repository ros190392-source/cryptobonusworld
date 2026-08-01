export const homepagePathways = [
  {
    number: '01',
    title: 'Choose a market',
    text: 'Country controls availability, restrictions, KYC and local payment context.',
  },
  {
    number: '02',
    title: 'Compare evidence states',
    text: 'Verified offers, research records and profiles under review remain visibly separate.',
  },
  {
    number: '03',
    title: 'Check the terms',
    text: 'Open the exchange profile and confirm current regional terms before registering or depositing.',
  },
] as const;

export const homepageCountryCards = [
  {
    flag: '🇰🇿',
    name: 'Kazakhstan',
    note: 'Three validated review profiles and a governed evidence matrix.',
    status: 'Pilot · review only',
    tone: 'pilot',
  },
  {
    flag: '🇵🇱',
    name: 'Poland',
    note: 'European regulatory and country evidence is being normalized.',
    status: 'Profiles in progress',
    tone: 'progress',
  },
  {
    flag: '🇩🇪',
    name: 'Germany',
    note: 'Existing GEO evidence is queued for the new profile contracts.',
    status: 'Under review',
    tone: 'review',
  },
  {
    flag: '🇧🇷',
    name: 'Brazil',
    note: 'Planned market expansion after the first country factory pilot.',
    status: 'Source mapping planned',
    tone: 'planned',
  },
] as const;

export const homepageTrustItems = [
  {
    number: '01',
    title: 'Official-source-first',
    text: 'Regulators and exchange-owned sources lead evidence collection.',
  },
  {
    number: '02',
    title: 'Country-specific truth',
    text: 'Global exchange facts never silently override local restrictions.',
  },
  {
    number: '03',
    title: 'Freshness and limitations',
    text: 'Checked dates, gaps and conflicts remain visible instead of being smoothed over.',
  },
  {
    number: '04',
    title: 'Affiliate separation',
    text: 'Commercial status cannot create a ranking row or improve its position.',
  },
] as const;

export const homepageUpdates = [
  {
    date: 'July 2026',
    label: 'Research record',
    title: 'Binance Kazakhstan evidence lifecycle completed',
    detail: 'Local entity, licence, KYC and public P2P surfaces mapped with explicit limitations.',
  },
  {
    date: 'July 2026',
    label: 'Product update',
    title: 'One governed Homepage Top-10 published',
    detail: 'Verified offers and neutral research rows now share one clearly labeled comparison surface.',
  },
  {
    date: 'In progress',
    label: 'Platform work',
    title: 'Country and language foundations',
    detail: 'Country facts and translated presentation are being built as separate controlled layers.',
  },
] as const;

export const homepageGuideBlocks = [
  {
    h3: 'What is a crypto referral code?',
    p: 'A crypto referral code (also called a promo code or invite code) is a short identifier you enter during sign-up at a crypto exchange. It links your new account to a partner, which can unlock a welcome bonus, fee discount, or other new-user reward that is not available to accounts created without a code.',
  },
  {
    h3: 'How to claim a crypto sign-up bonus',
    p: 'Open the exchange’s official offer page through a verified link, create a new account, and apply the code if it is not already pre-filled. Most exchanges also require identity verification (KYC) and a qualifying deposit before any reward becomes available — complete these steps before making further deposits so you do not miss a bonus tier.',
  },
  {
    h3: 'Why bonus amounts are not guaranteed',
    p: 'Advertised bonus figures are maximum amounts, not typical results. Reaching the full advertised amount usually requires completing several tasks — a deposit above a set threshold, a minimum trading volume, and finishing KYC — within a limited time window, often 30 days. Most users receive a partial reward rather than the headline figure.',
  },
  {
    h3: 'Common bonus requirements',
    p: 'Bonus programs vary by exchange, but frequently include identity verification (KYC), a minimum first deposit, a trading volume milestone, and a deadline to complete all tasks. Some rewards are issued as trading fee vouchers rather than withdrawable cash. Always read the current terms on the exchange’s official page before depositing.',
  },
  {
    h3: 'Referral link vs promo code',
    p: 'A referral link and a promo code often unlock the same offer, but work differently. A referral link usually applies the code automatically when you register through it. A promo code must be entered manually during sign-up, typically in a dedicated field. We list both where available — use the link where possible, and keep the code visible as a backup.',
  },
  {
    h3: 'How CryptoBonusWorld checks exchange codes',
    p: 'We check each listed code and bonus offer directly against the exchange’s own promotions page, not third-party forums or expired affiliate databases. Each exchange page on this site shows the date it was last verified. Promotions change frequently — if something looks outdated, check the individual exchange page for the latest information.',
  },
] as const;

export const homepageFaqs = [
  {
    q: 'What is a crypto referral code?',
    a: 'It’s a code entered at sign-up that links your account to a partner offer. Applying it can unlock a welcome bonus or fee discount that is not available otherwise. See the guide above for more detail on how these work.',
  },
  {
    q: 'Do I need to enter the code manually?',
    a: 'It depends on the exchange. Some auto-apply the code when you use our link — you just complete registration. Others require you to paste the code into a field during signup. Copy the code before clicking, just in case.',
  },
  {
    q: 'Are crypto exchange bonuses guaranteed?',
    a: 'No. Welcome bonuses are not guaranteed for every user. Advertised amounts are maximums — reaching them typically requires completing multiple tasks such as a deposit, a trading volume milestone, and KYC within a set window. Many users receive a partial bonus. Always read the full terms on the exchange’s official website before depositing.',
  },
  {
    q: 'Why do offers differ by country?',
    a: 'Bonus programs are subject to local regulations, exchange licensing, and KYC requirements. An offer available in one country may be restricted or unavailable in another. Always check the exchange’s terms for your region before signing up.',
  },
  {
    q: 'Are these affiliate links?',
    a: 'Yes. Links marked “Check offer” are affiliate referral links. If you register through one, CryptoBonusWorld may earn a commission from the exchange. This does not cost you anything extra and does not change your bonus. See our affiliate disclosure for details.',
  },
  {
    q: 'Which exchange bonus is best?',
    a: 'There is no single “best” bonus for everyone — it depends on your priorities, region, eligibility, and how much activity each reward requires. Compare the verification badge and current details on each exchange page before deciding.',
  },
  {
    q: 'How often are codes checked?',
    a: 'We check each exchange’s promo codes regularly, with the date of the last check shown on each exchange page. Promotions change frequently — if a code looks outdated, check the most recent version on the official exchange website.',
  },
  {
    q: 'Can a code expire?',
    a: 'Yes. Exchanges can change or discontinue a promo code or referral offer at any time, without notice. We recheck listed codes regularly and update or remove them if they stop working. If a code on this site appears expired, check the individual exchange page for the latest version.',
  },
] as const;

export const homepageFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: homepageFaqs.map(item => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
} as const;
