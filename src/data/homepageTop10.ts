import { getExchange } from './exchanges';
import { getOffer } from './offers';
import type { EvidenceMetadata } from './contracts/evidenceMetadata';

export type HomepageTop10StatusTone = 'verified' | 'preview' | 'research' | 'review';

export interface HomepageTop10Action {
  label: string;
  href: string;
  external?: boolean;
  sponsored?: boolean;
}

export interface HomepageTop10Entry {
  rank: number;
  slug: string;
  name: string;
  bestFor: string;
  statusLabel: string;
  statusTone: HomepageTop10StatusTone;
  summary: string;
  promoCode?: string;
  /**
   * Human editorial status text ONLY (e.g. "July 2026", "Recheck in progress").
   * NOT a machine timestamp: it never authorizes freshness and the homepage
   * never renders it as a factual "Checked:" date. Visible checked dates are
   * derived from `evidence` via contracts/evidenceMetadata.ts.
   */
  lastChecked: string;
  /**
   * Canonical machine-readable evidence for this row's freshness, or null when
   * the row is under re-verification / research (no exact repository evidence).
   * The one factual freshness source; display dates derive from it. Required
   * (R3): every row must state evidence explicitly — a valid record or `null`.
   */
  evidence: EvidenceMetadata | null;
  primaryAction?: HomepageTop10Action;
  secondaryAction: HomepageTop10Action;
}

function liveEntry(
  rank: number,
  slug: string,
  bestFor: string,
): HomepageTop10Entry {
  const exchange = getExchange(slug);
  const offer = getOffer(slug);

  if (!exchange || !offer) {
    throw new Error(`Homepage Top-10 requires a clean exchange and offer record for ${slug}`);
  }

  return {
    rank,
    slug: exchange.slug,
    name: exchange.name,
    bestFor,
    statusLabel: offer.status === 'verified' ? 'Verified offer' : 'Public offer preview',
    statusTone: offer.status === 'verified' ? 'verified' : 'preview',
    summary: offer.bonusHeadline,
    promoCode: offer.promoCode,
    lastChecked: offer.lastChecked,
    // Factual freshness comes ONLY from the offer's machine evidence (null while
    // under re-verification); the human lastChecked string never authorizes it.
    evidence: offer.evidence ?? null,
    primaryAction: {
      label: 'Check offer',
      href: exchange.affiliateUrl,
      external: true,
      sponsored: true,
    },
    secondaryAction: {
      label: `Read ${exchange.name} review`,
      href: exchange.pageUrl ?? `/exchanges/${exchange.slug}/`,
    },
  };
}

export const homepageTop10: HomepageTop10Entry[] = [
  liveEntry(1, 'bybit', 'Derivatives, copy trading and a broad trading toolkit'),
  {
    rank: 2,
    slug: 'binance',
    name: 'Binance',
    bestFor: 'Liquidity, spot markets and broad product coverage',
    statusLabel: 'KZ research completed',
    statusTone: 'research',
    summary: 'Kazakhstan entity and licence evidence reviewed; CBW campaign eligibility remains under review.',
    lastChecked: 'July 2026',
    evidence: null, // research row: no exact machine evidence → honest under-review state
    secondaryAction: {
      label: 'View research status',
      href: '/exchanges/',
    },
  },
  liveEntry(3, 'okx', 'Spot, derivatives and Web3 tools'),
  liveEntry(4, 'mexc', 'Altcoin coverage and flexible account access'),
  liveEntry(5, 'bitget', 'Copy trading and derivatives'),
  liveEntry(6, 'kucoin', 'Altcoins and a broad exchange toolkit'),
  {
    rank: 7,
    slug: 'gate-io',
    name: 'Gate.io',
    bestFor: 'Altcoin coverage and broad product selection',
    statusLabel: 'Profile re-verification',
    statusTone: 'review',
    summary: 'Legacy profile retained; current clean offer and country evidence are being rechecked.',
    lastChecked: 'Recheck in progress',
    evidence: null, // under re-verification: no exact machine evidence → honest recheck state
    secondaryAction: {
      label: 'View directory status',
      href: '/exchanges/',
    },
  },
  liveEntry(8, 'bingx', 'Copy trading and social trading tools'),
  {
    rank: 9,
    slug: 'htx',
    name: 'HTX',
    bestFor: 'Spot markets and established exchange features',
    statusLabel: 'Profile re-verification',
    statusTone: 'review',
    summary: 'Legacy profile retained; current clean offer and country evidence are being rechecked.',
    lastChecked: 'Recheck in progress',
    evidence: null, // under re-verification: no exact machine evidence → honest recheck state
    secondaryAction: {
      label: 'View directory status',
      href: '/exchanges/',
    },
  },
  {
    rank: 10,
    slug: 'phemex',
    name: 'Phemex',
    bestFor: 'Derivatives and streamlined trading tools',
    statusLabel: 'Profile re-verification',
    statusTone: 'review',
    summary: 'Legacy profile retained; current clean offer and country evidence are being rechecked.',
    lastChecked: 'Recheck in progress',
    evidence: null, // under re-verification: no exact machine evidence → honest recheck state
    secondaryAction: {
      label: 'View directory status',
      href: '/exchanges/',
    },
  },
];

if (homepageTop10.length !== 10) {
  throw new Error(`Homepage Top-10 must contain exactly 10 entries; received ${homepageTop10.length}`);
}

const ranks = homepageTop10.map((entry) => entry.rank);
if (new Set(ranks).size !== 10 || ranks.some((rank, index) => rank !== index + 1)) {
  throw new Error('Homepage Top-10 ranks must be unique and sequential from 1 through 10');
}
