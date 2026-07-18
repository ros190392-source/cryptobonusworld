export interface RelatedExchange {
  slug: string;
  name: string;
  logo: string;
  bonus: string;
  tag: string;
  tileBg: string;
  pageUrl?: string;  // override /exchanges/[slug]/ with dedicated page URL
}

export interface FaqItem {
  question: string;
  answer: string; // may contain inline HTML
}

export type VerificationStatus = 'verified' | 'public-preview' | 'check-hub';

export interface VerificationRow {
  area: string;
  requirement: string;
  rewardType: string;
  status: VerificationStatus;
  statusNote: string;
}

export interface BonusLevelRow {
  task: string;
  requirement: string;
  rewardType: string;
  notes: string;
}

export interface EvidenceScreenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string; // may contain inline HTML
  wide?: boolean;  // adds p2-evidence-img--wide
}

export interface BonusExtraSection {
  h3: string;
  text: string; // may contain inline HTML
}

export interface FeeTableRow {
  market: string; // may contain HTML entities
  maker: string;
  taker: string;
  statusCellHtml: string; // full <td>...</td> HTML string
}

export interface ExchangePromoPageConfig {
  // ─── Identity ───────────────────────────────────────────────
  slug: string;
  name: string;
  affiliateUrl: string;
  officialDomain: string;
  supportUrl: string;
  feeUrl: string;

  // ─── Media ──────────────────────────────────────────────────
  wordmarkImg: string;
  articleImg: string;
  ogImage: string;
  heroBackgroundImg: string;
  heroBackgroundPosition?: string; // default 'left center' (desktop focal)
  /** Presentation-only responsive focal points for the hero artwork —
      never store factual offer data here. Fallback: mobile → tablet → desktop. */
  heroBackgroundPositionTablet?: string; // 641–1023px focal
  heroBackgroundPositionMobile?: string; // ≤640px focal (per-artwork, not generic)
  logoImg: string;

  // ─── Commercial ─────────────────────────────────────────────
  promoCode: string;
  bonusMax: number;
  currency: string;
  rewardsAreaName: string;     // "Rewards Hub" | "Activity Center"
  realisticValue: string;
  lastChecked: string;
  sourceUrl: string;

  // ─── Exchange facts ──────────────────────────────────────────
  founded: number;
  users: string;
  headquarters: string;

  // ─── Fees ────────────────────────────────────────────────────
  fees: {
    spot:    { maker: string; taker: string };
    futures: { maker: string; taker: string };
    options?: { maker: string; taker: string };
  };

  // ─── KYC ─────────────────────────────────────────────────────
  kycRequired: boolean;
  kycNote: string; // shown in Quick Facts table (e.g. "Yes — identity verification required")

  // ─── Brand ───────────────────────────────────────────────────
  heroTokens: {
    bgFrom: string;
    bgTo: string;
    accent: string;
    codeColor: string; // color for .cf-code (differs per exchange)
  };
  heroPromoLabel: string;      // "PROMO CODE" or "REFERRAL CODE"
  logoVisualScale?: number;    // default 1.0; Bybit uses 0.70

  // ─── SEO meta ────────────────────────────────────────────────
  canonicalUrl: string;
  pageTitle: string;
  pageDescription: string;
  ogTitle: string;
  ogDescription: string;
  seoPhraseLabel: string;      // italic phrase below the compact facts table

  // ─── Content: intro ──────────────────────────────────────────
  introParagraphs: string[];   // HTML strings; affiliate disclosure appended automatically

  // ─── Content: how to claim ───────────────────────────────────
  howToClaimSteps: string[];   // HTML strings

  // ─── Content: evidence ───────────────────────────────────────
  evidenceRegistration: EvidenceScreenshot;
  evidenceBonusPage?: EvidenceScreenshot;      // optional extra evidence after bonus levels
  evidenceFeeScreenshots?: EvidenceScreenshot[]; // optional screenshots inside fee section

  // ─── Content: bonus levels ───────────────────────────────────
  bonusLevelRows: BonusLevelRow[];
  bonusExtraSections?: BonusExtraSection[];    // h3+text blocks after the bonus table

  // ─── Content: about ──────────────────────────────────────────
  aboutParagraphs: string[];   // HTML strings
  supportText: string;         // HTML string for the Support subsection

  // ─── Content: partner offer ──────────────────────────────────
  partnerOfferText: string;

  // ─── Content: code search variations ─────────────────────────
  searchVariations: string[];  // exactly 5 labels

  // ─── Content: trading fees ───────────────────────────────────
  feeTableRows: FeeTableRow[];
  feeAfterNoteHtml?: string;   // footnotes after the fee table (HTML string)

  // ─── Content: KYC & availability ─────────────────────────────
  kycAvailabilityParagraphs: string[]; // HTML strings

  // ─── Content: verification table ─────────────────────────────
  verificationIntroText: string;
  verificationEvidence?: EvidenceScreenshot; // omit when no distinct (non-duplicate) proof screenshot exists
  verificationRows: VerificationRow[];
  verificationAfterNote: string;

  // ─── Content: FAQ ────────────────────────────────────────────
  faqItems: FaqItem[];

  // ─── Related exchanges ───────────────────────────────────────
  relatedExchanges: RelatedExchange[];
}
