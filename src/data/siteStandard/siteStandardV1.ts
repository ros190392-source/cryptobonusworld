export const SITE_STANDARD_VERSION = 'cbw-site-standard-v1' as const;

export const CONTAINER_WIDTHS = {
  shell: 1180,
  wide: 1180,
  standard: 960,
  prose: 760,
  narrow: 560,
} as const;

export const RESPONSIVE_GUTTERS = {
  mobile: 20,
  tablet: 24,
  desktop: 32,
} as const;

export const SPACING_SCALE = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
} as const;

export const RADIUS_SCALE = {
  control: 10,
  card: 14,
  panel: 18,
  pill: 999,
} as const;

export type ContainerRole = keyof typeof CONTAINER_WIDTHS;
export type FirstScreenFamily = 'homepage' | 'country' | 'exchange' | 'directory' | 'guide' | 'trust' | 'legal' | 'utility';

export interface FirstScreenContract {
  family: FirstScreenFamily;
  desktop: {
    viewport: '1440x900';
    headerMax: number;
    introMax: number;
    firstUsefulMustBeginBy: number;
  };
  tablet: {
    viewport: '768x1024';
    headerMax: number;
    introMax: number;
    firstUsefulMustBeginBy: number;
  };
  mobile: {
    viewport: '390x844';
    headerMax: number;
    introMax: number;
    firstUsefulMustBeginBy: number;
  };
  requirements: readonly string[];
}

export const FIRST_SCREEN_CONTRACTS: Record<FirstScreenFamily, FirstScreenContract> = {
  homepage: {
    family: 'homepage',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 230, firstUsefulMustBeginBy: 360 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 300, firstUsefulMustBeginBy: 470 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 330, firstUsefulMustBeginBy: 570 },
    requirements: [
      'Country and language context remains visible.',
      'Ranking heading and evidence context appear in the first viewport.',
      'At least three complete ranking rows appear at 1440x900; target five.',
      'The first real ranking row begins within 390x844.',
      'No pathway, decorative or duplicate ranking section precedes the canonical ranking.',
    ],
  },
  country: {
    family: 'country',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 330, firstUsefulMustBeginBy: 560 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 360, firstUsefulMustBeginBy: 610 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 360, firstUsefulMustBeginBy: 620 },
    requirements: [
      'Country identity and flag are visible.',
      'Local ranking state is explicit.',
      'A global ranking is never relabelled as local.',
      'When no local ranking is approved, non-ranked exchange candidates remain clearly labelled.',
      'The first exchange candidate or ranking row begins in the first viewport.',
    ],
  },
  exchange: {
    family: 'exchange',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 520, firstUsefulMustBeginBy: 700 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 540, firstUsefulMustBeginBy: 760 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 520, firstUsefulMustBeginBy: 650 },
    requirements: [
      'Exchange identity is visible.',
      'Offer or evidence state is visible.',
      'One authorized primary action is visible when allowed.',
      'A material limitation or disclosure is visible.',
      'The first useful fact block begins in the first viewport.',
    ],
  },
  directory: {
    family: 'directory',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 300, firstUsefulMustBeginBy: 520 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 300, firstUsefulMustBeginBy: 560 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 280, firstUsefulMustBeginBy: 520 },
    requirements: ['Page purpose and trust context are visible.', 'The first real directory card or table row begins in the first viewport.'],
  },
  guide: {
    family: 'guide',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 320, firstUsefulMustBeginBy: 560 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 320, firstUsefulMustBeginBy: 600 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 300, firstUsefulMustBeginBy: 560 },
    requirements: ['One H1 and the guide purpose are visible.', 'The first useful guide card or article section begins in the first viewport.'],
  },
  trust: {
    family: 'trust',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 300, firstUsefulMustBeginBy: 540 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 300, firstUsefulMustBeginBy: 580 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 280, firstUsefulMustBeginBy: 540 },
    requirements: ['Page purpose and review context are visible.', 'The first governed policy or methodology block begins in the first viewport.'],
  },
  legal: {
    family: 'legal',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 260, firstUsefulMustBeginBy: 500 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 260, firstUsefulMustBeginBy: 540 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 240, firstUsefulMustBeginBy: 500 },
    requirements: ['The legal page title, purpose and update context are visible.', 'The first substantive legal section begins in the first viewport.'],
  },
  utility: {
    family: 'utility',
    desktop: { viewport: '1440x900', headerMax: 76, introMax: 280, firstUsefulMustBeginBy: 520 },
    tablet: { viewport: '768x1024', headerMax: 68, introMax: 280, firstUsefulMustBeginBy: 560 },
    mobile: { viewport: '390x844', headerMax: 68, introMax: 260, firstUsefulMustBeginBy: 520 },
    requirements: ['The route purpose is visible.', 'The first real utility result or navigation surface begins in the first viewport.'],
  },
};

