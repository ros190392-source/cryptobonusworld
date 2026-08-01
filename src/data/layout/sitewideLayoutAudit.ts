export type AuditSeverity = 'P0' | 'P1' | 'P2';
export type AuditState = 'PASS' | 'FAIL' | 'PARTIAL' | 'PLANNED';
export type ContainerRole = 'shell' | 'wide' | 'content' | 'prose';

export interface ContainerStandard {
  role: ContainerRole;
  maxWidth: number;
  use: string;
}

export interface LayoutFinding {
  id: string;
  severity: AuditSeverity;
  state: AuditState;
  title: string;
  evidence: string;
  remediation: string;
}

export interface RouteFamilyAudit {
  id: string;
  label: string;
  routes: readonly string[];
  currentState: string;
  targetTemplate: string;
  containerRoles: readonly ContainerRole[];
  publicGeometryAuthority: boolean;
}

export const targetContainers: readonly ContainerStandard[] = [
  { role: 'shell', maxWidth: 1200, use: 'Header, footer and full-page alignment' },
  { role: 'wide', maxWidth: 1120, use: 'Rankings, directories and comparison tables' },
  { role: 'content', maxWidth: 960, use: 'Structured mixed content and profile articles' },
  { role: 'prose', maxWidth: 760, use: 'Long-form editorial and legal text' },
] as const;

export const currentWidthInventory = [
  { value: 1180, source: 'CleanLayout --cbw-page-max' },
  { value: 1160, source: 'Homepage .shell' },
  { value: 1120, source: 'CleanLayout --cbw-wide-max and HomepageTop10' },
  { value: 900, source: 'Methodology .mth-prose/.mth-wide' },
  { value: 860, source: 'Info/legal .container' },
  { value: 800, source: 'CleanLayout --cbw-prose-max and Homepage .prose-shell' },
  { value: 760, source: 'Exchange .p2-inner/.bw-wrap/.seo-intro-inner' },
] as const;

export const layoutFindings: readonly LayoutFinding[] = [
  {
    id: 'LAYOUT-P0-001',
    severity: 'P0',
    state: 'FAIL',
    title: 'Homepage ranking is below an intermediate pathway block',
    evidence: 'Homepage renders hero → path-section → HomepageTop10.',
    remediation: 'Move path cards below Top-10 or compress them into a ranking preface.',
  },
  {
    id: 'LAYOUT-P0-002',
    severity: 'P0',
    state: 'FAIL',
    title: 'Seven independent public width values are active',
    evidence: '1180, 1160, 1120, 900, 860, 800 and 760px are all used as page-family widths.',
    remediation: 'Replace raw widths with shell/wide/content/prose roles.',
  },
  {
    id: 'SEO-P0-001',
    severity: 'P0',
    state: 'FAIL',
    title: 'Obsolete crawlable links are corrected after load',
    evidence: 'CleanLayout rewrites /#finder anchors through client-side JavaScript.',
    remediation: 'Correct source href/text and delete the compatibility script.',
  },
  {
    id: 'LAYOUT-P0-003',
    severity: 'P0',
    state: 'FAIL',
    title: 'Public route families still depend on broad override CSS',
    evidence: 'Exchange, directory, info and FAQ layers normalize legacy markup through broad selectors and !important rules.',
    remediation: 'Migrate markup into governed templates, then delete override layers family by family.',
  },
  {
    id: 'SEO-P1-001',
    severity: 'P1',
    state: 'PARTIAL',
    title: 'Retired routes use duplicated standalone meta-refresh pages',
    evidence: 'Guides and retired hubs ship independent HTML/CSS redirect stubs.',
    remediation: 'Create one redirect registry and server-level redirects where supported.',
  },
  {
    id: 'LAYOUT-P1-001',
    severity: 'P1',
    state: 'FAIL',
    title: 'Generic PageHero can delay primary content',
    evidence: 'PageHero tall reaches 360px before directory/table content begins.',
    remediation: 'Introduce compact intro variants governed by page intent and first-viewport tests.',
  },
  {
    id: 'AFFILIATE-P1-001',
    severity: 'P1',
    state: 'PASS',
    title: 'Affiliate bindings are already governed and must remain immutable',
    evidence: 'Approved /go paths and no-CTA boundaries are validated by current CI.',
    remediation: 'Add exact inventory parity to every layout migration PR.',
  },
] as const;

