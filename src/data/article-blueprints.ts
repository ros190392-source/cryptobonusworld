/**
 * CryptoBonusWorld — Article Blueprint System v1
 * Defines content architecture for all page types.
 * Self-contained — no external imports required.
 */

export type BlueprintType =
  | 'exchange_review'
  | 'bonus_review'
  | 'comparison'
  | 'country_exchange_guide'
  | 'category_page'
  | 'how_to_guide'
  | 'fee_guide'
  | 'kyc_guide'
  | 'p2p_guide'
  | 'futures_guide';

export interface SectionSpec {
  id: string;
  label: string;
  headingLevel: 'h2' | 'h3';
  required: boolean;
  minWords?: number;
  maxWords?: number;
  notes: string;
}

export interface EvidenceRequirement {
  type: 'bonus_verified' | 'affiliate_link_verified' | 'screenshot' | 'official_source' | 'regulatory_check';
  required: boolean;
  description: string;
}

export interface ScreenshotRequirement {
  category: string;
  required: boolean;
  fallback: 'placeholder' | 'skip';
}

export interface SchemaRequirement {
  schemaType: 'Review' | 'FAQPage' | 'HowTo' | 'BreadcrumbList' | 'Article' | 'WebPage';
  required: boolean;
}

export interface InternalLinkTarget {
  targetType: 'exchange_page' | 'comparison_page' | 'category_page' | 'country_page' | 'coin_page' | 'how_to' | 'methodology';
  description: string;
  required: boolean;
}

export interface FreshnessRequirement {
  maxAgeDays: number;
  showLastVerifiedBlock: boolean;
  showEvidencePanel: boolean;
  autoRefreshSections: string[];
}

export interface CtaRule {
  placement: 'after_summary' | 'after_bonus_block' | 'end_of_review' | 'after_pros_cons' | 'sticky_sidebar';
  buttonText: string;
  required: boolean;
}

export interface FaqRequirement {
  minQuestions: number;
  maxQuestions: number;
  mustIncludeTopics: string[];
  schemaRequired: boolean;
}

export interface EEATRequirement {
  namedReviewerRequired: boolean;
  methodologyLinkRequired: boolean;
  evidencePanelRequired: boolean;
  screenshotsRequired: boolean;
  officialSourcesRequired: boolean;
  updateTimestampRequired: boolean;
  affiliateDisclosureRequired: boolean;
  riskDisclaimerRequired: boolean;
  regionalCaveatIfApplicable: boolean;
}

export interface AiSearchRule {
  rule: string;
  description: string;
  enforcement: 'required' | 'recommended';
}

export interface ArticleBlueprint {
  type: BlueprintType;
  label: string;
  description: string;
  requiredSections: SectionSpec[];
  optionalSections: SectionSpec[];
  evidenceRequirements: EvidenceRequirement[];
  screenshotRequirements: ScreenshotRequirement[];
  schemaRequirements: SchemaRequirement[];
  internalLinkTargets: InternalLinkTarget[];
  freshnessRequirements: FreshnessRequirement;
  ctaRules: CtaRule[];
  affiliateDisclosurePlacement: 'top' | 'before_cta' | 'both';
  faqRequirements: FaqRequirement;
  eeAtRequirements: EEATRequirement;
  aiSearchRules: AiSearchRule[];
}

