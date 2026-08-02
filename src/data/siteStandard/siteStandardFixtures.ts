import {
  CONTAINER_WIDTHS,
  FIRST_SCREEN_CONTRACTS,
  PAGE_FAMILY_STANDARDS,
  RESPONSIVE_GUTTERS,
  SITE_STANDARD_V1_ISSUES,
  SITE_STANDARD_V1_VALID,
  type ContainerRole,
  type FirstScreenContract,
  type PageFamilyStandard,
} from './siteStandardV1';

export interface SiteStandardFixtureResult {
  id: string;
  expected: 'PASS' | 'REJECT';
  accepted: boolean;
  passed: boolean;
  detail: string;
}

function isContainerRole(value: string): value is ContainerRole {
  return value in CONTAINER_WIDTHS;
}

function validateFamily(family: PageFamilyStandard): string[] {
  const issues: string[] = [];
  if (!family.id.trim()) issues.push('EMPTY_FAMILY_ID');
  if (!isContainerRole(family.container)) issues.push('UNKNOWN_CONTENT_CONTAINER');
  if (!isContainerRole(family.introContainer)) issues.push('UNKNOWN_INTRO_CONTAINER');
  if (!(family.firstScreenFamily in FIRST_SCREEN_CONTRACTS)) issues.push('UNKNOWN_FIRST_SCREEN_FAMILY');
  if (family.localWidthExceptions.some(width => !Object.values(CONTAINER_WIDTHS).includes(width))) {
    issues.push('UNREGISTERED_WIDTH_EXCEPTION');
  }
  return issues;
}

function validateFirstScreen(contract: FirstScreenContract): string[] {
  const issues: string[] = [];
  const targets = [
    ['desktop', 900, contract.desktop],
    ['tablet', 1024, contract.tablet],
    ['mobile', 844, contract.mobile],
  ] as const;

  for (const [name, viewportHeight, target] of targets) {
    if (target.headerMax <= 0 || target.headerMax >= viewportHeight) issues.push(`${name.toUpperCase()}_HEADER_BUDGET_INVALID`);
    if (target.introMax <= 0 || target.introMax >= viewportHeight) issues.push(`${name.toUpperCase()}_INTRO_BUDGET_INVALID`);
    if (target.firstUsefulMustBeginBy <= target.headerMax) issues.push(`${name.toUpperCase()}_USEFUL_BEFORE_HEADER`);
    if (target.firstUsefulMustBeginBy >= viewportHeight) issues.push(`${name.toUpperCase()}_USEFUL_OUTSIDE_VIEWPORT`);
  }
  if (!contract.requirements.length) issues.push('REQUIREMENTS_EMPTY');
  return issues;
}

const canonicalFamily: PageFamilyStandard = {
  id: 'fixture-canonical-family',
  firstScreenFamily: 'directory',
  container: 'wide',
  introContainer: 'standard',
  localWidthExceptions: [],
};

const unknownContainerFamily = {
  ...canonicalFamily,
  id: 'fixture-unknown-container',
  container: 'random-823' as ContainerRole,
};

const arbitraryExceptionFamily: PageFamilyStandard = {
  ...canonicalFamily,
  id: 'fixture-arbitrary-exception',
  localWidthExceptions: [823],
};

const brokenHomepageContract: FirstScreenContract = {
  ...FIRST_SCREEN_CONTRACTS.homepage,
  desktop: {
    ...FIRST_SCREEN_CONTRACTS.homepage.desktop,
    firstUsefulMustBeginBy: 940,
  },
};

const missingRequirementsContract: FirstScreenContract = {
  ...FIRST_SCREEN_CONTRACTS.legal,
  requirements: [],
};

const familyFixtures = [
  { id: 'canonical-family', expected: 'PASS' as const, value: canonicalFamily },
  { id: 'unknown-container-role', expected: 'REJECT' as const, value: unknownContainerFamily },
  { id: 'arbitrary-width-exception', expected: 'REJECT' as const, value: arbitraryExceptionFamily },
];