export const routeFamilies: readonly RouteFamilyAudit[] = [
  {
    id: 'homepage',
    label: 'Homepage and Top-10',
    routes: ['/'],
    currentState: 'FAIL_FIRST_VIEWPORT',
    targetTemplate: 'HomepageTemplateV3',
    containerRoles: ['shell', 'wide', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'exchange-primary',
    label: 'Primary exchange profiles',
    routes: ['/bybit/', '/mexc/', '/okx/', '/bitget/', '/kucoin/', '/bingx/'],
    currentState: 'OVERRIDE_NORMALIZED_LEGACY_DOM',
    targetTemplate: 'ExchangeProfileTemplateV3',
    containerRoles: ['shell', 'content', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'exchange-generic',
    label: 'Generic exchange profiles',
    routes: ['/coinex/', '/exchanges/{exchange}/'],
    currentState: 'MIXED_COMPONENT_AND_STUB_CONTRACTS',
    targetTemplate: 'ExchangeProfileTemplateV3',
    containerRoles: ['shell', 'content', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'directory-comparison',
    label: 'Directories and comparisons',
    routes: ['/exchanges/', '/promo-codes/'],
    currentState: 'PAGE_LOCAL_GRID_AND_TABLE_WIDTHS',
    targetTemplate: 'DirectoryComparisonTemplateV3',
    containerRoles: ['shell', 'wide', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'trust-editorial',
    label: 'Methodology, trust and FAQ',
    routes: ['/methodology/', '/editorial-policy/', '/update-policy/', '/about/', '/faq/'],
    currentState: 'MIXED_860_900_AND_CUSTOM_FAQ',
    targetTemplate: 'EditorialTemplateV3',
    containerRoles: ['shell', 'content', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'legal-contact',
    label: 'Legal and contact',
    routes: ['/affiliate-disclosure/', '/disclaimer/', '/privacy-policy/', '/terms/', '/contact/'],
    currentState: 'INFO_OVERRIDE_LAYER',
    targetTemplate: 'LegalTemplateV3',
    containerRoles: ['shell', 'prose'],
    publicGeometryAuthority: true,
  },
  {
    id: 'retired-route',
    label: 'Retired hubs and guides',
    routes: ['/bonus-codes/', '/bonuses/', '/categories/', '/coins/', '/compare/', '/countries/', '/use-cases/', '/reviewers/', '/guides/', '/guides/{slug}/'],
    currentState: 'STANDALONE_META_REFRESH_STUBS',
    targetTemplate: 'RedirectRegistry',
    containerRoles: [],
    publicGeometryAuthority: false,
  },
  {
    id: 'preview-design',
    label: 'Preview and design review',
    routes: ['/preview/**', '/__design/**'],
    currentState: 'NOINDEX_REVIEW_ONLY',
    targetTemplate: 'ReviewTemplate',
    containerRoles: ['shell', 'wide', 'content', 'prose'],
    publicGeometryAuthority: false,
  },
] as const;

export const firstViewportContract = {
  homepageDesktop: ['header', 'compactHero', 'rankingHeading', 'twoCompleteRankingRows'],
  homepageMobile: ['header', 'compactHero', 'countryLanguageContext', 'rankingHeading', 'firstRankingRowVisible'],
  exchange: ['identity', 'offerOrEvidenceState', 'primaryActionBoundary', 'firstFactsOrContentBlock'],
  directory: ['pagePurpose', 'firstLiveCardOrRow'],
  editorialLegal: ['pagePurpose', 'firstSubstantiveSection'],
} as const;

export const deletionTargets = [
  'CleanLayout inline layout primitives',
  'CleanLayout #finder compatibility script',
  'Homepage local shell/prose-shell widths',
  'Homepage path-section before Top-10',
  'exchange-page-v2.css override layer',
  'directory-pages-v2.css override layer',
  'info-pages-v2.css override layer',
  'faq-page-v2.css standalone layer',
  'duplicated retired-route HTML/CSS stubs',
  'unregistered page-local max-width declarations',
] as const;

const unique = <T>(items: readonly T[]) => new Set(items).size === items.length;

export const sitewideLayoutAuditValidation = {
  containerRolesUnique: unique(targetContainers.map(container => container.role)),
  containerWidthsUnique: unique(targetContainers.map(container => container.maxWidth)),
  routeFamilyIdsUnique: unique(routeFamilies.map(family => family.id)),
  findingIdsUnique: unique(layoutFindings.map(finding => finding.id)),
  hasHomepageFirstViewportFailure: layoutFindings.some(finding => finding.id === 'LAYOUT-P0-001' && finding.state === 'FAIL'),
  hasSourceHtmlSeoFailure: layoutFindings.some(finding => finding.id === 'SEO-P0-001' && finding.state === 'FAIL'),
  hasAffiliatePreservationGate: layoutFindings.some(finding => finding.id === 'AFFILIATE-P1-001' && finding.state === 'PASS'),
  allPublicFamiliesHaveTargetTemplate: routeFamilies.filter(family => family.publicGeometryAuthority).every(family => family.targetTemplate.length > 0),
} as const;

export const sitewideLayoutAuditPass = Object.values(sitewideLayoutAuditValidation).every(Boolean);

if (!sitewideLayoutAuditPass) {
  throw new Error(`Sitewide layout audit manifest invalid: ${JSON.stringify(sitewideLayoutAuditValidation)}`);
}
