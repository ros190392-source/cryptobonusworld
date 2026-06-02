/**
 * Editorial Team Registry — CryptoBonusWorld
 * =============================================
 *
 * Central source of truth for all reviewers, analysts, and editorial staff.
 * Referenced by:
 *   - ReviewerBlock component (per-page author attribution)
 *   - /reviewers/ index page
 *   - /reviewers/[slug]/ individual profile pages
 *   - schema.org Person entities
 *
 * Guidelines for adding reviewers:
 *   - bio must be 100+ characters (E-E-A-T signal)
 *   - expertise must list 3+ specific skills
 *   - reviewedExchanges should list 3+ exchanges reviewed
 */

export interface ReviewerProfile {
  slug: string;
  name: string;
  title: string;
  /** Short 1-sentence role description */
  roleTag: string;
  /** Initials for avatar fallback */
  initials: string;
  /** Photo path (relative to /public) — null if no photo */
  photo: string | null;
  /** 100–250 character bio for schema.org */
  bio: string;
  /** Full bio paragraphs for profile page */
  fullBio: string[];
  /** Specific areas of expertise */
  expertise: string[];
  /** Exchanges personally reviewed by this person */
  reviewedExchanges: string[];  // exchange slugs
  /** Social / professional links */
  links?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  /** When this reviewer joined the team */
  joinedAt: string;
  /** ISO date of most recent review activity */
  lastActiveAt: string;
  /** Total exchange reviews completed */
  reviewCount: number;
  /** Feature articles written */
  articleCount: number;
  /** Rating for displayed credibility */
  credibilityScore: number;  // 0–100
  /** Active = show on site; inactive = archived */
  status: 'active' | 'inactive';
}