export interface PageFamilyStandard {
  id: string;
  firstScreenFamily: FirstScreenFamily;
  container: ContainerRole;
  introContainer: ContainerRole;
  localWidthExceptions: readonly number[];
}

export const PAGE_FAMILY_STANDARDS: readonly PageFamilyStandard[] = [
  { id: 'homepage', firstScreenFamily: 'homepage', container: 'wide', introContainer: 'wide', localWidthExceptions: [] },
  { id: 'country-hub', firstScreenFamily: 'country', container: 'wide', introContainer: 'wide', localWidthExceptions: [] },
  { id: 'exchange-review', firstScreenFamily: 'exchange', container: 'prose', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'exchange-directory', firstScreenFamily: 'directory', container: 'wide', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'exchange-directory-detail', firstScreenFamily: 'exchange', container: 'prose', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'promo-directory', firstScreenFamily: 'directory', container: 'wide', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'guide-directory', firstScreenFamily: 'guide', container: 'wide', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'guide-detail', firstScreenFamily: 'guide', container: 'prose', introContainer: 'prose', localWidthExceptions: [] },
  { id: 'methodology-trust', firstScreenFamily: 'trust', container: 'standard', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'faq', firstScreenFamily: 'trust', container: 'prose', introContainer: 'standard', localWidthExceptions: [] },
  { id: 'legal-contact', firstScreenFamily: 'legal', container: 'prose', introContainer: 'prose', localWidthExceptions: [] },
  { id: 'country-foundation', firstScreenFamily: 'country', container: 'wide', introContainer: 'wide', localWidthExceptions: [] },
  { id: 'utility-directory', firstScreenFamily: 'utility', container: 'wide', introContainer: 'standard', localWidthExceptions: [] },
] as const;

export interface SiteStandardValidationIssue {
  code: string;
  message: string;
}

export function validateSiteStandardV1(): SiteStandardValidationIssue[] {
  const issues: SiteStandardValidationIssue[] = [];
  const canonicalWidths = Object.values(CONTAINER_WIDTHS);
  const allowedWidthSet = new Set(canonicalWidths);

  if (CONTAINER_WIDTHS.shell !== CONTAINER_WIDTHS.wide) {
    issues.push({ code: 'SHELL_WIDE_DRIFT', message: 'Shell and wide containers must share the same outer frame.' });
  }
  if (!(CONTAINER_WIDTHS.wide > CONTAINER_WIDTHS.standard && CONTAINER_WIDTHS.standard > CONTAINER_WIDTHS.prose && CONTAINER_WIDTHS.prose > CONTAINER_WIDTHS.narrow)) {
    issues.push({ code: 'WIDTH_ORDER_INVALID', message: 'Container widths must descend wide > standard > prose > narrow.' });
  }
  if (!(RESPONSIVE_GUTTERS.mobile <= RESPONSIVE_GUTTERS.tablet && RESPONSIVE_GUTTERS.tablet <= RESPONSIVE_GUTTERS.desktop)) {
    issues.push({ code: 'GUTTER_ORDER_INVALID', message: 'Responsive gutters must not shrink as the viewport grows.' });
  }

  const familyIds = new Set<string>();
  for (const family of PAGE_FAMILY_STANDARDS) {
    if (familyIds.has(family.id)) {
      issues.push({ code: 'DUPLICATE_FAMILY', message: `Duplicate page-family standard: ${family.id}` });
    }
    familyIds.add(family.id);
    if (!(family.container in CONTAINER_WIDTHS) || !(family.introContainer in CONTAINER_WIDTHS)) {
      issues.push({ code: 'UNKNOWN_CONTAINER_ROLE', message: `Unknown container role in family ${family.id}` });
    }
    for (const width of family.localWidthExceptions) {
      if (!allowedWidthSet.has(width)) {
        issues.push({ code: 'UNREGISTERED_WIDTH_EXCEPTION', message: `Family ${family.id} declares non-canonical width ${width}px.` });
      }
    }
  }

  const homepage = FIRST_SCREEN_CONTRACTS.homepage;
  if (homepage.desktop.firstUsefulMustBeginBy >= 900 || homepage.mobile.firstUsefulMustBeginBy >= 844) {
    issues.push({ code: 'HOMEPAGE_FIRST_SCREEN_BUDGET_INVALID', message: 'Homepage first-useful budget must remain inside the target viewport.' });
  }
  if (!homepage.requirements.some(item => item.includes('three complete ranking rows'))) {
    issues.push({ code: 'HOMEPAGE_RANKING_REQUIREMENT_MISSING', message: 'Homepage contract must require at least three complete desktop ranking rows.' });
  }

  return issues;
}

export const SITE_STANDARD_V1_ISSUES = validateSiteStandardV1();
export const SITE_STANDARD_V1_VALID = SITE_STANDARD_V1_ISSUES.length === 0;
