import { getExchange } from './exchanges';
import { getOffer } from './offers';
import { resolvePublicOfferView } from './publicOfferView';
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
  /**
   * Secondary internal transition (always a local review/status route). Issue #264:
   * the row model carries NO latent commercial `primaryAction` / affiliate destination —
   * the live commercial CTA is resolved solely by the country-aware CTA gate
   * (homepageTop10Cta.ts) from authoritative state, never a raw affiliate URL baked here.
   */
  secondaryAction: HomepageTop10Action;
}

function liveEntry(
  rank: number,
  slug: string,
  bestFor: string,
  nowMs: number,
): HomepageTop10Entry {
  const exchange = getExchange(slug);
  const offer = getOffer(slug);

  if (!exchange || !offer) {
    throw new Error(`Homepage Top-10 requires a clean exchange and offer record for ${slug}`);
  }

  // Public presentation is evidence-driven against the explicit render clock (R5), never
  // raw Offer fields. For Bybit this is the neutralized under-re-verification projection
  // (Issue #264); other exchanges pass through unchanged. The raw promo code / bonus
  // headline / affiliate destination are never read into the exported public model.
  const view = resolvePublicOfferView(slug, nowMs);
  if (!view) {
    throw new Error(`Homepage Top-10 requires a public offer view for ${slug}`);
  }

  return {
    rank,
    slug: exchange.slug,
    name: exchange.name,
    bestFor,
    statusLabel: view.statusLabel,
    statusTone: view.statusTone,
    summary: view.summary,
    promoCode: view.promoCode ?? undefined,
    lastChecked: offer.lastChecked,
    // Factual freshness comes ONLY from the offer's machine evidence (null while
    // under re-verification); the human lastChecked string never authorizes it.
    evidence: offer.evidence ?? null,
    secondaryAction: {
      label: `Read ${exchange.name} review`,
      href: exchange.pageUrl ?? `/exchanges/${exchange.slug}/`,
    },
  };
}

/**
 * Build the homepage Top-10 model for an EXPLICIT render clock (R5). There is no no-clock
 * module snapshot: every render surface passes one build/render clock so authoritative
 * fresh evidence can restore a row's copy without a code change.
 */
export function buildHomepageTop10(nowMs: number): HomepageTop10Entry[] {
  const entries: HomepageTop10Entry[] = [
    liveEntry(1, 'bybit', 'Derivatives, copy trading and a broad trading toolkit', nowMs),
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
      secondaryAction: { label: 'View research status', href: '/exchanges/' },
    },
    liveEntry(3, 'okx', 'Spot, derivatives and Web3 tools', nowMs),
    liveEntry(4, 'mexc', 'Altcoin coverage and flexible account access', nowMs),
    liveEntry(5, 'bitget', 'Copy trading and derivatives', nowMs),
    liveEntry(6, 'kucoin', 'Altcoins and a broad exchange toolkit', nowMs),
    {
      rank: 7,
      slug: 'gate-io',
      name: 'Gate.io',
      bestFor: 'Altcoin coverage and broad product selection',
      statusLabel: 'Profile re-verification',
      statusTone: 'review',
      summary: 'Legacy profile retained; current clean offer and country evidence are being rechecked.',
      lastChecked: 'Recheck in progress',
      evidence: null,
      secondaryAction: { label: 'View directory status', href: '/exchanges/' },
    },
    liveEntry(8, 'bingx', 'Copy trading and social trading tools', nowMs),
    {
      rank: 9,
      slug: 'htx',
      name: 'HTX',
      bestFor: 'Spot markets and established exchange features',
      statusLabel: 'Profile re-verification',
      statusTone: 'review',
      summary: 'Legacy profile retained; current clean offer and country evidence are being rechecked.',
      lastChecked: 'Recheck in progress',
      evidence: null,
      secondaryAction: { label: 'View directory status', href: '/exchanges/' },
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
      evidence: null,
      secondaryAction: { label: 'View directory status', href: '/exchanges/' },
    },
  ];

  if (entries.length !== 10) {
    throw new Error(`Homepage Top-10 must contain exactly 10 entries; received ${entries.length}`);
  }
  const ranks = entries.map((entry) => entry.rank);
  if (new Set(ranks).size !== 10 || ranks.some((rank, index) => rank !== index + 1)) {
    throw new Error('Homepage Top-10 ranks must be unique and sequential from 1 through 10');
  }
  return entries;
}