export const EDITORIAL_TEAM: ReviewerProfile[] = [
  {
    slug: 'alexandr-shadurskyi',
    name: 'Oleksandr Shadurskyi',
    title: 'Crypto Exchange Analyst & Editor-in-Chief',
    roleTag: 'Editor-in-Chief',
    initials: 'AS',
    photo: '/avatars/alexandr-shadurskyi.webp',
    bio: 'Oleksandr Shadurskyi is a crypto affiliate marketer with 15 years in the industry and a hands-on crypto trader since 2019. He founded CryptoBonusWorld to cut through inflated bonus claims with independently verified, real-account data.',
    fullBio: [
      'Oleksandr Shadurskyi has been working in affiliate marketing since 2011 — a time when SEO meant link directories and "content marketing" was not yet a phrase. Over 15 years he has built and operated traffic projects across finance, software, and e-commerce verticals, developing a sharp eye for the gap between what platforms promise and what users actually receive.',
      'He entered the crypto space in 2019 as a trader, not a spectator. Going through exchange registrations, bonus activations, KYC queues, and withdrawal processes firsthand gave him a perspective most review sites lack: the frustration of a real user hitting a hidden condition at the worst possible moment.',
      'That frustration is the reason CryptoBonusWorld exists. Oleksandr built the site with one editorial rule: every bonus amount shown reflects what a typical user earns under standard conditions, not the theoretical ceiling reserved for six-figure depositors. When a bonus requires a $10,000 deposit to unlock its headline number, that is stated plainly — not buried in a footnote.',
      'Today he personally tests registration flows, bonus activation steps, and withdrawal conditions across all exchanges on the site using real accounts, cross-referencing against official terms pages. His affiliate background means he understands how exchange promotional copy is written — and exactly where to look for the catches.',
    ],
    expertise: [
      'Crypto exchange bonus structure analysis',
      'KYC and registration flow testing',
      'Deposit and withdrawal verification',
      'Exchange fee and spread comparison',
      'No-KYC platform research',
      'Futures and derivatives products',
    ],
    reviewedExchanges: [
      'bybit', 'mexc', 'okx', 'binance', 'bitget', 'bingx',
      'kucoin', 'gate-io', 'htx', 'coinex', 'phemex', 'bitunix', 'lbank',
    ],
    links: {},
    joinedAt: '2024-01-01',
    lastActiveAt: '2026-05-26',
    reviewCount: 13,
    articleCount: 32,
    credibilityScore: 95,
    status: 'active',
  },
  {
    slug: 'editorial-team',
    name: 'CryptoBonusWorld Editorial Team',
    title: 'Crypto Exchange Analysts',
    roleTag: 'Multi-person review team',
    initials: 'CB',
    photo: null,
    bio: 'Our editorial team manually verifies all bonus amounts, conditions and exchange data against official promotion pages. We do not accept payment for ratings or reviews.',
    fullBio: [
      'The CryptoBonusWorld editorial team consists of crypto market analysts, former exchange employees, and independent researchers who specialise in evaluating promotional offers across centralised exchanges.',
      'Every exchange listing on this site is verified against the exchange\'s official promotion page, terms and conditions, and — where possible — confirmed through test account sign-ups.',
      'We maintain strict editorial independence. No exchange pays for a favourable rating or position. Affiliate relationships (disclosed on each page) fund our research but do not influence our scores.',
    ],
    expertise: [
      'Crypto exchange bonus analysis',
      'KYC/AML compliance evaluation',
      'Futures and derivatives products',
      'No-KYC exchange research',
      'Deposit and withdrawal testing',
      'Fee structure analysis',
    ],
    reviewedExchanges: [
      'bybit', 'mexc', 'okx', 'binance', 'bitget', 'bingx',
      'kucoin', 'gate-io', 'htx', 'coinex', 'phemex', 'bitunix', 'lbank',
    ],
    links: {},
    joinedAt: '2024-01-01',
    lastActiveAt: '2026-05-25',
    reviewCount: 13,
    articleCount: 25,
    credibilityScore: 92,
    status: 'active',
  },
  {
    slug: 'alex-morgan',
    name: 'Alex Morgan',
    title: 'Senior Crypto Exchange Analyst',
    roleTag: 'Lead exchange reviewer',
    initials: 'AM',
    photo: null,
    bio: 'Alex has 6 years of experience in crypto markets, specialising in derivatives exchanges and bonus structure analysis. Former compliance officer at a European crypto brokerage.',
    fullBio: [
      'Alex Morgan has been active in the cryptocurrency industry since 2018, initially as a derivatives trader before transitioning into market research and exchange analysis.',
      'With a background in financial compliance — including 2 years as a compliance analyst at a regulated European crypto brokerage — Alex brings a regulatory lens to every exchange review, evaluating not just the bonus offer but the operational legitimacy of each platform.',
      'Alex leads the methodology framework for how CryptoBonusWorld scores KYC requirements, deposit conditions, and trading volume thresholds. His approach is data-driven: every score is backed by specific, sourced evidence.',
      'When not reviewing exchanges, Alex contributes to open-source crypto research and writes about the intersection of regulation and retail trading.',
    ],
    expertise: [
      'Crypto derivatives and futures trading',
      'KYC/AML regulatory compliance',
      'Exchange bonus structure analysis',
      'Risk management frameworks',
      'European crypto regulation (MiCA, FCA)',
      'Trading fee and spread analysis',
    ],
    reviewedExchanges: ['bybit', 'okx', 'binance', 'phemex', 'gate-io', 'htx'],
    links: {
      twitter: 'https://twitter.com/',
    },
    joinedAt: '2024-03-01',
    lastActiveAt: '2026-05-20',
    reviewCount: 8,
    articleCount: 14,
    credibilityScore: 88,
    status: 'active',
  },
  {
    slug: 'sarah-chen',
    name: 'Sarah Chen',
    title: 'No-KYC & Privacy Research Specialist',
    roleTag: 'Privacy & no-KYC exchange specialist',
    initials: 'SC',
    photo: null,
    bio: 'Sarah specialises in no-KYC and privacy-preserving crypto exchanges. She has personally tested withdrawal limits, deposit flows, and bonus activation on 9 major no-KYC platforms.',
    fullBio: [
      'Sarah Chen joined the CryptoBonusWorld team after three years of independent research into privacy-preserving financial tools, focusing on non-custodial and no-KYC cryptocurrency exchanges.',
      'Her research approach is hands-on: Sarah maintains active accounts on multiple no-KYC platforms and regularly tests deposit limits, withdrawal conditions, and bonus claim processes first-hand rather than relying solely on published terms.',
      'Sarah\'s work specifically addresses the needs of users in jurisdictions with restrictive crypto regulations, users who face barriers to identity verification, and privacy-conscious traders. She is careful to distinguish between exchanges that offer privacy as a feature versus those that simply have not implemented KYC yet.',
      'She holds a strong editorial position: a no-KYC exchange is only rated positively if it can demonstrate operational stability, user fund security, and transparent business practices.',
    ],
    expertise: [
      'No-KYC exchange evaluation',
      'Privacy-preserving crypto tools',
      'KYC tier analysis (Level 0 / Level 1 / Level 2)',
      'Withdrawal limit testing',
      'Exchange security review',
      'Stablecoin deposit and withdrawal flows',
    ],
    reviewedExchanges: ['mexc', 'kucoin', 'coinex', 'bitunix', 'lbank', 'bingx'],
    links: {},
    joinedAt: '2024-06-01',
    lastActiveAt: '2026-05-18',
    reviewCount: 7,
    articleCount: 10,
    credibilityScore: 85,
    status: 'active',
  },
  {
    slug: 'james-okonkwo',
    name: 'James Okonkwo',
    title: 'Copy Trading & DeFi Products Analyst',
    roleTag: 'Copy trading & emerging features analyst',
    initials: 'JO',
    photo: null,
    bio: 'James evaluates copy trading platforms, automated trading features, and web3 wallet integrations. He has tested copy trading products on Bitget, OKX, and BingX with real positions.',
    fullBio: [
      'James Okonkwo brings a practitioner\'s perspective to copy trading analysis — he is an active copy trading user who has tested signal provider quality, drawdown management, and profit-sharing mechanics across multiple platforms.',
      'Before joining CryptoBonusWorld, James worked as a fintech product analyst, evaluating trading platforms for institutional clients. This background informs his structured approach to assessing user experience, feature reliability, and product roadmap maturity.',
      'His exchange reviews go beyond the welcome bonus to evaluate the overall product quality: how easy is the copy trading interface to navigate? What are the minimum investment sizes? How transparent are provider performance statistics?',
      'James also covers web3 wallet integrations, DeFi access features, and on-chain earning products offered by centralised exchanges — an increasingly important differentiator as CEXs expand their product range.',
    ],
    expertise: [
      'Copy trading platform evaluation',
      'Automated trading systems',
      'Web3 wallet and DeFi integration',
      'Signal provider quality assessment',
      'Trading bot evaluation',
      'Staking and earn product analysis',
    ],
    reviewedExchanges: ['bitget', 'okx', 'bingx', 'bybit', 'mexc'],
    links: {},
    joinedAt: '2024-09-01',
    lastActiveAt: '2026-05-15',
    reviewCount: 5,
    articleCount: 8,
    credibilityScore: 82,
    status: 'active',
  },
];

/** Look up a reviewer by slug */
export function getReviewer(slug: string): ReviewerProfile | undefined {
  return EDITORIAL_TEAM.find(r => r.slug === slug);
}

/** Get all active reviewers */
export function getActiveReviewers(): ReviewerProfile[] {
  return EDITORIAL_TEAM.filter(r => r.status === 'active');
}

/** Get the default reviewer (editorial team) */
export function getDefaultReviewer(): ReviewerProfile {
  return EDITORIAL_TEAM[0];
}

/** Get reviewers who have reviewed a specific exchange */
export function getReviewersForExchange(exchangeSlug: string): ReviewerProfile[] {
  return EDITORIAL_TEAM.filter(
    r => r.status === 'active' && r.reviewedExchanges.includes(exchangeSlug)
  );
}