const firstScreenFixtures = [
  { id: 'canonical-homepage-contract', expected: 'PASS' as const, value: FIRST_SCREEN_CONTRACTS.homepage },
  { id: 'first-useful-outside-viewport', expected: 'REJECT' as const, value: brokenHomepageContract },
  { id: 'empty-contract-requirements', expected: 'REJECT' as const, value: missingRequirementsContract },
];

export const SITE_STANDARD_FIXTURE_RESULTS: readonly SiteStandardFixtureResult[] = [
  {
    id: 'registry-validation',
    expected: 'PASS',
    accepted: SITE_STANDARD_V1_VALID,
    passed: SITE_STANDARD_V1_VALID,
    detail: SITE_STANDARD_V1_ISSUES.length ? SITE_STANDARD_V1_ISSUES.map(issue => issue.code).join(', ') : 'Registry accepted without issues',
  },
  {
    id: 'width-order',
    expected: 'PASS',
    accepted: CONTAINER_WIDTHS.wide > CONTAINER_WIDTHS.standard && CONTAINER_WIDTHS.standard > CONTAINER_WIDTHS.prose && CONTAINER_WIDTHS.prose > CONTAINER_WIDTHS.narrow,
    passed: CONTAINER_WIDTHS.wide > CONTAINER_WIDTHS.standard && CONTAINER_WIDTHS.standard > CONTAINER_WIDTHS.prose && CONTAINER_WIDTHS.prose > CONTAINER_WIDTHS.narrow,
    detail: `${CONTAINER_WIDTHS.wide} > ${CONTAINER_WIDTHS.standard} > ${CONTAINER_WIDTHS.prose} > ${CONTAINER_WIDTHS.narrow}`,
  },
  {
    id: 'gutter-order',
    expected: 'PASS',
    accepted: RESPONSIVE_GUTTERS.mobile <= RESPONSIVE_GUTTERS.tablet && RESPONSIVE_GUTTERS.tablet <= RESPONSIVE_GUTTERS.desktop,
    passed: RESPONSIVE_GUTTERS.mobile <= RESPONSIVE_GUTTERS.tablet && RESPONSIVE_GUTTERS.tablet <= RESPONSIVE_GUTTERS.desktop,
    detail: `${RESPONSIVE_GUTTERS.mobile} <= ${RESPONSIVE_GUTTERS.tablet} <= ${RESPONSIVE_GUTTERS.desktop}`,
  },
  ...familyFixtures.map(fixture => {
    const issues = validateFamily(fixture.value);
    const accepted = issues.length === 0;
    return {
      id: fixture.id,
      expected: fixture.expected,
      accepted,
      passed: fixture.expected === 'PASS' ? accepted : !accepted,
      detail: issues.length ? issues.join(', ') : 'Family accepted',
    };
  }),
  ...firstScreenFixtures.map(fixture => {
    const issues = validateFirstScreen(fixture.value);
    const accepted = issues.length === 0;
    return {
      id: fixture.id,
      expected: fixture.expected,
      accepted,
      passed: fixture.expected === 'PASS' ? accepted : !accepted,
      detail: issues.length ? issues.join(', ') : 'First-screen contract accepted',
    };
  }),
];

export const SITE_STANDARD_FIXTURES_PASS = SITE_STANDARD_FIXTURE_RESULTS.every(result => result.passed);

if (!SITE_STANDARD_FIXTURES_PASS) {
  const failures = SITE_STANDARD_FIXTURE_RESULTS.filter(result => !result.passed).map(result => result.id);
  throw new Error(`Site Standard fixtures failed: ${failures.join(', ')}`);
}

if (PAGE_FAMILY_STANDARDS.length < 10) {
  throw new Error('Site Standard page-family registry is incomplete.');
}