export const ARTICLE_BLUEPRINTS: Record<BlueprintType, ArticleBlueprint> = {
  exchange_review: {
    type: 'exchange_review',
    label: 'Exchange Review',
    description: 'Full review of a crypto exchange with bonus verification, fee analysis, regulation, and E-E-A-T compliance.',
    requiredSections: [
      {
        id: 'executive_summary',
        label: 'Executive Summary',
        headingLevel: 'h2',
        required: true,
        minWords: 50,
        maxWords: 150,
        notes: '1-3 sentences: who this exchange is for, headline bonus, trust level. Direct answer for AI extraction.',
      },
      {
        id: 'key_facts_table',
        label: 'Key Facts',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table: founded, HQ, regulation, users, withdrawal limits, supported countries count.',
      },
      {
        id: 'bonus_verified_block',
        label: 'Welcome Bonus',
        headingLevel: 'h2',
        required: true,
        notes: 'Verified bonus amount, promo code, expiry, evidence link with capture date.',
      },
      {
        id: 'best_for',
        label: 'Who Is This Exchange Best For?',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: '2–4 bullet personas with use case match. No vague claims.',
      },
      {
        id: 'safety_regulation',
        label: 'Safety & Regulation',
        headingLevel: 'h2',
        required: true,
        minWords: 150,
        maxWords: 400,
        notes: 'Regulatory status, licenses, proof of reserves, insurance, security history.',
      },
      {
        id: 'fees',
        label: 'Fees',
        headingLevel: 'h2',
        required: true,
        minWords: 150,
        maxWords: 350,
        notes: 'Maker/taker table, withdrawal fees, deposit fees. Comparison with 1–2 competitors.',
      },
      {
        id: 'kyc_limits',
        label: 'KYC & Account Limits',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 300,
        notes: 'KYC tiers, withdrawal limits per tier, document requirements, verification time.',
      },
      {
        id: 'supported_countries',
        label: 'Supported Countries',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'Available countries, restricted countries, US/EU/UK status, VPN policy.',
      },
      {
        id: 'interface_walkthrough',
        label: 'Interface & Screenshots',
        headingLevel: 'h2',
        required: true,
        notes: 'Screenshot walkthrough: registration flow, main dashboard, bonus/promotions page.',
      },
      {
        id: 'pros_cons',
        label: 'Pros & Cons',
        headingLevel: 'h2',
        required: true,
        notes: '2-column table: min 3 pros, min 3 cons. No vague entries like \'good UI\'.',
      },
      {
        id: 'alternatives',
        label: 'Alternatives to Consider',
        headingLevel: 'h2',
        required: true,
        minWords: 150,
        maxWords: 300,
        notes: '2–4 competitor cards: who it\'s better/worse than and why. With internal links.',
      },
      {
        id: 'methodology',
        label: 'How We Review Exchanges',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'How we verify bonuses, test affiliate links, take screenshots, update cadence.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block with FAQPage schema. Min 5 exchange-specific questions.',
      },
      {
        id: 'evidence_sources',
        label: 'Evidence & Last Verified',
        headingLevel: 'h2',
        required: true,
        notes: 'Last verified date, evidence panel links, reviewer name, screenshot hashes.',
      },
    ],
    optionalSections: [
      {
        id: 'p2p',
        label: 'P2P Trading',
        headingLevel: 'h2',
        required: false,
        minWords: 100,
        maxWords: 250,
        notes: 'P2P trading availability, payment methods, fees.',
      },
      {
        id: 'spot_futures',
        label: 'Spot & Futures Trading',
        headingLevel: 'h2',
        required: false,
        minWords: 150,
        maxWords: 350,
        notes: 'Spot and futures trading options, leverage limits.',
      },
      {
        id: 'earn_staking',
        label: 'Earn & Staking',
        headingLevel: 'h2',
        required: false,
        minWords: 100,
        maxWords: 250,
        notes: 'Staking products, earn programs, APY ranges.',
      },
    ],
    evidenceRequirements: [
      { type: 'bonus_verified', required: true, description: 'Bonus amount verified via live capture with date.' },
      { type: 'affiliate_link_verified', required: true, description: 'Affiliate link tested — redirect chain confirmed.' },
      { type: 'screenshot', required: true, description: 'Screenshots taken for registration, bonus, and fees pages.' },
      { type: 'official_source', required: true, description: 'Official source linked for fees and terms.' },
      { type: 'regulatory_check', required: true, description: 'Regulatory status checked against official registry.' },
    ],
    screenshotRequirements: [
      { category: 'registration', required: true, fallback: 'placeholder' },
      { category: 'bonus', required: true, fallback: 'placeholder' },
      { category: 'fees', required: true, fallback: 'placeholder' },
      { category: 'kyc', required: false, fallback: 'skip' },
      { category: 'mobile_app', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Review', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: true },
      { schemaType: 'Article', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'comparison_page', description: 'Link to a comparison page featuring this exchange.', required: true },
      { targetType: 'methodology', description: 'Link to /methodology page.', required: true },
      { targetType: 'category_page', description: 'Link to a relevant category page.', required: false },
      { targetType: 'country_page', description: 'Link to a country-specific guide if applicable.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 90,
      showLastVerifiedBlock: true,
      showEvidencePanel: true,
      autoRefreshSections: ['bonus_verified_block', 'key_facts_table'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'Get Bonus →', required: true },
      { placement: 'after_bonus_block', buttonText: 'Claim Bonus', required: true },
      { placement: 'after_pros_cons', buttonText: 'Open Account', required: false },
      { placement: 'end_of_review', buttonText: 'Visit Exchange', required: true },
    ],
    affiliateDisclosurePlacement: 'both',
    faqRequirements: {
      minQuestions: 5,
      maxQuestions: 12,
      mustIncludeTopics: ['welcome bonus', 'KYC requirements', 'fees', 'supported countries', 'safety/regulation'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: true,
      methodologyLinkRequired: true,
      evidencePanelRequired: true,
      screenshotsRequired: true,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: true,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: "Place 1-3 sentence direct answer in executive_summary answering 'Is {exchange} good?'",
        enforcement: 'required',
      },
      {
        rule: 'entity_rich_headings',
        description: "H2/H3 must name the exchange + topic (e.g. 'Binance Fees 2026') not generic ('Fees')",
        enforcement: 'required',
      },
      {
        rule: 'source_backed_claims',
        description: 'Every factual claim about fees, bonuses, limits must link to official source or evidence file',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'Fees, bonuses, limits must appear in structured tables for AI parsing',
        enforcement: 'required',
      },
      {
        rule: 'no_unsupported_superlatives',
        description: "Words 'best', 'lowest', 'safest', 'biggest' require [verified] marker or evidence link",
        enforcement: 'required',
      },
      {
        rule: 'best_for_positioning',
        description: "Use 'Best for: X' bullet format in executive summary and best_for section",
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last verified: {date}' near top and in evidence_sources",
        enforcement: 'required',
      },
      {
        rule: 'short_paragraphs',
        description: 'Max 3 sentences per paragraph for AI snippet extraction',
        enforcement: 'recommended',
      },
      {
        rule: 'table_list_alternatives',
        description: 'Every section with 3+ comparable facts must offer table OR structured list',
        enforcement: 'recommended',
      },
      {
        rule: 'schema_alignment',
        description: 'Page content must match schema markup values (same bonus amount, same dates)',
        enforcement: 'required',
      },
    ],
  },

  bonus_review: {
    type: 'bonus_review',
    label: 'Bonus Review',
    description: 'In-depth review of a specific exchange bonus offer with term verification and claim walkthrough.',
    requiredSections: [
      {
        id: 'bonus_overview',
        label: 'Bonus Overview',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'Headline bonus amount, promo code, direct answer for AI extraction.',
      },
      {
        id: 'terms_conditions',
        label: 'Terms & Conditions',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 300,
        notes: 'Wagering requirements, expiry, minimum deposit, eligible countries.',
      },
      {
        id: 'how_to_claim',
        label: 'How to Claim',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Step-by-step claim instructions with promo code placement.',
      },
      {
        id: 'verified_block',
        label: 'Verification Status',
        headingLevel: 'h2',
        required: true,
        notes: 'Verified bonus amount, last check date, evidence link.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block with FAQPage schema. Min 4 bonus-specific questions.',
      },
      {
        id: 'evidence',
        label: 'Evidence & Last Verified',
        headingLevel: 'h2',
        required: true,
        notes: 'Capture date, screenshot link, reviewer name.',
      },
    ],
    optionalSections: [
      {
        id: 'bonus_comparison',
        label: 'Bonus vs. Competitors',
        headingLevel: 'h2',
        required: false,
        minWords: 100,
        maxWords: 250,
        notes: 'Compare this bonus against 2-3 alternatives.',
      },
    ],
    evidenceRequirements: [
      { type: 'bonus_verified', required: true, description: 'Bonus amount verified via live capture.' },
      { type: 'affiliate_link_verified', required: true, description: 'Affiliate link and promo code tested.' },
      { type: 'screenshot', required: true, description: 'Screenshot of bonus/promotions page.' },
      { type: 'official_source', required: false, description: 'Link to official bonus terms page.' },
      { type: 'regulatory_check', required: false, description: 'N/A for bonus-only review.' },
    ],
    screenshotRequirements: [
      { category: 'bonus_page', required: true, fallback: 'placeholder' },
      { category: 'promo_code_field', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Review', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Article', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to the full exchange review.', required: true },
      { targetType: 'category_page', description: 'Link to bonus category page.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 30,
      showLastVerifiedBlock: true,
      showEvidencePanel: true,
      autoRefreshSections: ['verified_block', 'bonus_overview'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'Claim Bonus →', required: true },
      { placement: 'after_bonus_block', buttonText: 'Get Bonus', required: true },
      { placement: 'end_of_review', buttonText: 'Claim Now', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['how to claim', 'expiry', 'wagering requirements', 'promo code'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: true,
      screenshotsRequired: true,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: true,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: "Place verified bonus amount and promo code in first 2 sentences.",
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last verified: {date}' near top.",
        enforcement: 'required',
      },
      {
        rule: 'source_backed_claims',
        description: 'Bonus amount must link to evidence screenshot or official source.',
        enforcement: 'required',
      },
    ],
  },

  comparison: {
    type: 'comparison',
    label: 'Exchange Comparison',
    description: 'Side-by-side comparison of two or more exchanges with structured verdict.',
    requiredSections: [
      {
        id: 'comparison_summary',
        label: 'Comparison Summary',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'Direct answer: which exchange wins and for whom.',
      },
      {
        id: 'key_differences_table',
        label: 'Key Differences',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table covering all key metrics side by side.',
      },
      {
        id: 'fees_comparison',
        label: 'Fees Comparison',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 300,
        notes: 'Maker/taker, withdrawal, deposit fees for each exchange.',
      },
      {
        id: 'bonus_comparison',
        label: 'Bonus Comparison',
        headingLevel: 'h2',
        required: true,
        notes: 'Current verified bonus for each exchange with expiry and promo codes.',
      },
      {
        id: 'who_wins',
        label: 'Who Wins & When',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'Persona-based verdict: which exchange for which user type.',
      },
      {
        id: 'verdict',
        label: 'Final Verdict',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Overall recommendation with confidence level.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 comparison-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'security_comparison',
        label: 'Security Comparison',
        headingLevel: 'h2',
        required: false,
        minWords: 100,
        maxWords: 200,
        notes: 'Regulatory status and security track record.',
      },
    ],
    evidenceRequirements: [
      { type: 'bonus_verified', required: true, description: 'Bonus amounts verified for all exchanges.' },
      { type: 'official_source', required: true, description: 'Fee data from official sources.' },
      { type: 'screenshot', required: false, description: 'Optional: side-by-side interface screenshots.' },
      { type: 'affiliate_link_verified', required: false, description: 'Affiliate links verified for all exchanges.' },
      { type: 'regulatory_check', required: false, description: 'Regulatory status checked.' },
    ],
    screenshotRequirements: [
      { category: 'fees_comparison', required: false, fallback: 'skip' },
      { category: 'bonus_comparison', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to full review of each compared exchange.', required: true },
      { targetType: 'category_page', description: 'Link to relevant category.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 60,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['bonus_comparison', 'fees_comparison'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'Compare Now →', required: false },
      { placement: 'end_of_review', buttonText: 'See Winner', required: true },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['which is better', 'fees', 'bonuses', 'safety'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: true,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: false,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State the winner and the runner-up in the first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'All metrics must appear in comparison tables.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: 'Show last-verified date for fee and bonus data.',
        enforcement: 'required',
      },
    ],
  },

  country_exchange_guide: {
    type: 'country_exchange_guide',
    label: 'Country Exchange Guide',
    description: 'Country-specific guide listing available exchanges, legal status, and payment methods.',
    requiredSections: [
      {
        id: 'country_summary',
        label: 'Country Summary',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'Direct answer: is crypto legal in this country and what are the best exchanges.',
      },
      {
        id: 'available_exchanges',
        label: 'Available Exchanges',
        headingLevel: 'h2',
        required: true,
        minWords: 150,
        maxWords: 400,
        notes: 'List of exchanges available in this country with bonus and rating.',
      },
      {
        id: 'legal_status',
        label: 'Legal Status',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 300,
        notes: 'Regulatory framework, tax treatment, legal clarity. Cite official sources.',
      },
      {
        id: 'payment_methods',
        label: 'Payment Methods',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Local payment methods: bank transfer, cards, e-wallets, local options.',
      },
      {
        id: 'recommended_exchange',
        label: 'Recommended Exchange',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Top pick with rationale for this specific country context.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 country-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'tax_guide',
        label: 'Crypto Tax Guide',
        headingLevel: 'h2',
        required: false,
        minWords: 100,
        maxWords: 250,
        notes: 'Overview of crypto tax obligations in this country.',
      },
    ],
    evidenceRequirements: [
      { type: 'official_source', required: true, description: 'Official regulatory source for legal status.' },
      { type: 'bonus_verified', required: false, description: 'Bonus amounts verified for recommended exchanges.' },
      { type: 'screenshot', required: false, description: 'Optional screenshots.' },
      { type: 'affiliate_link_verified', required: false, description: 'Affiliate links verified.' },
      { type: 'regulatory_check', required: true, description: 'Regulatory status checked for listed exchanges.' },
    ],
    screenshotRequirements: [
      { category: 'country_page', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to each featured exchange review.', required: true },
      { targetType: 'category_page', description: 'Link to best exchanges category page.', required: false },
      { targetType: 'country_page', description: 'Link to related country pages.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 90,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['available_exchanges', 'legal_status'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'Open Account →', required: false },
      { placement: 'end_of_review', buttonText: 'Best Exchange for You', required: true },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['is crypto legal', 'best exchange', 'payment methods', 'taxes'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: true,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State crypto legal status and top exchange pick in first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'source_backed_claims',
        description: 'Legal status claims must cite official regulatory sources.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last updated: {date}' near top.",
        enforcement: 'required',
      },
    ],
  },

  category_page: {
    type: 'category_page',
    label: 'Category Page',
    description: 'Category landing page (e.g. Best Crypto Exchanges) with ranked list and comparison table.',
    requiredSections: [
      {
        id: 'category_intro',
        label: 'Category Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'What this category covers, who it is for, methodology summary.',
      },
      {
        id: 'ranked_list',
        label: 'Ranked List',
        headingLevel: 'h2',
        required: true,
        notes: 'Ordered list of top exchanges with brief rationale for each ranking.',
      },
      {
        id: 'comparison_table',
        label: 'Comparison Table',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table comparing all listed exchanges on key metrics.',
      },
      {
        id: 'methodology',
        label: 'Our Methodology',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'How we select and rank exchanges in this category.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 category-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'editor_picks',
        label: "Editor's Picks",
        headingLevel: 'h2',
        required: false,
        minWords: 80,
        maxWords: 200,
        notes: 'Curated picks with editor commentary.',
      },
    ],
    evidenceRequirements: [
      { type: 'bonus_verified', required: true, description: 'Bonus amounts verified for all listed exchanges.' },
      { type: 'official_source', required: false, description: 'Fee and regulatory data sourced officially.' },
      { type: 'screenshot', required: false, description: 'Optional screenshots per exchange.' },
      { type: 'affiliate_link_verified', required: true, description: 'All affiliate links verified.' },
      { type: 'regulatory_check', required: false, description: 'Basic regulatory check for listed exchanges.' },
    ],
    screenshotRequirements: [
      { category: 'category_header', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: true },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to each exchange review in the list.', required: true },
      { targetType: 'comparison_page', description: 'Link to comparison pages.', required: false },
      { targetType: 'methodology', description: 'Link to methodology page.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 30,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['ranked_list', 'comparison_table'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'See Top Pick →', required: false },
      { placement: 'end_of_review', buttonText: 'Compare All Exchanges', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 10,
      mustIncludeTopics: ['best exchange', 'how to choose', 'fees', 'safety'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: true,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: false,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: false,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State the top pick and key reason in the first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'Ranked list must be in a structured table or ordered list.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last updated: {date}' prominently.",
        enforcement: 'required',
      },
    ],
  },

  how_to_guide: {
    type: 'how_to_guide',
    label: 'How-To Guide',
    description: 'Step-by-step guide for completing a specific task on a crypto exchange.',
    requiredSections: [
      {
        id: 'intro',
        label: 'Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 50,
        maxWords: 150,
        notes: 'What this guide covers, time required, what user will achieve.',
      },
      {
        id: 'prerequisites',
        label: 'Prerequisites',
        headingLevel: 'h2',
        required: true,
        notes: 'What the user needs before starting: account, funds, documents.',
      },
      {
        id: 'steps',
        label: 'Step-by-Step Instructions',
        headingLevel: 'h2',
        required: true,
        minWords: 200,
        maxWords: 800,
        notes: 'Numbered steps with screenshots per step. Use HowTo schema.',
      },
      {
        id: 'troubleshooting',
        label: 'Troubleshooting',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Common errors and how to fix them.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 guide-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'video_walkthrough',
        label: 'Video Walkthrough',
        headingLevel: 'h2',
        required: false,
        notes: 'Embedded video guide if available.',
      },
    ],
    evidenceRequirements: [
      { type: 'screenshot', required: true, description: 'Screenshots for each key step.' },
      { type: 'official_source', required: false, description: 'Link to official help documentation.' },
      { type: 'bonus_verified', required: false, description: 'N/A unless guide covers bonus claim.' },
      { type: 'affiliate_link_verified', required: false, description: 'N/A.' },
      { type: 'regulatory_check', required: false, description: 'N/A.' },
    ],
    screenshotRequirements: [
      { category: 'step_screenshots', required: true, fallback: 'placeholder' },
    ],
    schemaRequirements: [
      { schemaType: 'HowTo', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Article', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to the relevant exchange review.', required: true },
      { targetType: 'how_to', description: 'Link to related how-to guides.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 60,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['steps', 'prerequisites'],
    },
    ctaRules: [
      { placement: 'after_summary', buttonText: 'Start Now →', required: false },
      { placement: 'end_of_review', buttonText: 'Open Exchange', required: false },
    ],
    affiliateDisclosurePlacement: 'before_cta',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['how long it takes', 'common errors', 'requirements'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: false,
      screenshotsRequired: true,
      officialSourcesRequired: false,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: false,
      riskDisclaimerRequired: false,
      regionalCaveatIfApplicable: false,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State time required and outcome in the first sentence.',
        enforcement: 'required',
      },
      {
        rule: 'short_paragraphs',
        description: 'Each step should be 1-3 sentences.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last verified: {date}' — UI changes frequently.",
        enforcement: 'required',
      },
    ],
  },

  fee_guide: {
    type: 'fee_guide',
    label: 'Fee Comparison Guide',
    description: 'Structured guide comparing fees across exchanges with cheapest-option verdict.',
    requiredSections: [
      {
        id: 'intro',
        label: 'Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 50,
        maxWords: 150,
        notes: 'What fees are covered, why they matter, direct answer on cheapest option.',
      },
      {
        id: 'fee_table',
        label: 'Fee Comparison Table',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table: exchange, maker, taker, withdrawal, deposit fees.',
      },
      {
        id: 'fee_calculator',
        label: 'Fee Calculator',
        headingLevel: 'h2',
        required: true,
        notes: 'Interactive or example-based fee calculation for common trade sizes.',
      },
      {
        id: 'cheapest_option',
        label: 'Cheapest Option',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Verdict on cheapest exchange for different use cases.',
      },
      {
        id: 'methodology',
        label: 'Methodology',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'How fee data was collected and verified.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 fee-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'vip_tiers',
        label: 'VIP Fee Tiers',
        headingLevel: 'h2',
        required: false,
        minWords: 80,
        maxWords: 200,
        notes: 'VIP and volume-based fee discounts.',
      },
    ],
    evidenceRequirements: [
      { type: 'official_source', required: true, description: 'Fee data sourced from official exchange fee pages.' },
      { type: 'screenshot', required: false, description: 'Optional: screenshots of fee pages.' },
      { type: 'bonus_verified', required: false, description: 'N/A.' },
      { type: 'affiliate_link_verified', required: false, description: 'N/A.' },
      { type: 'regulatory_check', required: false, description: 'N/A.' },
    ],
    screenshotRequirements: [
      { category: 'fee_page', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to each exchange full review.', required: true },
      { targetType: 'comparison_page', description: 'Link to related comparisons.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 30,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['fee_table', 'cheapest_option'],
    },
    ctaRules: [
      { placement: 'end_of_review', buttonText: 'See Cheapest Exchange', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['lowest fees', 'withdrawal fees', 'maker taker', 'fee discounts'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: true,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: false,
      regionalCaveatIfApplicable: false,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State cheapest exchange and its fees in the first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'All fees must be in a structured comparison table.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Fees last verified: {date}' — fees change frequently.",
        enforcement: 'required',
      },
    ],
  },

  kyc_guide: {
    type: 'kyc_guide',
    label: 'KYC Guide',
    description: 'Guide covering KYC verification tiers, document requirements, and no-KYC options.',
    requiredSections: [
      {
        id: 'intro',
        label: 'Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 50,
        maxWords: 150,
        notes: 'What KYC is, why it matters, direct answer on no-KYC options.',
      },
      {
        id: 'kyc_tiers_table',
        label: 'KYC Tiers',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table: exchange, KYC tier, withdrawal limit, verification time.',
      },
      {
        id: 'documents_needed',
        label: 'Documents Required',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Document requirements per KYC tier for major exchanges.',
      },
      {
        id: 'limits_table',
        label: 'Withdrawal Limits by KYC Tier',
        headingLevel: 'h2',
        required: true,
        notes: 'Table of withdrawal limits with and without KYC.',
      },
      {
        id: 'no_kyc_options',
        label: 'No-KYC Exchanges',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Exchanges with no-KYC or minimal-KYC options and their limits.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 KYC-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'kyc_tips',
        label: 'Tips for Fast KYC Approval',
        headingLevel: 'h2',
        required: false,
        minWords: 80,
        maxWords: 200,
        notes: 'Practical tips to speed up verification.',
      },
    ],
    evidenceRequirements: [
      { type: 'official_source', required: true, description: 'KYC limits from official exchange documentation.' },
      { type: 'screenshot', required: false, description: 'Optional: screenshots of KYC flow.' },
      { type: 'bonus_verified', required: false, description: 'N/A.' },
      { type: 'affiliate_link_verified', required: false, description: 'N/A.' },
      { type: 'regulatory_check', required: false, description: 'N/A.' },
    ],
    screenshotRequirements: [
      { category: 'kyc_flow', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to KYC section of each featured exchange review.', required: true },
      { targetType: 'how_to', description: 'Link to KYC how-to guide if separate.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 60,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['kyc_tiers_table', 'limits_table'],
    },
    ctaRules: [
      { placement: 'end_of_review', buttonText: 'Start Verification', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['no KYC options', 'how long KYC takes', 'withdrawal limits', 'documents needed'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: false,
      riskDisclaimerRequired: false,
      regionalCaveatIfApplicable: true,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State the best no-KYC exchange and its limits in the first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'KYC tiers and limits must be in structured tables.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last verified: {date}' — limits change with regulation.",
        enforcement: 'required',
      },
    ],
  },

  p2p_guide: {
    type: 'p2p_guide',
    label: 'P2P Trading Guide',
    description: 'Guide to P2P trading platforms: exchanges, payment methods, fees, and safety tips.',
    requiredSections: [
      {
        id: 'intro',
        label: 'Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'What P2P trading is, who it is for, direct answer on best P2P platform.',
      },
      {
        id: 'p2p_exchanges_table',
        label: 'P2P Exchange Comparison',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table: exchange, payment methods, fees, volume, availability.',
      },
      {
        id: 'payment_methods',
        label: 'Payment Methods',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Payment methods accepted on P2P platforms by region.',
      },
      {
        id: 'fees',
        label: 'P2P Fees',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'P2P trading fees, spread, and hidden costs.',
      },
      {
        id: 'safety_tips',
        label: 'Safety Tips',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'How to trade P2P safely: escrow, reputation, dispute resolution.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 P2P-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'regional_guide',
        label: 'P2P by Region',
        headingLevel: 'h2',
        required: false,
        minWords: 80,
        maxWords: 200,
        notes: 'Best P2P options for specific regions or countries.',
      },
    ],
    evidenceRequirements: [
      { type: 'official_source', required: true, description: 'Fee data from official P2P exchange pages.' },
      { type: 'screenshot', required: false, description: 'Optional: P2P interface screenshots.' },
      { type: 'bonus_verified', required: false, description: 'N/A.' },
      { type: 'affiliate_link_verified', required: false, description: 'N/A.' },
      { type: 'regulatory_check', required: false, description: 'N/A.' },
    ],
    screenshotRequirements: [
      { category: 'p2p_interface', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to P2P section of each exchange review.', required: true },
      { targetType: 'category_page', description: 'Link to best exchanges category.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 60,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['p2p_exchanges_table', 'fees'],
    },
    ctaRules: [
      { placement: 'end_of_review', buttonText: 'Trade P2P →', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['best P2P exchange', 'how P2P works', 'safety', 'fees'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: true,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State best P2P exchange and key reason in first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'P2P exchange comparison must be in a structured table.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last updated: {date}'.",
        enforcement: 'required',
      },
    ],
  },

  futures_guide: {
    type: 'futures_guide',
    label: 'Futures Trading Guide',
    description: 'Guide comparing futures exchanges: leverage, fees, liquidation mechanics.',
    requiredSections: [
      {
        id: 'intro',
        label: 'Introduction',
        headingLevel: 'h2',
        required: true,
        minWords: 60,
        maxWords: 150,
        notes: 'What futures trading is, who it is for, risk warning, direct answer on best platform.',
      },
      {
        id: 'exchanges_comparison_table',
        label: 'Futures Exchange Comparison',
        headingLevel: 'h2',
        required: true,
        notes: 'Structured table: exchange, max leverage, maker/taker fees, insurance fund, available pairs.',
      },
      {
        id: 'leverage_table',
        label: 'Leverage Limits',
        headingLevel: 'h2',
        required: true,
        notes: 'Table of max leverage per asset class per exchange.',
      },
      {
        id: 'fees',
        label: 'Futures Fees',
        headingLevel: 'h2',
        required: true,
        minWords: 80,
        maxWords: 200,
        notes: 'Maker/taker fees, funding rates, liquidation fees.',
      },
      {
        id: 'liquidation_explained',
        label: 'Liquidation Explained',
        headingLevel: 'h2',
        required: true,
        minWords: 100,
        maxWords: 250,
        notes: 'How liquidation works, margin modes, insurance funds, ADL.',
      },
      {
        id: 'faq',
        label: 'Frequently Asked Questions',
        headingLevel: 'h2',
        required: true,
        notes: 'FAQ block. Min 4 futures-specific questions.',
      },
    ],
    optionalSections: [
      {
        id: 'risk_management',
        label: 'Risk Management Tips',
        headingLevel: 'h2',
        required: false,
        minWords: 80,
        maxWords: 200,
        notes: 'Position sizing, stop-loss, risk management best practices.',
      },
    ],
    evidenceRequirements: [
      { type: 'official_source', required: true, description: 'Leverage and fee data from official exchange pages.' },
      { type: 'screenshot', required: false, description: 'Optional: futures interface screenshots.' },
      { type: 'bonus_verified', required: false, description: 'N/A.' },
      { type: 'affiliate_link_verified', required: false, description: 'N/A.' },
      { type: 'regulatory_check', required: false, description: 'N/A.' },
    ],
    screenshotRequirements: [
      { category: 'futures_interface', required: false, fallback: 'skip' },
    ],
    schemaRequirements: [
      { schemaType: 'Article', required: true },
      { schemaType: 'FAQPage', required: true },
      { schemaType: 'BreadcrumbList', required: false },
      { schemaType: 'Review', required: false },
    ],
    internalLinkTargets: [
      { targetType: 'exchange_page', description: 'Link to each exchange full review.', required: true },
      { targetType: 'category_page', description: 'Link to best futures exchanges category.', required: false },
    ],
    freshnessRequirements: {
      maxAgeDays: 30,
      showLastVerifiedBlock: true,
      showEvidencePanel: false,
      autoRefreshSections: ['exchanges_comparison_table', 'leverage_table', 'fees'],
    },
    ctaRules: [
      { placement: 'end_of_review', buttonText: 'Trade Futures →', required: false },
    ],
    affiliateDisclosurePlacement: 'top',
    faqRequirements: {
      minQuestions: 4,
      maxQuestions: 8,
      mustIncludeTopics: ['best futures exchange', 'leverage limits', 'liquidation', 'funding rates'],
      schemaRequired: true,
    },
    eeAtRequirements: {
      namedReviewerRequired: false,
      methodologyLinkRequired: false,
      evidencePanelRequired: false,
      screenshotsRequired: false,
      officialSourcesRequired: true,
      updateTimestampRequired: true,
      affiliateDisclosureRequired: true,
      riskDisclaimerRequired: true,
      regionalCaveatIfApplicable: false,
    },
    aiSearchRules: [
      {
        rule: 'direct_answer_block',
        description: 'State best futures exchange and max leverage in first paragraph.',
        enforcement: 'required',
      },
      {
        rule: 'comparison_ready_facts',
        description: 'Leverage and fee data must be in structured tables.',
        enforcement: 'required',
      },
      {
        rule: 'timestamps',
        description: "Show 'Last verified: {date}' — fees and leverage limits change.",
        enforcement: 'required',
      },
    ],
  },
};

export function getBlueprintTypes(): BlueprintType[] {
  return Object.keys(ARTICLE_BLUEPRINTS) as BlueprintType[];
}

export function getBlueprint(type: BlueprintType): ArticleBlueprint | undefined {
  return ARTICLE_BLUEPRINTS[type];
}

export function getRequiredSections(type: BlueprintType): SectionSpec[] {
  return ARTICLE_BLUEPRINTS[type]?.requiredSections ?? [];
}

export function getBlueprintSummary(): { totalBlueprints: number; totalRequiredSections: number; blueprintTypes: BlueprintType[] } {
  const types = getBlueprintTypes();
  return {
    totalBlueprints: types.length,
    totalRequiredSections: types.reduce((sum, t) => sum + ARTICLE_BLUEPRINTS[t].requiredSections.length, 0),
    blueprintTypes: types,
  };
}
